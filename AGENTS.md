# BoilerScout — contributor / agent notes

Guidance for humans and coding agents working in this repo. For setup and product overview, see [README.md](./README.md).

## Goal

BoilerScout is a Purdue event discovery engine. Typesense powers core search — do not replace it with a generic chatbot, RAG app, or LLM wrapper.

## Stack

Next.js · React · TypeScript · Tailwind · Typesense Cloud · Leaflet / Mapbox · Purdue Events (Localist)

Primary events endpoint: `https://events.purdue.edu/api/2/events`

## Architecture

```
Purdue Events → ingestion / normalization → Typesense → Next.js API → Frontend
```

Keep Typesense logic server-side. The browser must only call `POST /api/search` and `POST /api/discover`.

## Code ownership (soft)

| Area | Paths |
| --- | --- |
| API / search / ingest | `app/api/`, `lib/typesense/`, `lib/search/`, `lib/data/`, `scripts/` |
| UI | `components/`, `app/page.tsx`, map styling |
| Shared contracts | `types/` — coordinate before breaking changes |

## Event contract

API responses use the shared `Event` shape in `types/event.ts` (camelCase). Typesense may use snake_case internally.

## Search API

Frontend → `POST /api/search` only. Never construct Typesense queries in React components.

## Security

- `TYPESENSE_ADMIN_KEY` is server-only
- Never commit `.env`
- Prefer a search-only Typesense key at runtime

## Coding rules

1. Smallest correct change; keep the app runnable
2. Do not add dependencies without need
3. Preserve Event and `/api/search` contracts (explain before breaking them)
4. Prefer simple hackathon-quality code over heavy abstraction
5. Do not replace Typesense with an LLM for core search
