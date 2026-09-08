# BoilerScout Ingestion & Data Pipeline Scripts

This directory is owned by the **Backend / Typesense developer**.

## Ingestion Pipelines

- **`ingest-venues.ts` (`npm run ingest:venues`)**:
  - Fetches all campus venues and places from the Purdue Localist API (`https://events.purdue.edu/api/2/places`).
  - Cleans location titles, addresses, and corrects naming typos.
  - Enriches venues with official campus building codes (e.g., `WALC`, `PMU`, `LWSN`, `ARMS`, `RAWL`, `STEW`) and search aliases.
  - Supplements with canonical campus landmarks.
  - Ensures the `venues` collection schema with vector embeddings and upserts documents into Typesense.

- **`ingest-organizations.ts` (`npm run ingest:orgs`)**:
  - Ingests academic departments (`/api/2/departments`), student life / alumni groups (`/api/2/groups`), and active event organizer units.
  - Normalizes organization names, strips HTML, resolves short names / aliases (e.g. `CCO`, `AAARCC`, `BCC`, `PSUB`, `DSOB`), and assigns clean categories.
  - Deduplicates across departments and event units.
  - Ensures the `organizations` collection schema with vector embeddings and upserts documents into Typesense.

- **`ingest-events.ts` (`npm run ingest:events` or `npm run ingest`)**:
  - Ingests Purdue campus events (`/api/2/events`).
  - Cleans HTML entities, tags, and formatting artifacts.
  - Deduplicates recurring and cross-posted identical events, merging rich metadata and categories.
  - Resolves missing geopoints using the authoritative campus venue directory.
  - Ensures the `events` collection schema with vector embeddings and upserts documents into Typesense.

- **`ingest-all.ts` (`npm run ingest:all`)**:
  - Runs venues, organizations, and events ingestion sequentially.

## Running Ingestion

```bash
# Run all ingestion pipelines in sequence
npm run ingest:all

# Or run individually
npm run ingest:venues
npm run ingest:orgs
npm run ingest:events
```
