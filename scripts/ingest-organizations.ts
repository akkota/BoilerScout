import * as dotenv from "dotenv";
dotenv.config();

import { getTypesenseAdminClient } from "@/lib/typesense/client";
import {
  ensureOrganizationsCollection,
  ORGANIZATIONS_COLLECTION_NAME,
  TypesenseOrganizationDocument,
} from "@/lib/typesense/schema";
import {
  deduplicateOrganizations,
  normalizeDepartment,
  normalizeEventUnit,
  normalizeGroup,
  RawPurdueDepartmentWrapper,
  RawPurdueGroupWrapper,
} from "@/lib/data/normalizeOrganization";
import { RawPurdueEventWrapper } from "@/lib/data/normalizePurdueEvent";
import { fetchPurdueApi } from "@/lib/data/fetchPurdue";

const PURDUE_DEPTS_URL = "https://events.purdue.edu/api/2/departments";
const PURDUE_GROUPS_URL = "https://events.purdue.edu/api/2/groups";
const PURDUE_EVENTS_URL = "https://events.purdue.edu/api/2/events";
const PAGE_SIZE = 100;
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDepartments(): Promise<RawPurdueDepartmentWrapper[]> {
  console.log("Fetching Purdue Departments from Localist API...");
  const data = await fetchPurdueApi<{ departments?: RawPurdueDepartmentWrapper[] }>(
    `${PURDUE_DEPTS_URL}?pp=${PAGE_SIZE}`
  );
  const depts = data?.departments || [];
  console.log(`  Fetched ${depts.length} departments.`);
  return depts;
}

async function fetchGroups(): Promise<RawPurdueGroupWrapper[]> {
  console.log("Fetching Purdue Groups from Localist API...");
  const data = await fetchPurdueApi<{ groups?: RawPurdueGroupWrapper[] }>(
    `${PURDUE_GROUPS_URL}?pp=${PAGE_SIZE}`
  );
  const groups = data?.groups || [];
  console.log(`  Fetched ${groups.length} groups.`);
  return groups;
}

async function fetchEventUnits(): Promise<string[]> {
  console.log("Extracting active campus organizations from Purdue Events...");
  const units = new Set<string>();

  const data = await fetchPurdueApi<{ events?: RawPurdueEventWrapper[] }>(
    `${PURDUE_EVENTS_URL}?pp=100&days=60`
  );
  if (data?.events) {
    for (const raw of data.events) {
      const item = raw.event ? raw.event : raw;
      if (item.custom_fields?.unit?.trim()) {
        units.add(item.custom_fields.unit.trim());
      }
      if (item.departments) {
        for (const d of item.departments) {
          if (d.name?.trim()) units.add(d.name.trim());
        }
      }
    }
  }

  console.log(`  Extracted ${units.size} unique event organizational units.`);
  return Array.from(units);
}

export async function ingestOrganizations(): Promise<void> {
  const startTime = Date.now();
  console.log("==================================================");
  console.log("Starting BoilerScout Organizations Ingestion");
  console.log("==================================================");

  // 1. Fetch departments, groups, and event units
  const [rawDepts, rawGroups, eventUnits] = await Promise.all([
    fetchDepartments(),
    fetchGroups(),
    fetchEventUnits(),
  ]);

  // 2. Normalize records
  const allOrgs: TypesenseOrganizationDocument[] = [];

  for (const d of rawDepts) {
    const doc = normalizeDepartment(d);
    if (doc) allOrgs.push(doc);
  }

  for (const g of rawGroups) {
    const doc = normalizeGroup(g);
    if (doc) allOrgs.push(doc);
  }

  for (const u of eventUnits) {
    const doc = normalizeEventUnit(u);
    if (doc) allOrgs.push(doc);
  }

  console.log(`\nCollected ${allOrgs.length} raw organization records before deduplication.`);

  // 3. Deduplicate and merge aliases
  const dedupedDocs = deduplicateOrganizations(allOrgs);
  console.log(`Deduplication complete: ${dedupedDocs.length} unique canonical organizations.`);

  // 4. Ensure Typesense collection exists
  const adminClient = getTypesenseAdminClient();
  await ensureOrganizationsCollection(adminClient);

  // 5. Bulk import into Typesense
  let importedCount = 0;
  const failures: Array<{ id?: string; error: string }> = [];

  if (dedupedDocs.length > 0) {
    console.log(
      `\nImporting ${dedupedDocs.length} organizations into collection '${ORGANIZATIONS_COLLECTION_NAME}' (batch size: ${BATCH_SIZE})...`
    );

    const totalBatches = Math.ceil(dedupedDocs.length / BATCH_SIZE);

    for (let i = 0; i < dedupedDocs.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const chunk = dedupedDocs.slice(i, i + BATCH_SIZE);

      try {
        const results = await adminClient
          .collections(ORGANIZATIONS_COLLECTION_NAME)
          .documents()
          .import(chunk, { action: "upsert" });

        let batchSuccesses = 0;
        for (let j = 0; j < results.length; j++) {
          const result = results[j] as { success: boolean; error?: string };
          if (result.success) {
            batchSuccesses++;
            importedCount++;
          } else {
            failures.push({
              id: chunk[j]?.id,
              error: result.error || "Unknown import error",
            });
          }
        }
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batchSuccesses}/${chunk.length} imported.`);
      } catch (batchError: unknown) {
        const err = batchError as { httpStatus?: number; message?: string };
        console.warn(`  Batch ${batchNum}/${totalBatches} error (${err.httpStatus || err.message}). Retrying items individually...`);
        await sleep(1500);

        for (const item of chunk) {
          try {
            await adminClient.collections(ORGANIZATIONS_COLLECTION_NAME).documents().upsert(item);
            importedCount++;
          } catch (itemErr: unknown) {
            const e = itemErr as { message?: string };
            failures.push({ id: item.id, error: e.message || "Individual upsert failed" });
          }
          await sleep(50);
        }
      }

      if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < dedupedDocs.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n==================================================");
  console.log("Organizations Ingestion Complete");
  console.log("==================================================");
  console.log(`- Duration:       ${durationSec}s`);
  console.log(`- Total Orgs:     ${dedupedDocs.length}`);
  console.log(`- Imported Count: ${importedCount}`);
  console.log(`- Failure Count:  ${failures.length}`);
  if (failures.length > 0) {
    console.warn("\nFailure details (first 5):");
    for (const f of failures.slice(0, 5)) {
      console.warn(`  - Organization ${f.id}: ${f.error}`);
    }
  }
  console.log("==================================================");
}

if (require.main === module || process.argv[1]?.endsWith("ingest-organizations.ts")) {
  ingestOrganizations().catch((error) => {
    console.error("Fatal organizations ingestion error:", error);
    process.exit(1);
  });
}
