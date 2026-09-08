import type { Client } from "typesense";
import type { SynonymItemSchema } from "typesense/lib/Typesense/SynonymSets";
import { EVENTS_COLLECTION_NAME } from "@/lib/typesense/schema";

/**
 * Shared synonym set linked to the events collection.
 * Typesense Cloud v30+ uses synonym_sets (collection /synonyms is deprecated).
 */
export const EVENTS_SYNONYM_SET_NAME = "events-synonyms";

/**
 * Curated multi-way synonyms chosen from live Purdue event wording.
 * Keep this list small — each pair must clearly improve campus search.
 */
export const EVENT_SYNONYM_ITEMS: SynonymItemSchema[] = [
  {
    id: "startup-entrepreneurship",
    synonyms: ["startup", "entrepreneurship", "entrepreneur"],
  },
  {
    id: "ai-artificial-intelligence",
    synonyms: ["ai", "artificial intelligence"],
  },
  {
    id: "career-recruiting",
    synonyms: ["career", "recruiting", "recruit"],
  },
  {
    id: "hackathon-hacking",
    synonyms: ["hackathon", "hacking"],
  },
  {
    id: "cs-computer-science",
    synonyms: ["cs", "computer science"],
  },
];

/**
 * Upsert the events synonym set and link it to the events collection.
 * Safe to re-run; preserves any other synonym sets already on the collection.
 */
export async function ensureEventSynonyms(client: Client): Promise<void> {
  console.log(`Upserting synonym set '${EVENTS_SYNONYM_SET_NAME}'...`);

  await client.synonymSets(EVENTS_SYNONYM_SET_NAME).upsert({
    items: EVENT_SYNONYM_ITEMS,
  });

  const collection = await client.collections(EVENTS_COLLECTION_NAME).retrieve();
  const existingSets = Array.isArray(collection.synonym_sets)
    ? collection.synonym_sets
    : [];

  if (!existingSets.includes(EVENTS_SYNONYM_SET_NAME)) {
    const nextSets = [...existingSets, EVENTS_SYNONYM_SET_NAME];
    console.log(
      `Linking synonym set '${EVENTS_SYNONYM_SET_NAME}' to collection '${EVENTS_COLLECTION_NAME}'...`
    );
    await client.collections(EVENTS_COLLECTION_NAME).update({
      synonym_sets: nextSets,
    });
  } else {
    console.log(
      `Synonym set '${EVENTS_SYNONYM_SET_NAME}' already linked to '${EVENTS_COLLECTION_NAME}'.`
    );
  }

  console.log(
    `Event synonyms ready (${EVENT_SYNONYM_ITEMS.length} multi-way items).`
  );
}
