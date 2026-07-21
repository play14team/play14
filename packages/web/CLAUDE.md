# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**play14-web** is a Next.js 16 App Router application for the #play14 global community platform. It fetches content from a **Strapi 5 CMS REST API** and displays events, games, articles, and player profiles with server-side rendering and client-side interactivity.

**Tech Stack:** Next.js 16.2 (App Router) • React 19.2 • TypeScript 6.0 • Strapi 5 REST API • SCSS + Radix UI primitives • Mapbox GL • Clever Cloud

**Package Manager:** `bun` (version 1.3.5 — pinned in package.json)

**Runtime:** Node.js 24 (see `.nvmrc`)

## Essential Commands

```bash
# Development
bun run dev                 # Start local dev server with Turbopack at http://localhost:3000

# Container Development (Podman/Docker)
bun run up                  # Start containerized dev environment (detached + logs)
bun run down                # Stop and remove containers
podman compose up           # Start containerized dev environment (foreground)
podman compose up --build   # Rebuild and start containers
podman compose logs -f app  # Follow container logs

# Production
bun run build               # Production build (standalone output)
bun run start               # Run production server

# Code Quality
bun run lint                # Biome lint
bun run check               # Biome check (lint + format verification)
bun run format              # Biome format (write)
bun run typecheck           # tsc --noEmit

# Tests
bun run test                # Vitest unit tests
bun run test:e2e            # Playwright end-to-end tests
```

## Architecture: REST API → Server Actions → Components

### Data Flow Pattern

1. **Server Actions** → `*.action.ts` files with `"use server"` fetch data from Strapi 5 REST API
2. **Components** → Import and call server actions directly (React Server Component pattern)

**Example:**

```typescript
// 1. src/components/events/get.action.ts exports:
export async function getEvents(page: number, pageSize: number) {
  const response = await fetch(
    `${STRAPI_API_URL}/api/events?pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
  )
  return await response.json()
}
// 2. src/app/events/page.tsx calls getEvents() directly
```

### Server/Client Component Boundaries

- **Server Components (default):** Pages, layouts, data-fetching components
- **Client Components (`"use client"`):** Interactive UI like `load-more.tsx`, `navbar.tsx`, `map/index.tsx`
- **Server Actions (`"use server"`):** All `*.action.ts` files

### Directory Structure

```
src/
├── app/[locale]/              # Next.js routes (locale-prefixed via next-intl)
├── app/api/                   # Route handlers (health, metrics, webhooks)
├── components/                # Domain folders: about, admin, articles, auth, events,
│                              #   filters, games, home, layout, legal, map, newsletter,
│                              #   players, search, tickets, tools, ui, utils
│                              # Each domain co-locates *.tsx + get.action.ts
├── libs/                      # Utilities (strapi-client, dates, auth, safe-actions, metrics, …)
├── models/                    # TypeScript types (strapi.ts, debriefing-cube.ts)
├── hooks/                     # Custom React hooks (useIntersection, use-debounce, …)
├── messages/                  # next-intl locale JSON files: en, fr, de, es, it, pt
└── styles/                    # SCSS, CSS, fonts, images
```

## Critical Workflows

### Creating New Features

1. Create server action: `src/components/{domain}/get.action.ts`
   - Use `fetch` to call Strapi 5 REST API endpoints
   - Handle errors appropriately
   - Return typed data
2. Build component: `src/components/{domain}/feature-name.tsx`
3. Use in route: `src/app/{domain}/page.tsx`

### Working with Strapi 5 REST API

- **Base URL:** `STRAPI_API_URL` environment variable
- **Authentication:** Use `STRAPI_API_SECRET` for server-side requests
- **Endpoints:** Follow Strapi 5 REST API conventions
  - Collections: `/api/{collection-name}`
  - Single entries: `/api/{collection-name}/{id}`
  - Query parameters: `?populate=*&filters[field][$eq]=value`
- **Response format:** Strapi 5 JSON API format with `data`, `meta`, and `attributes`

### Styling Approach

- **NO Tailwind or CSS Modules** - uses traditional SCSS + Bootstrap-like utilities
- Global styles: `src/styles/main.scss`
- Component styles: Reuse classes from `src/styles/scss/`
- Responsive: Use existing breakpoints in `responsive.scss`
- **SCSS Module System:** Uses modern `@use` for SCSS files, `@import` for plain CSS files
  - SCSS modules (\*.scss): Use `@use "path/to/file.scss"`
  - CSS files (\*.css): Use `@import "path/to/file.css"`

## Environment Variables

### Required Variables

```bash
# Backend API
STRAPI_API_URL=https://api.play14.org          # Production CMS endpoint
STRAPI_API_SECRET=<token>                      # Server-side auth token

# Map Integration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<token>        # Client-side Mapbox API key

# Optional
NEXT_PUBLIC_WEB_VITALS=true                    # Enable Web Vitals reporting
```

### Local Development

```bash
STRAPI_API_URL=http://localhost:1337           # Local Strapi instance
STRAPI_API_SECRET=<token>                      # Local auth token
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<token>        # Mapbox key
```

### Container Setup

**Prerequisites:**

- Strapi backend (`play14-api`) running in its own container
- Strapi must be using the `Play14-api` Docker network (created by play14-api compose)

**Quick Start:**

1. Create `.env.local` file with your environment variables (see `.env.example` for reference)
2. Start backing services from the monorepo root: `podman compose up -d play14-api play14-db`
3. Start Next.js UI: `bun run up`
4. Access the applications:
   - Next.js UI: http://localhost:3000
   - Strapi API: http://localhost:1337
   - Database admin (pgAdmin): http://localhost:5050
5. Stop services: `bun run down`

**The containerized setup includes:**

- **Next.js UI** with hot reload for all source code changes
- Shared Docker network (`Play14-api`) for communication with Strapi
- Persistent volumes for node_modules
- Health checks for container monitoring
- Automatic connection to Strapi via service name

**Important Notes:**

- **Separate compose files**: Each repository manages its own services
- **Shared network**: Next.js connects to the external `Play14-api` network
- **Service discovery**: Next.js reaches Strapi via `http://play14-api:1337`
- **Start order**: Start play14-api services first, then play14-web
- **Scripts**:
  - `bun run up` — Start containerized Next.js
  - `bun run down` — Stop containerized Next.js
  - `bun run dev` — Run Next.js locally (no container)

## Type Safety Helpers

- Define TypeScript interfaces in `@/models/` for Strapi response types
- Use type assertions when working with API responses
- Validate data shape in server actions before returning to components

## Path Aliases (tsconfig.json)

Always use `@/*` imports:

- `@/components` → src/components
- `@/models` → src/models
- `@/libs` → src/libs
- `@/hooks` → src/hooks

## File Naming Conventions

- Components: `PascalCase.tsx` (`Navbar.tsx`, `GameGrid.tsx`)
- Server actions: `get.action.ts` (consistent naming across domains)
- Utilities: `camelCase.ts`
- Route params: Use `SlugParamsProps` from `@/libs/slug-params` for `[slug]` routes

## Writing Style Guidelines

- **Titles and headings:** Use sentence case (only capitalize the first letter of the first word), not title case
  - ✅ Correct: "Discover the power of play", "Our global impact"
  - ❌ Incorrect: "Discover the Power of Play", "Our Global Impact"
- Exception: Proper nouns, acronyms, and brand names remain capitalized (e.g., "#play14", "Strapi", "Next.js")

## Important Patterns

### Pagination & Infinite Scroll

All list pages use the `load-more.tsx` pattern:

- Initial server render with page 1
- Client component observes intersection (`useIntersection` hook)
- Calls server action to load next page
- Recursively renders `<LoadMore>` for subsequent pages

### Date Handling

- Use `date-fns` + `@date-fns/tz`
- Helper: `formatDate()` from `@/libs/dates`
- All events include `timezone` field from Strapi

### Maps & Geolocation

- Mapbox GL JS via `react-map-gl`
- Components: `src/components/map/index.tsx`, `src/components/events/map.tsx`
- Geocoding: `@mapbox/mapbox-sdk`

## Internationalisation (next-intl)

- **Locales**: `en` (default), `fr`, `de`, `es`, `it`, `pt` — message files in `src/messages/`.
- **Hard rule**: every key used in code must exist in **all six files**, or `next-intl` throws `MISSING_MESSAGE` at runtime in that locale. Keep the files structurally identical.
- After any UI-copy change, run the `i18n-sync` skill to mirror the new keys across all locales.

## Common Pitfalls

1. **Wrong directive** - Use `"use server"` in `*.action.ts`, `"use client"` for interactive components
2. **Cache issues** - Server components cache by default; set `revalidate` or `dynamic` exports as needed
3. **Image domains** - Remote images must be configured in `next.config.mjs` remotePatterns
4. **API errors** - Always handle fetch errors and check response status codes
5. **Environment variables** - Server-side variables (without `NEXT_PUBLIC_`) only available in server components and actions

## Next.js Configuration

### Output Mode

- `output: "standalone"` - Optimized for Clever Cloud's Node.js runtime
- Produces minimal production build

### Image Configuration

Remote patterns configured for:

- `cdn.play14.org` (Cloudflare-fronted Cellar CDN)
- `*.cellar-c2.services.clever-cloud.com` (Cellar direct origin)
- `localhost:1337` (local development)
- `localhost:9100` (local MinIO bucket)

### Development Mode

Uses **Turbopack** for faster builds (`next dev --turbopack`)

## Testing

- **Unit tests:** Vitest — colocated `*.test.ts` files next to source (see `src/libs/*.test.ts`). Run with `bun run test`.
- **End-to-end tests:** Playwright — specs in `tests/` (navigation, events, players, etc.). Run with `bun run test:e2e` or the UI variant `bun run test:e2e:ui`. Run `bun run playwright:install` once to fetch browsers.

## Deployment

### Clever Cloud (Primary)

The application is deployed as a **Clever Cloud Node.js app** which runs the
Next.js standalone server directly — SSR, ISR, and dynamic routes all work.

**Environments:**

- **Staging (`play14-web-staging`):** Deployed on push to the staging branch
  - Frontend: `https://staging.play14.org`
  - Backend: `https://api-staging.play14.org`
  - Workflow: `.github/workflows/clever-deploy-staging.yml`
- **Production (`play14-web`):** Deployed on push to `main`
  - Frontend: `https://play14.org`
  - Backend: `https://api.play14.org`
  - Workflow: `.github/workflows/clever-deploy-production.yml`

**Provisioning:** See [`../../iac/clever-cloud/README.md`](../../iac/clever-cloud/README.md).

**Deployment Flow:**

1. Code quality checks (lint, typecheck)
2. Build the Next.js app with Bun
3. Push the build to the target Clever Cloud app via `clever-tools`
4. Clever Cloud runs the standalone server, health-checks on `/api/health`

### Local Container Development

The application can be deployed as a containerized application using the production-optimized Dockerfile.

**Quick Start:**

```bash
# 1. Configure production environment
cp .env.production.example .env.production
# Edit .env.production with your production values

# 2. Build and run with Podman Compose
podman compose -f compose.prod.yaml up --build

# Or with Docker Compose
docker compose -f compose.prod.yaml up --build
```

**Production Features:**

- **Multi-stage build:** Optimized for minimal image size (~150MB)
- **Non-root user:** Runs as `nextjs` user (UID 1001) for security
- **Standalone output:** Self-contained deployment with all dependencies
- **Health checks:** Built-in health monitoring on `/api/health`
- **Resource limits:** Configurable CPU and memory constraints
- **Security hardening:** Read-only filesystem support, no-new-privileges

**Manual Build & Deploy:**

```bash
# Build production image
podman build -t play14-web:latest \
  --build-arg STRAPI_API_URL=https://api.play14.org \
  --build-arg STRAPI_API_SECRET=your-secret \
  --build-arg NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-token \
  -f Dockerfile .

# Run production container
podman run -d \
  --name play14-web \
  -p 3000:3000 \
  --restart unless-stopped \
  play14-web:latest
```

**Deployment Targets:**

- Clever Cloud Node.js apps (current production)
- Container orchestration platforms (Kubernetes, OpenShift)
- Any container runtime (Podman, Docker, containerd)

## Git Workflow

- **Default branch:** `main`
- **Pre-commit:** Husky + lint-staged runs Biome on staged files
- **Code quality:** Biome (lint + format) configured at the repo root

## Authentication & Authorization

Session-based auth is in place via `next-safe-action` middleware (`src/libs/safe-actions.ts`). Admin routes use the player-position → user-role mapping enforced by the API (Founder/Mentor/Host/Player).

## Admin Page Layout Classes

The admin section uses two layout classes to control content width:

### `admin-page` (Default)
- **Max-width:** 800px for `.admin-form` and `.admin-form-section`
- **Use for:** List pages, simple forms, single-column layouts
- **Examples:** `/admin/events`, `/admin/players`, `/admin/locations/create`

### `admin-page admin-page-wide`
- **Max-width:** None (full width)
- **Use for:** Complex edit forms with multi-column layouts (sidebar + content + nested grids)
- **Examples:** `/admin/events/[slug]`, `/admin/players/[id]`, `/admin/profile`

### When to Use Wide Layout

Always use `admin-page-wide` when the page contains:
1. **PlayerForm component** - Has 3-column header layout (fields | fields | avatar)
2. **Event edit forms** - Has sidebar + content with nested grids
3. **Location/Venue edit forms** - Has map + form side-by-side layout
4. **Any form using `*-form-layout` grids** with sidebar (typically `grid-template-columns: 1fr 280px`)

**Common issue:** If form fields appear collapsed/zero-width, check if the page is missing `admin-page-wide`. The 800px max-width constraint can cause nested grid layouts to collapse.

```tsx
// ✅ Correct - wide layout for complex form
<div className="admin-page admin-page-wide">
  <PlayerForm player={player} mode="self" />
</div>

// ❌ Incorrect - narrow layout will break PlayerForm
<div className="admin-page">
  <PlayerForm player={player} mode="self" />
</div>
```

