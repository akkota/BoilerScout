import * as dotenv from "dotenv";
dotenv.config();

import { getTypesenseAdminClient } from "@/lib/typesense/client";
import { ensureEventsCollection } from "@/lib/typesense/schema";
import { ensureEventSynonyms } from "@/lib/typesense/synonyms";

/**
 * Idempotent synonym setup for the events collection.
 * Usage: npm run synonyms
 */
async function main() {
  const adminClient = getTypesenseAdminClient();
  await ensureEventsCollection(adminClient);
  await ensureEventSynonyms(adminClient);
}

main().catch((error) => {
  console.error("Failed to set up event synonyms:", error);
  process.exit(1);
});
