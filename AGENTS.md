# BoilerScout

## Goal

BoilerScout is a Purdue event discovery engine built for the Typesense hackathon.

Core experience:
- Search Purdue events using natural language
- Hybrid keyword + semantic search
- Time-aware results
- Nearby / geo search
- RouteScout: events along a walking route
- "Why this result?" explanations

Typesense must power the core search experience. Do not turn this into a generic chatbot, RAG app, or LLM wrapper.

## Stack

- Next.js
- React
- TypeScript
- Tailwind
- Typesense Cloud
- Google Maps or Mapbox
- Purdue Events / Localist API

Primary Purdue Events endpoint:

    https://events.purdue.edu/api/2/events

BoilerLink is optional. Never make the demo depend on it.

## Architecture

    Purdue Events
          ↓
    ingestion / normalization
          ↓
       Typesense
          ↓
    Next.js API routes
          ↓
       Frontend

Keep Typesense logic server-side.

## Team Ownership

### Backend / Typesense owner

Owns:

    app/api/
    lib/typesense/
    lib/search/
    scripts/

Responsible for:
- event ingestion
- normalization
- Typesense schema
- hybrid search
- time filtering
- geo filtering
- RouteScout search
- result explanations

### Frontend owner

Owns:

    components/
    app UI pages

Responsible for:
- search UI
- event cards
- filters
- map
- RouteScout UI
- "Why this result?"
- loading/error/empty states
- visual polish

Avoid editing files owned by the other developer unless necessary.

## Shared Files

Coordinate before modifying:

    package.json
    package-lock.json
    .env.example
    shared TypeScript types
    app/layout.tsx
    global CSS

Do not casually change shared API contracts or types.

## Event Contract

Use one shared event shape:

    interface Event {
      id: string;
      title: string;
      description: string;
      organization?: string;
      categories: string[];
      startsAt: number;
      endsAt?: number;
      locationName?: string;
      location?: { lat: number; lng: number };
      source: "purdue-events" | "boilerlink" | "seed";
      url?: string;
      free?: boolean;
    }

Backend may use snake_case internally for Typesense, but API responses should use this shape.

## Search API

Frontend should use:

    POST /api/search

Example request:

    {
      "query": "AI startup events tonight",
      "lat": 40.427,
      "lng": -86.916,
      "radiusMiles": 2
    }

Frontend should never construct Typesense queries directly.

## Typesense Usage

Default search should use hybrid search:

- keyword matching for exact terms
- vector/semantic search for meaning
- typo tolerance
- time filters
- geo filters

Example:

"meet people building companies"

may match:

"Entrepreneurship Networking Night"

RouteScout:
1. Maps API gets walking route
2. Build a thin polygon around route
3. Send polygon to backend
4. Typesense geo-polygon filtering returns events along route

"Why this result?" should use factual explanations such as:

- Strong semantic match
- Starts in 20 minutes
- 0.3 miles away
- Matches AI/startups

Do not invent semantic-match percentages.

## Stretch Features

Only attempt these after the core works:

- MMR / Explore mode
- Typesense Analytics / trending
- personalization
- BoilerLink integration
- Natural Language Search

Natural Language Search depends on an external LLM, so the demo must work without it.

## Typesense Security

Environment variables:

    TYPESENSE_HOST=
    TYPESENSE_ADMIN_KEY=
    TYPESENSE_SEARCH_KEY=

Never expose `TYPESENSE_ADMIN_KEY` to the browser.

Use the admin key only for server-side ingestion/schema operations.

## Build Priority

1. Purdue Events → Typesense ingestion
2. Working keyword + semantic hybrid search
3. Time filtering
4. Geo search
5. Polished event UI
6. RouteScout
7. "Why this result?"
8. Stretch features only if stable

## Demo Reliability

Always:
- keep cached/seeded fallback events
- pre-test demo queries
- cache building coordinates when possible
- keep core search independent of external LLMs
- keep `main` runnable

Do not add risky features shortly before judging.

## Git Rules

Branches:

    main
    backend-typesense
    frontend

Rules:
- Never develop directly on `main`
- Pull `main` before starting work
- Commit small changes frequently
- Merge small PRs throughout the hackathon
- Do not wait until the end to merge
- Resolve conflicts on feature branches first
- Avoid modifying the other developer's owned folders

## Claude Coding Rules

When editing this repository:

1. Read this file first.
2. Make the smallest change needed.
3. Do not rewrite unrelated files.
4. Do not add dependencies unnecessarily.
5. Preserve the Event and `/api/search` contracts.
6. Keep Typesense-specific logic out of React components.
7. Never expose secrets.
8. Prefer simple hackathon-quality code over over-engineering.
9. Ask before making architectural changes.
10. Do not replace Typesense functionality with an LLM.
11. Keep the app runnable after each meaningful change.
12. If a change touches both developers' areas, point that out before editing.

## Definition of Done

A user should be able to:

- search naturally for Purdue events
- get useful results when wording differs
- make typos
- filter by time
- find nearby events
- view results on a map
- understand why a result matched
- discover events along a route

A polished core beats many incomplete features.