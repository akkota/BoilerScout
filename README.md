# BoilerScout

Natural-language event discovery for the Purdue University campus.

BoilerScout helps students find what's happening nearby — talks, free food, clubs, music, and more — using **Typesense hybrid search** (keyword + semantic), campus geo filters, and **RouteScout** walking-corridor discovery.

Built for the [Typesense](https://typesense.org/) hackathon.

## Features

- **Hybrid search** — typo-tolerant keyword matching plus vector/semantic understanding
- **Time-aware queries** — “tonight”, “this weekend”, and filter controls for start windows
- **Nearby / “near place”** — resolve campus buildings (WALC, Lawson, PMU, …) and search by radius
- **RouteScout** — find events along a walking route between two campus places
- **Federated discovery** — events, organizations, and venues in one search experience
- **Map view** — Leaflet map with event pins, near-radius circles, and route geometry
- **“Why this result?”** — factual match reasons (time proximity, distance, categories)
- **Resilient fallback** — cached/mock events when Typesense is unavailable locally

## Stack

| Layer | Tech |
| --- | --- |
| App | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Search | Typesense Cloud (hybrid keyword + embeddings) |
| Maps | Leaflet (+ Mapbox Directions for RouteScout) |
| Data | [Purdue Events / Localist API](https://events.purdue.edu/api/2/events) |

## Architecture

```
Purdue Events / Localist
        ↓
  Ingestion scripts (normalize + geocode)
        ↓
     Typesense Cloud
        ↓
  Next.js API routes  (/api/search, /api/discover, /api/health)
        ↓
     React UI + map
```

Typesense credentials and query construction stay **server-side**. The browser only calls the Next.js API.

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/akkota/typesense-hackathon.git
cd typesense-hackathon
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:

| Variable | Where used | Notes |
| --- | --- | --- |
| `TYPESENSE_HOST` | Server | Typesense Cloud host (no `https://` prefix needed) |
| `TYPESENSE_ADMIN_KEY` | Server / scripts | Admin key for schema + ingestion — **never** expose to the browser |
| `TYPESENSE_SEARCH_KEY` | Server | Prefer a search-only key for `/api/search` |
| `MAPBOX_ACCESS_TOKEN` | Server | Used for walking directions (RouteScout) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Browser (optional) | Public token if you use Mapbox tiles client-side; restrict by URL in the Mapbox dashboard |

Without Typesense credentials the app still runs using local mock/fallback data.

### 3. Ingest campus data (optional but recommended)

Requires valid Typesense admin credentials:

```bash
npm run ingest:all
# or individually:
npm run ingest:venues
npm run ingest:orgs
npm run ingest:events
npm run synonyms
```

See [`scripts/README.md`](./scripts/README.md) for pipeline details.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build && npm start   # production
npm run lint                 # lint
npm run test:pipeline        # smoke-test search pipeline (needs Typesense)
```

## Try these queries

- `something social about startups or AI near Lawson`
- `AI talk tonight`
- `free food today`
- `live music this weekend`
- `meet people building companies`
- `events on my walk from WALC to PMU`

## API

### `POST /api/search`

Primary event search (hybrid + filters + optional RouteScout / near-place NL parsing).

```json
{
  "query": "AI startup events tonight",
  "filters": {
    "startAfter": 1710000000,
    "startBefore": 1710086400,
    "center": { "lat": 40.427, "lng": -86.916 },
    "radiusMiles": 1,
    "categories": ["Career"],
    "freeOnly": true
  },
  "route": {
    "points": [{ "lat": 40.427, "lng": -86.917 }, { "lat": 40.425, "lng": -86.911 }],
    "corridorMeters": 120
  }
}
```

Response includes `events`, `found`, `tookMs`, and optionally `routeScout`, `nearPlace`, or resolution errors.

### `POST /api/discover`

Federated campus discovery for organizations and venues (and related groups).

### `GET /api/health`

Simple liveness check: `{ "status": "ok" }`.

Shared TypeScript contracts live under [`types/`](./types/).

## Project structure

```
app/                 Next.js App Router (UI + API routes)
components/          Search UI, event cards, map, discover groups
lib/
  api/               Browser clients for /api/*
  data/              Purdue fetch/normalize + campus building dictionary
  search/            Query prep, hybrid search, RouteScout, explanations
  typesense/         Server-only Typesense client + schema
  mapbox/            Walking route helper
scripts/             Ingestion and pipeline smoke tests
types/               Shared Event / Search / Discover contracts
```

## Security notes

- Never commit `.env` — it is gitignored; only `.env.example` is tracked.
- Keep `TYPESENSE_ADMIN_KEY` on the server and in CI secrets only.
- Prefer a scoped Typesense **search** key for runtime queries.
- Restrict Mapbox tokens by URL / scope in the Mapbox dashboard.

## Known limitations

- Not every Localist event has coordinates; geo/radius/route search only includes geocoded events (campus building dictionary improves coverage).
- `free: false` does not always mean paid — some Localist records omit ticket metadata.
- Very vague or gibberish queries may still return weak semantic matches.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

Built by Akhil Kota, Ashish Chenna, and Jeremy Lu for the Typesense hackathon, using Purdue Events / Localist data and Typesense Cloud.
