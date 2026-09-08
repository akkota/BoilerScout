import * as dotenv from "dotenv";
dotenv.config();

import { getTypesenseAdminClient } from "@/lib/typesense/client";
import {
  ensureEventsCollection,
  EVENTS_COLLECTION_NAME,
  TypesenseEventDocument,
} from "@/lib/typesense/schema";
import {
  normalizePurdueEvent,
  RawPurdueEventWrapper,
} from "@/lib/data/normalizePurdueEvent";
import { deduplicateEvents } from "@/lib/data/cleanPurdueData";
import { fetchPurdueApi } from "@/lib/data/fetchPurdue";

const PURDUE_EVENTS_BASE_URL = "https://events.purdue.edu/api/2/events";
const PAGE_SIZE = 100;
const DAYS_AHEAD = 60;
const MAX_PAGES = 5; // Fetches up to 500 events
const BATCH_SIZE = 25; // Safe batch size to prevent cluster memory issues during vectorization
const BATCH_DELAY_MS = 250; // Delay between batches

interface PurdueApiResponse {
  events?: RawPurdueEventWrapper[];
  page?: {
    current: number;
    size: number;
    total: number;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPurdueEvents(): Promise<RawPurdueEventWrapper[]> {
  const allEvents: RawPurdueEventWrapper[] = [];
  const seenInstanceKeys = new Set<string>();

  let currentPage = 1;
  let totalPages = 1;

  console.log(`Starting Purdue Events fetch (days ahead: ${DAYS_AHEAD}, max pages: ${MAX_PAGES})...`);

  while (currentPage <= totalPages && currentPage <= MAX_PAGES) {
    const url = `${PURDUE_EVENTS_BASE_URL}?pp=${PAGE_SIZE}&page=${currentPage}&days=${DAYS_AHEAD}`;
    console.log(`Fetching page ${currentPage} from ${url}...`);

    const data = await fetchPurdueApi<PurdueApiResponse>(url);
    if (!data) {
      console.warn(`Failed to fetch page ${currentPage}.`);
      break;
    }

    const rawEvents = data.events || [];

    if (data.page?.total) {
      totalPages = data.page.total;
    }

    for (const raw of rawEvents) {
      const e = raw.event ? raw.event : raw;
      const id = e.id;
      const instanceId = e.event_instances?.[0]?.event_instance?.id || e.first_date || "";
      const dedupeKey = `${id}_${instanceId}`;

      if (id && !seenInstanceKeys.has(dedupeKey)) {
        seenInstanceKeys.add(dedupeKey);
        allEvents.push(raw);
      }
    }

    console.log(`  Fetched ${rawEvents.length} events from page ${currentPage}. (Total collected: ${allEvents.length})`);

    if (rawEvents.length < PAGE_SIZE) {
      break;
    }

    currentPage++;
  }

  return allEvents;
}

export async function ingestEvents(): Promise<void> {
  const startTime = Date.now();
  console.log("==================================================");
  console.log("Starting BoilerScout Purdue Event Ingestion");
  console.log("==================================================");

  // 1. Fetch raw events
  const rawEvents = await fetchPurdueEvents();
  const fetchedCount = rawEvents.length;

  // 2. Normalize and clean events
  const normalizedDocuments: TypesenseEventDocument[] = [];
  let skippedCount = 0;
  let geocodedCount = 0;

  for (const raw of rawEvents) {
    const doc = normalizePurdueEvent(raw);
    if (doc) {
      normalizedDocuments.push(doc);
      if (doc.location) geocodedCount++;
    } else {
      skippedCount++;
    }
  }

  // 3. Deduplicate across events (removes identical cross-listings, merges metadata)
  const { uniqueEvents, duplicateCount } = deduplicateEvents(normalizedDocuments);
  const normalizedCount = uniqueEvents.length;

  console.log(`\nData Normalization and Cleaning Complete:`);
  console.log(`- Fetched:            ${fetchedCount}`);
  console.log(`- Normalized:         ${normalizedDocuments.length}`);
  console.log(`- Duplicates removed: ${duplicateCount}`);
  console.log(`- Unique events:      ${normalizedCount}`);
  console.log(`- With coordinates:   ${geocodedCount} (${Math.round((geocodedCount / normalizedDocuments.length) * 100)}%)`);
  console.log(`- Skipped:            ${skippedCount}`);

  // 4. Ensure Typesense collection exists
  const adminClient = getTypesenseAdminClient();
  await ensureEventsCollection(adminClient);

  // 5. Bulk import into Typesense in safe batches
  let importedCount = 0;
  const failures: Array<{ id?: string; error: string }> = [];

  if (uniqueEvents.length > 0) {
    console.log(`\nImporting ${uniqueEvents.length} documents into collection '${EVENTS_COLLECTION_NAME}' (batch size: ${BATCH_SIZE})...`);

    const totalBatches = Math.ceil(uniqueEvents.length / BATCH_SIZE);

    for (let i = 0; i < uniqueEvents.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const chunk = uniqueEvents.slice(i, i + BATCH_SIZE);

      try {
        const results = await adminClient
          .collections(EVENTS_COLLECTION_NAME)
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
              error: result.error || "Unknown Typesense import error",
            });
          }
        }
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batchSuccesses}/${chunk.length} imported.`);
      } catch (batchError: unknown) {
        const err = batchError as { httpStatus?: number; message?: string };
        console.warn(`  Batch ${batchNum}/${totalBatches} error (${err.httpStatus || err.message}). Retrying items individually...`);
        await sleep(1500);

        // Fallback: import individually with delay
        for (const item of chunk) {
          try {
            await adminClient
              .collections(EVENTS_COLLECTION_NAME)
              .documents()
              .upsert(item);
            importedCount++;
          } catch (itemErr: unknown) {
            const e = itemErr as { message?: string };
            failures.push({ id: item.id, error: e.message || "Individual upsert failed" });
          }
          await sleep(100);
        }
      }

      if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < uniqueEvents.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // 6. Log final summary
  console.log("\n==================================================");
  console.log("Ingestion Summary");
  console.log("==================================================");
  console.log(`- Duration:           ${durationSec}s`);
  console.log(`- Fetched count:      ${fetchedCount}`);
  console.log(`- Duplicates removed: ${duplicateCount}`);
  console.log(`- Final unique count: ${normalizedCount}`);
  console.log(`- Imported count:     ${importedCount}`);
  console.log(`- Failure count:      ${failures.length}`);

  if (failures.length > 0) {
    console.warn("\nFailure details (first 5):");
    for (const failure of failures.slice(0, 5)) {
      console.warn(`  - Event ${failure.id}: ${failure.error}`);
    }
  }
  console.log("==================================================");
}

// Run if directly executed
if (require.main === module || process.argv[1]?.endsWith("ingest-events.ts")) {
  ingestEvents().catch((error) => {
    console.error("Fatal ingestion error:", error);
    process.exit(1);
  });
}
