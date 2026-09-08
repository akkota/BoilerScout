import * as dotenv from "dotenv";
dotenv.config();

import { getTypesenseAdminClient } from "@/lib/typesense/client";
import {
  ensureVenuesCollection,
  TypesenseVenueDocument,
  VENUES_COLLECTION_NAME,
} from "@/lib/typesense/schema";
import { normalizeVenue, RawPurduePlaceWrapper } from "@/lib/data/normalizeVenue";
import { CANONICAL_CAMPUS_BUILDINGS } from "@/lib/data/campusVenues";
import { fetchPurdueApi } from "@/lib/data/fetchPurdue";

const PURDUE_PLACES_BASE_URL = "https://events.purdue.edu/api/2/places";
const PAGE_SIZE = 100;
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;

interface PurduePlacesApiResponse {
  places?: RawPurduePlaceWrapper[];
  page?: {
    current: number;
    size: number;
    total: number;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPurduePlaces(): Promise<RawPurduePlaceWrapper[]> {
  const allPlaces: RawPurduePlaceWrapper[] = [];
  const seenIds = new Set<string | number>();

  let currentPage = 1;
  let totalPages = 1;

  console.log("Fetching Purdue Places from Localist API...");

  while (currentPage <= totalPages) {
    const url = `${PURDUE_PLACES_BASE_URL}?pp=${PAGE_SIZE}&page=${currentPage}`;
    console.log(`  Fetching page ${currentPage} of ${totalPages}...`);

    const data = await fetchPurdueApi<PurduePlacesApiResponse>(url);
    if (!data) {
      console.warn(`  Failed to fetch places page ${currentPage}.`);
      break;
    }

    const rawPlaces = data.places || [];
    if (data.page?.total) {
      totalPages = data.page.total;
    }

    for (const raw of rawPlaces) {
      const id = raw.place?.id || raw.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        allPlaces.push(raw);
      }
    }

    console.log(`  Received ${rawPlaces.length} places on page ${currentPage} (total: ${allPlaces.length}).`);

    if (rawPlaces.length < PAGE_SIZE) {
      break;
    }

    currentPage++;
  }

  return allPlaces;
}

export async function ingestVenues(): Promise<void> {
  const startTime = Date.now();
  console.log("==================================================");
  console.log("Starting BoilerScout Venues Ingestion");
  console.log("==================================================");

  // 1. Fetch raw places from Purdue API
  const rawPlaces = await fetchPurduePlaces();
  const fetchedCount = rawPlaces.length;

  // 2. Normalize and enrich places
  const venueMap = new Map<string, TypesenseVenueDocument>();
  let skippedCount = 0;

  for (const raw of rawPlaces) {
    const doc = normalizeVenue(raw);
    if (doc) {
      // Deduplicate by lowercase name
      const key = doc.name.toLowerCase();
      if (!venueMap.has(key)) {
        venueMap.set(key, doc);
      } else {
        // Merge aliases if duplicate place found
        const existing = venueMap.get(key)!;
        const mergedAliases = Array.from(new Set([...existing.aliases, ...doc.aliases]));
        existing.aliases = mergedAliases;
      }
    } else {
      skippedCount++;
    }
  }

  // 3. Supplement with canonical campus landmarks if missing from Places API
  let canonicalAddedCount = 0;
  for (const bldg of CANONICAL_CAMPUS_BUILDINGS) {
    const key = bldg.name.toLowerCase();
    if (!venueMap.has(key)) {
      const doc: TypesenseVenueDocument = {
        id: `bldg-${bldg.shortName.toLowerCase()}`,
        name: bldg.name,
        short_name: bldg.shortName,
        aliases: bldg.aliases,
        address: bldg.address,
        city: "West Lafayette",
        state: "IN",
        location: bldg.location,
        type: bldg.type,
        source: "campus-directory",
      };
      venueMap.set(key, doc);
      canonicalAddedCount++;
    }
  }

  const normalizedDocuments = Array.from(venueMap.values());
  const normalizedCount = normalizedDocuments.length;

  console.log(`\nVenue Processing Summary:`);
  console.log(`- Fetched from API:      ${fetchedCount}`);
  console.log(`- Canonical added:       ${canonicalAddedCount}`);
  console.log(`- Normalized & Deduped:  ${normalizedCount}`);
  console.log(`- Skipped (invalid geo): ${skippedCount}`);

  // 4. Ensure collection in Typesense
  const adminClient = getTypesenseAdminClient();
  await ensureVenuesCollection(adminClient);

  // 5. Bulk import into Typesense
  let importedCount = 0;
  const failures: Array<{ id?: string; error: string }> = [];

  if (normalizedDocuments.length > 0) {
    console.log(
      `\nImporting ${normalizedDocuments.length} venues into collection '${VENUES_COLLECTION_NAME}' (batch size: ${BATCH_SIZE})...`
    );

    const totalBatches = Math.ceil(normalizedDocuments.length / BATCH_SIZE);

    for (let i = 0; i < normalizedDocuments.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const chunk = normalizedDocuments.slice(i, i + BATCH_SIZE);

      try {
        const results = await adminClient
          .collections(VENUES_COLLECTION_NAME)
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
            await adminClient.collections(VENUES_COLLECTION_NAME).documents().upsert(item);
            importedCount++;
          } catch (itemErr: unknown) {
            const e = itemErr as { message?: string };
            failures.push({ id: item.id, error: e.message || "Individual upsert failed" });
          }
          await sleep(50);
        }
      }

      if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < normalizedDocuments.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n==================================================");
  console.log("Venues Ingestion Complete");
  console.log("==================================================");
  console.log(`- Duration:       ${durationSec}s`);
  console.log(`- Total Venues:   ${normalizedCount}`);
  console.log(`- Imported Count: ${importedCount}`);
  console.log(`- Failure Count:  ${failures.length}`);
  if (failures.length > 0) {
    console.warn("\nFailure details (first 5):");
    for (const f of failures.slice(0, 5)) {
      console.warn(`  - Venue ${f.id}: ${f.error}`);
    }
  }
  console.log("==================================================");
}

if (require.main === module || process.argv[1]?.endsWith("ingest-venues.ts")) {
  ingestVenues().catch((error) => {
    console.error("Fatal venues ingestion error:", error);
    process.exit(1);
  });
}
