# BoilerScout — Claude Operational Guide

## Current Backend State
- **Purdue Ingestion**: Live ingest from Purdue Events API into Typesense (`scripts/ingest-events.ts`, `lib/data/normalizePurdueEvent.ts`).
- **Typesense Cloud**: Configured via `lib/typesense/client.ts`; `events` collection created & populated (`lib/typesense/schema.ts`).
- **Hybrid Search**: Default search combines keyword + semantic vector search (`embedding` field) with typo tolerance (`lib/search/searchEvents.ts`).
- **Filters Working**: Time (`startAfter`, `startBefore`), geo-radius (`center` + `radiusMiles`), categories (`categories`), and `freeOnly`.
- **Enrichments Working**: `distanceMiles` calculation, factual `reasons[]` explanations (`lib/search/explainResult.ts`).
- **Resiliency**: Cached fallback events used when Typesense is unavailable (`lib/data/mockEvents.ts`).
- **Endpoints**: `POST /api/search` returns real Typesense results; `GET /api/health` reports status.
- **Audit Status**: 63/64 assertions passed; backend is ready for RouteScout.

## Known Limitations
- Only ~35% of Purdue Localist events have explicit lat/lng; events lacking coordinates are excluded from geo-radius search.
- Recommended next step: add a Purdue building-name → coordinates geocoding dictionary.
- A few duplicate Localist events may exist.
- Gibberish queries can still yield semantic fallback matches.
- `free: false` does not prove an event charges admission (some Localist records omit ticket metadata).

## Architecture & Ownership Split
- **Backend owns**: `app/api/`, `lib/typesense/`, `lib/search/`, `lib/data/`, `scripts/`
- **Frontend owns**: `components/`, UI pages (`app/page.tsx`), styling, map UI
- **Shared**: `types/`
- Frontend must only query the backend via `POST /api/search`.
- Keep Typesense logic server-side; do NOT import Typesense into React components.
- Do not change shared API contracts without prior explanation.

## Search API Contract
**Endpoint**: `POST /api/search`

**Request Body**:
```ts
{
  query?: string;
  filters?: {
    startAfter?: number;
    startBefore?: number;
    center?: { lat: number; lng: number };
    radiusMiles?: number;
    categories?: string[];
    freeOnly?: boolean;
  };
  route?: { points: { lat: number; lng: number }[]; bufferMeters?: number };
}
```

**Response Body**:
```ts
{
  events: Event[];
  found: number;
  tookMs: number;
}
```

**Key `Event` Fields**: `id`, `title`, `description`, `organization`, `categories`, `startsAt`, `endsAt`, `location` (`{ lat, lng }`), `imageUrl`, `url`, `source`, `distanceMiles`, `reasons`.

## Typesense Search Behavior
- Hybrid search is default (keyword matching + vector semantic search).
- `embedding` field powers semantic search (hosted embedding model).
- Typo tolerance is enabled.
- `drop_tokens_threshold: 0` is intentionally used to maintain semantic match quality.
- Filters are combined using Typesense `filter_by` syntax (`&&`).
- Geopoints format: `[lat, lng]`.
- Factual explanations in `reasons[]` are based on metadata, time proximity, and location. Never invent semantic percentages.

## Security Rules
- `TYPESENSE_ADMIN_KEY` is server-only (used for schema and ingestion).
- Never expose secret or admin keys to client-side code.
- `.env` must not be committed to Git; `.env.example` contains placeholders only.

## Next Backend Priorities
1. Add Purdue building geocoding dictionary
2. Implement RouteScout polygon/corridor geo search
3. Add route detour time calculation
4. Federated search across events/organizations/venues
5. JOINs
6. Synonyms and search polish
7. Voice Search / MMR / analytics (only if time permits)
*(Do NOT implement any of these until explicitly requested.)*

## Claude Coding Rules
- Read CLAUDE.md first before making changes.
- Make the smallest correct change.
- Do not rewrite unrelated files.
- Preserve backend/frontend ownership boundaries.
- Keep Typesense logic server-side.
- Preserve API contracts.
- Never expose secrets.
- Prefer simple hackathon-quality code over unnecessary abstraction.
- Keep the app runnable after each meaningful change.
- If a change affects frontend or shared contracts, explain before editing.
