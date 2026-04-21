# #play14 API

Strapi 5 headless CMS API for the #play14 global community platform.

> This package is part of the [play14 monorepo](../../README.md).

## Tech Stack

- **Framework**: Strapi 5.33.0
- **Runtime**: Node.js 24, Bun
- **Database**: PostgreSQL 17.6
- **APIs**: GraphQL + REST
- **Hosting**: Clever Cloud (Node.js app + PostgreSQL + Redis add-ons)
- **Storage**: Clever Cloud Cellar (S3-compatible), fronted by Cloudflare at `cdn.play14.org`

## Getting Started

### From Monorepo Root

```bash
# Install all dependencies
bun install

# Start database
bun run db

# Start API in development mode
bun run api
```

### From This Directory

```bash
# Development mode with auto-reload
bun run develop

# Production mode (no auto-reload)
bun run start

# Build admin panel
bun run build
```

## Container Development

### Using Podman Compose (Recommended)

From the monorepo root:

```bash
# Start API and database
podman-compose up play14-api play14-db

# Start all services
podman-compose up
```

### Manual Container Build

```bash
podman build --build-arg STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=<token> -t play14-api .
```

### Run Container

```bash
podman run -p 1337:1337 -it --env-file=./.env --name play14-api play14-api
```

Uses the `.env` file for environment variables (database configuration, etc.).

## Configuration

### Upload Provider

Uses [`@strapi/provider-upload-aws-s3`](https://www.npmjs.com/package/@strapi/provider-upload-aws-s3) to talk to Clever Cloud Cellar (S3-compatible). Credentials and endpoint come from the Cellar add-on (`CELLAR_ADDON_*` env vars); public URLs are served via `STORAGE_CDN_URL`.

### Plugins

- **CKEditor 5**: Rich text editing
- **GraphQL**: GraphQL API endpoint
- **Fuzzy Search**: Search across events, players, games, articles
- **Map Field**: Location selection with Mapbox
- **WebP Converter**: Automatic image optimization
- **Strapi Cache**: API response caching

## Dependency Notes

Do not update these dependencies without testing:

- react-router-dom
- strapi-blurhash
- styled-components

## Learn More

- [Strapi Documentation](https://docs.strapi.io)
- [Strapi CLI Reference](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html)
