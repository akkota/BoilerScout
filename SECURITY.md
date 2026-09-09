# Security

## Reporting a vulnerability

If you find a security issue (especially anything involving API keys, auth bypass, or data exposure), please **do not** open a public GitHub issue.

Email the maintainers privately, or open a private security advisory on the GitHub repo if that feature is enabled.

## Secrets

This project expects secrets only in a local `.env` file (see `.env.example`):

- `TYPESENSE_ADMIN_KEY` — server / ingestion only
- `TYPESENSE_SEARCH_KEY` — server search client
- `MAPBOX_ACCESS_TOKEN` — server RouteScout directions
- `NEXT_PUBLIC_MAPBOX_TOKEN` — public Mapbox token (restrict by URL in Mapbox)

Never commit real keys. Rotate any key that may have been shared in chat, screenshots, or CI logs.
