import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { Client } from "typesense";

export const EVENTS_COLLECTION_NAME = "events";

/**
 * Shape of the document stored inside Typesense.
 * Note: Typesense uses snake_case for field names.
 */
export interface TypesenseEventDocument {
  id: string;
  title: string;
  description: string;
  organization?: string;
  categories: string[];
  starts_at: number; // Unix timestamp in milliseconds
  ends_at?: number; // Unix timestamp in milliseconds
  location_name?: string;
  location?: [number, number]; // [latitude, longitude]
  image_url?: string;
  url?: string;
  source: string;
  free?: boolean;
  embedding?: number[];
}

/**
 * Typesense Schema for 'events' collection.
 * Utilizes Typesense built-in auto-embedding model 'ts/all-MiniLM-L12-v2' (384 dims)
 * to automatically generate semantic vector embeddings from text fields.
 */
export const eventsCollectionSchema: CollectionCreateSchema = {
  name: EVENTS_COLLECTION_NAME,
  fields: [
    { name: "id", type: "string" },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "organization", type: "string", optional: true },
    { name: "categories", type: "string[]" },
    { name: "starts_at", type: "int64" },
    { name: "ends_at", type: "int64", optional: true },
    { name: "location_name", type: "string", optional: true },
    { name: "location", type: "geopoint", optional: true },
    { name: "image_url", type: "string", optional: true },
    { name: "url", type: "string", optional: true },
    { name: "source", type: "string" },
    { name: "free", type: "bool", optional: true },
    {
      name: "embedding",
      type: "float[]",
      embed: {
        from: ["title", "description", "organization", "categories"],
        model_config: {
          model_name: "ts/paraphrase-MiniLM-L6-v2",
        },
      },
    },
  ],
};

/**
 * Ensures the 'events' collection exists in Typesense.
 * If it does not exist, creates it with auto-embedding configuration.
 */
export async function ensureEventsCollection(client: Client): Promise<void> {
  try {
    await client.collections(EVENTS_COLLECTION_NAME).retrieve();
  } catch (error: unknown) {
    const err = error as { httpStatus?: number };
    if (err.httpStatus === 404) {
      console.log(`Creating collection '${EVENTS_COLLECTION_NAME}'...`);
      await client.collections().create(eventsCollectionSchema);
      console.log(`Collection '${EVENTS_COLLECTION_NAME}' created successfully.`);
    } else {
      throw error;
    }
  }
}
