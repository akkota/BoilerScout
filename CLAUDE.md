# BoilerScout — Claude / Cursor operational notes

Read [README.md](./README.md) and [AGENTS.md](./AGENTS.md) first. This file is a short agent checklist.

## Backend state

- Live ingest from Purdue Events into Typesense (`scripts/ingest-*.ts`, `lib/data/normalize*.ts`)
- Hybrid search default: keyword + vector (`lib/search/searchEvents.ts`)
- Filters: time, geo-radius, categories, `freeOnly`
- RouteScout + near-place NL parsing on `/api/search`
- Federated orgs/venues via `/api/discover`
- Cached fallback when Typesense is down (`lib/data/mockEvents.ts`)

## Ownership

- Backend: `app/api/`, `lib/typesense/`, `lib/search/`, `lib/data/`, `scripts/`
- Frontend: `components/`, UI pages, map
- Shared: `types/` — do not change API contracts without explaining first

## Rules

- Smallest correct change; no unrelated rewrites
- Keep Typesense logic server-side
- Never expose secrets or commit `.env`
- Prefer simple, runnable hackathon-quality code
- Do not implement large stretch features unless explicitly requested
