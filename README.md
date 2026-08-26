# play14

A global community platform for agile game players and facilitators.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) workspace monorepo
- **API**: [Strapi 5](https://strapi.io/) headless CMS with GraphQL + REST
- **Frontend**: [Next.js 16](https://nextjs.org/) with React 19, TypeScript, SCSS
- **Database**: PostgreSQL 17.6
- **Hosting**: Clever Cloud (Node.js apps + PostgreSQL + Cellar + Redis add-ons)

## Project Structure

```
play14/
├── packages/
│   ├── api/          # Strapi 5 headless CMS API
│   ├── web/          # Next.js 16 frontend application
│   └── design/       # Design assets and Storybook
└── package.json      # Workspace configuration
```

## Prerequisites

- [Bun](https://bun.sh/) (latest)
- [Podman](https://podman.io/) or Docker (for containerized development)
- Node.js 24+

## Getting Started

### Install Dependencies

```bash
bun install
```

### Development

Start the database:

```bash
bun run db
```

Start the API (in a separate terminal):

```bash
bun run api
```

Start the web frontend (in a separate terminal):

```bash
bun run web
```

### Knowledge graph (optional, for AI coding assistants)

[graphify](https://github.com/Graphify-Labs/graphify) turns the repo into a queryable knowledge graph so Claude Code (and other assistants) answer architecture questions from real call/import edges instead of grep guesses. The skill and config are committed; the graph itself is built locally:

```bash
bun run graphify:setup            # uv tool install + first build (no API key needed)
graphify query "how does a ticket order reach Stripe?"
```

Needs [uv](https://docs.astral.sh/uv/). See the "Knowledge graph (graphify)" section in [CLAUDE.md](CLAUDE.md) for the full setup, flags, and what is committed vs local.

### Container Development

Start all services with Podman:

```bash
podman-compose up
```

Available services:

| Service          | Default port | Override             | Description                     |
| ---------------- | ------------ | -------------------- | ------------------------------- |
| `play14-api`     | 1337         | `PLAY14_API_PORT`    | Strapi API                      |
| `play14-api`     | 9000         | `PLAY14_API_METRICS_PORT` | Prometheus metrics         |
| `play14-db`      | 5432         | `PLAY14_DB_PORT`     | PostgreSQL database             |
| `play14-db-test` | 5433         | `PLAY14_DB_TEST_PORT` | Ephemeral integration test DB  |
| `play14-redis`   | 6379         | `PLAY14_REDIS_PORT`  | Cache + distributed cron locks  |
| `play14-minio`   | 9100 / 9101  | `PLAY14_MINIO_PORT`, `PLAY14_MINIO_CONSOLE_PORT` | S3-compatible storage |
| `pgadmin`        | 5050         | `PLAY14_PGADMIN_PORT` | Database admin UI              |
| `play14-web`     | 3000         | `PLAY14_WEB_PORT`    | Next.js frontend                |
| `design`         | 8080         | `PLAY14_DESIGN_PORT` | Storybook                       |
| `stripe-webhook` | -            | -                    | Stripe CLI webhook forwarder    |

#### Running alongside other projects

Every host port is a `${VAR:-default}` in `compose.yaml`, so the defaults above
hold with no configuration. When another project already holds 5432 or 6379,
put the overrides in a root `.env` (gitignored, read by podman-compose):

```bash
cat > .env <<'EOF'
PLAY14_DB_PORT=15432
PLAY14_REDIS_PORT=16379
PLAY14_DB_TEST_PORT=15433
EOF
```

Only the host side moves — container-internal ports are fixed, so nothing
inside the compose network is affected.

Two files are read on the **host** rather than in a container and must mirror
any change by hand:

- `packages/api/.env` — `DATABASE_PORT`, `REDIS_URL`, `TEST_DATABASE_PORT`
  (used by `bun run api` and `bun run test:int`)
- `packages/web/.env.local` — `STRAPI_API_URL`, `NEXT_PUBLIC_STRAPI_URL`
  (used by `bun run web`, only if you moved `PLAY14_API_PORT`)

`bun run deps` prints the host port of each service it starts and warns when
`packages/api/.env` has drifted out of sync.

## Package Commands

### API (packages/api)

```bash
bun --filter api dev          # Start API with database
bun --filter api build        # Build Strapi admin panel
bun --filter api start        # Production mode
```

### Web (packages/web)

```bash
bun --filter web dev          # Start Next.js with Turbopack
bun --filter web build        # Production build
bun --filter web start        # Run production server
bun --filter web lint         # ESLint check
bun --filter web format       # Prettier format
```

### Design (packages/design)

```bash
bun --filter design storybook         # Start Storybook dev server
bun --filter design build-storybook   # Build Storybook
```

## API Environment Variables

- `PUBLIC_URL` – base public URL for assets/OAuth callbacks (e.g., `https://api.play14.org`). Used to build the default email logo path (`/images/play14_600x200_transparent-light.png`).
- `LOGO_URL` – optional override for the logo used in HTML emails; if unset, we fall back to `PUBLIC_URL/images/...` so you can keep pointing to `http://localhost:1337` in development.

## License

MIT License - see [LICENSE](LICENSE) for details.
