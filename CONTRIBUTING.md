# Contributing

Thanks for interest in BoilerScout.

## Setup

Follow the [README](./README.md) quick start. Use a Typesense Cloud cluster (or compatible self-hosted Typesense) and optional Mapbox tokens for RouteScout.

## Guidelines

- Prefer small, focused pull requests
- Keep Typesense logic in server code (`app/api/`, `lib/typesense/`, `lib/search/`)
- Do not commit `.env` or real API keys
- Preserve the shared contracts in `types/` unless the change is intentional and documented
- Run `npm run lint` before opening a PR; run `npm run test:pipeline` if you touch search/ingest

Agent-oriented architecture notes: [AGENTS.md](./AGENTS.md).
