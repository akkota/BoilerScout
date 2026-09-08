# BoilerScout

BoilerScout is a Purdue campus event discovery engine built for the Typesense hackathon. It enables students to discover events using natural language, hybrid keyword and semantic search, time awareness, geo-location, and RouteScout walking corridor discovery.

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Team Folder Ownership

To prevent merge conflicts, responsibilities are partitioned as follows:

- **Frontend Developer**:
  - `components/`
  - UI pages (`app/page.tsx`, etc.)
  - Visual styling & Tailwind UI
  - Mapbox integration (`components/EventMap.tsx`)

- **Backend / Typesense Developer**:
  - `app/api/` (API route endpoints)
  - `lib/search/` (Search execution & logic)
  - `lib/typesense/` (Typesense client & schema configuration)
  - `scripts/` (Ingestion, schema setup, indexing)

- **Shared Contracts**:
  - `types/` (`event.ts`, `search.ts`)
  - Coordinate before modifying shared types, `package.json`, or root layouts.

## Current Status

The project is currently in its initial scaffolding phase:
- The API endpoint (`POST /api/search`) returns realistic mock Purdue events from `lib/data/mockEvents.ts`.
- Typesense Cloud hybrid search, real-time Purdue Events ingestion, and Mapbox map rendering will be integrated in the next milestone.
