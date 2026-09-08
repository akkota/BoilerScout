# BoilerScout Scripts

This directory is owned by the **Backend / Typesense developer**.

## Purpose

Contains utility, ingestion, schema migration, and indexing scripts for BoilerScout:

- `ingest-purdue.ts`: Fetch live events from Purdue Events / Localist API (`https://events.purdue.edu/api/2/events`) and normalize them to the shared `Event` shape.
- `init-typesense.ts`: Create or update the Typesense collections schema (e.g., hybrid vector + keyword fields, location geo-point, timestamps).
- `seed-typesense.ts`: Index normalized Purdue events into Typesense Cloud.

## Running Scripts

Scripts can be executed via `tsx` or `ts-node`:

```bash
# Example:
npx tsx scripts/init-typesense.ts
```
