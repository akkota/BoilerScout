import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { Client } from "typesense";

export const EVENTS_COLLECTION_NAME = "events";
export const VENUES_COLLECTION_NAME = "venues";
export const ORGANIZATIONS_COLLECTION_NAME = "organizations";

/**
 * Shape of the event document stored inside Typesense.
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
 * Shape of the venue document stored inside Typesense.
 */
export interface TypesenseVenueDocument {
  id: string;
  name: string;
  short_name?: string;
  aliases: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  location: [number, number]; // [latitude, longitude]
  type?: string;
  photo_url?: string;
  url?: string;
  localist_url?: string;
  source: string;
  embedding?: number[];
}

/**
 * Shape of the organization document stored inside Typesense.
 */
export interface TypesenseOrganizationDocument {
  id: string;
  name: string;
  short_name?: string;
  aliases: string[];
  type: string;
  description: string;
  categories?: string[];
  photo_url?: string;
  url?: string;
  localist_url?: string;
  source: string;
  embedding?: number[];
}

/**
 * Typesense Schema for 'events' collection.
 * Utilizes Typesense built-in auto-embedding model 'ts/paraphrase-MiniLM-L6-v2' (384 dims)
 * to automatically generate semantic vector embeddings from text fields.
 */
export const eventsCollectionSchema: CollectionCreateSchema = {
  name: EVENTS_COLLECTION_NAME,
  synonym_sets: ["events-synonyms"],
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
 * Typesense Schema for 'venues' collection.
 */
export const venuesCollectionSchema: CollectionCreateSchema = {
  name: VENUES_COLLECTION_NAME,
  fields: [
    { name: "id", type: "string" },
    { name: "name", type: "string" },
    { name: "short_name", type: "string", optional: true },
    { name: "aliases", type: "string[]" },
    { name: "address", type: "string", optional: true },
    { name: "city", type: "string", optional: true },
    { name: "state", type: "string", optional: true },
    { name: "zip", type: "string", optional: true },
    { name: "location", type: "geopoint" },
    { name: "type", type: "string", optional: true },
    { name: "photo_url", type: "string", optional: true },
    { name: "url", type: "string", optional: true },
    { name: "localist_url", type: "string", optional: true },
    { name: "source", type: "string" },
    {
      name: "embedding",
      type: "float[]",
      embed: {
        from: ["name", "short_name", "aliases", "address", "type"],
        model_config: {
          model_name: "ts/paraphrase-MiniLM-L6-v2",
        },
      },
    },
  ],
};

/**
 * Typesense Schema for 'organizations' collection.
 */
export const organizationsCollectionSchema: CollectionCreateSchema = {
  name: ORGANIZATIONS_COLLECTION_NAME,
  fields: [
    { name: "id", type: "string" },
    { name: "name", type: "string" },
    { name: "short_name", type: "string", optional: true },
    { name: "aliases", type: "string[]" },
    { name: "type", type: "string" },
    { name: "description", type: "string" },
    { name: "categories", type: "string[]", optional: true },
    { name: "photo_url", type: "string", optional: true },
    { name: "url", type: "string", optional: true },
    { name: "localist_url", type: "string", optional: true },
    { name: "source", type: "string" },
    {
      name: "embedding",
      type: "float[]",
      embed: {
        from: ["name", "short_name", "aliases", "description"],
        model_config: {
          model_name: "ts/paraphrase-MiniLM-L6-v2",
        },
      },
    },
  ],
};

async function ensureCollectionWithSchema(
  client: Client,
  collectionName: string,
  schema: CollectionCreateSchema
): Promise<void> {
  try {
    await client.collections(collectionName).retrieve();
  } catch (error: unknown) {
    const err = error as { httpStatus?: number };
    if (err.httpStatus === 404) {
      console.log(`Creating collection '${collectionName}'...`);
      await client.collections().create(schema);
      console.log(`Collection '${collectionName}' created successfully.`);
    } else {
      throw error;
    }
  }
}

/**
 * Ensures the 'events' collection exists in Typesense.
 */
export async function ensureEventsCollection(client: Client): Promise<void> {
  return ensureCollectionWithSchema(client, EVENTS_COLLECTION_NAME, eventsCollectionSchema);
}

/**
 * Ensures the 'venues' collection exists in Typesense.
 */
export async function ensureVenuesCollection(client: Client): Promise<void> {
  return ensureCollectionWithSchema(client, VENUES_COLLECTION_NAME, venuesCollectionSchema);
}

/**
 * Ensures the 'organizations' collection exists in Typesense.
 */
export async function ensureOrganizationsCollection(client: Client): Promise<void> {
  return ensureCollectionWithSchema(
    client,
    ORGANIZATIONS_COLLECTION_NAME,
    organizationsCollectionSchema
  );
}
