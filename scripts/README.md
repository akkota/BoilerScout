# Ingestion & data pipeline

Scripts that pull Purdue Localist data, normalize it, and upsert into Typesense.

## Pipelines

| Script | npm command | Source |
| --- | --- | --- |
| `ingest-venues.ts` | `npm run ingest:venues` | `/api/2/places` + campus building dictionary |
| `ingest-organizations.ts` | `npm run ingest:orgs` | departments, groups, event organizers |
| `ingest-events.ts` | `npm run ingest:events` / `npm run ingest` | `/api/2/events` |
| `ingest-all.ts` | `npm run ingest:all` | runs venues → orgs → events |
| `setup-synonyms.ts` | `npm run synonyms` | Typesense synonym set |

## Smoke tests

```bash
npm run test:pipeline        # end-to-end search checks (needs Typesense)
npm run test:stabilization   # regression / stabilization suite
```

## Running ingestion

Requires `TYPESENSE_HOST` and `TYPESENSE_ADMIN_KEY` in `.env`.

```bash
npm run ingest:all

# or individually
npm run ingest:venues
npm run ingest:orgs
npm run ingest:events
npm run synonyms
```

## Notes

- Events without coordinates are enriched via the campus venue / building dictionary when possible.
- Duplicate Localist postings are merged where detectable.
- Do not check in one-off `_tmp_*` scratch scripts.
