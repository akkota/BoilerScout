/**
 * Server-side Typesense Client Configuration
 * Owned by: Backend / Typesense developer
 *
 * IMPORTANT SECURITY NOTE:
 * - This file must only be imported and run in server environments (API routes, server actions).
 * - TYPESENSE_ADMIN_KEY must NEVER be exposed to the browser or prefixed with NEXT_PUBLIC_.
 *
 * TODO (Next Step):
 * 1. Install `typesense` package (`npm install typesense`).
 * 2. Initialize the Typesense Client using environment variables:
 *    - TYPESENSE_HOST
 *    - TYPESENSE_ADMIN_KEY (for schema migration and ingestion)
 *    - TYPESENSE_SEARCH_KEY (for read-only search operations)
 * 3. Export helper functions for querying the `events` collection.
 */

export interface TypesenseServerConfig {
  host?: string;
  adminKey?: string;
  searchKey?: string;
}

export function getTypesenseConfig(): TypesenseServerConfig {
  return {
    host: process.env.TYPESENSE_HOST,
    adminKey: process.env.TYPESENSE_ADMIN_KEY,
    searchKey: process.env.TYPESENSE_SEARCH_KEY,
  };
}
