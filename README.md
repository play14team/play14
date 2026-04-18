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
- Node.js 22+

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

### Container Development

Start all services with Podman:

```bash
podman-compose up
```

Available services:

| Service          | Port | Description                  |
| ---------------- | ---- | ---------------------------- |
| `play14-api`     | 1337 | Strapi API                   |
| `play14-db`      | 5432 | PostgreSQL database          |
| `pgadmin`        | 5050 | Database admin UI            |
| `play14-web`     | 3000 | Next.js frontend             |
| `design`         | 8080 | Storybook                    |
| `stripe-webhook` | -    | Stripe CLI webhook forwarder |

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
