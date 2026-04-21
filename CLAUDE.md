# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a Bun workspace monorepo with the following structure:

- **Root**: Workspace configuration
- **packages/api** (`play14-api`): Strapi 5.42 headless CMS
  - **Tech Stack**: Strapi 5.42, Node.js 24, TypeScript 6, PostgreSQL 17, React 18.3 (admin), GraphQL + REST
  - **Hosting**: Clever Cloud (Node.js app + PostgreSQL + Cellar + Redis add-ons)
  - **Purpose**: Serves the #play14 global community platform for agile game players and facilitators
  - **Key Features**: Content management, event scheduling, player profiles, Stripe Connect ticketing, automated cron jobs with Redis-based distributed locking
  - See `packages/api/CLAUDE.md` for detailed API documentation
- **packages/web** (`play14-web`): Next.js 16 frontend application
  - **Tech Stack**: Next.js 16.2 App Router, React 19.2, TypeScript 6, SCSS + Radix UI primitives, Mapbox GL
  - **Hosting**: Clever Cloud Node.js app (Node 24)
  - **Purpose**: Frontend for the #play14 community platform, consuming the Strapi 5 REST API
  - **Key Features**: SSR, event calendar, player profiles, interactive maps, server actions, i18n via `next-intl`
  - See `packages/web/CLAUDE.md` for detailed web documentation
- **packages/design** (`play14-design`): Design assets and Storybook
  - Contains graphic design resources (logos, colors, fonts, QR codes)
  - Includes a Storybook application in `storybook/` subdirectory
  - Assets organized in folders: `colors/`, `font/`, `logo/` (with multiple format subfolders: EPS, PNG, SVG, PDF, PSD)

Root and both app packages run on **Bun 1.3.5** (pinned via `packageManager`) and use TypeScript with ES modules (`"type": "module"`). `.nvmrc` pins Node 24 (the current LTS) for both the API and the web app.

## Common Commands

### Workspace Management

```bash
# Install all workspace dependencies
bun install
```

### Development

**Package names for bun --filter**: `play14-api`, `play14-web`, `play14-design`

```bash
# API-specific commands (run from repo root)
bun --filter play14-api dev                # TZ=UTC strapi develop (auto-reload)
bun --filter play14-api build              # Build Strapi admin panel
bun --filter play14-api start              # Production mode without reload
bun --filter play14-api db                 # Start database container only
bun --filter play14-api down               # Stop containers
bun --filter play14-api test               # Vitest unit tests
bun --filter play14-api test:integration   # Vitest integration tests (starts play14-db-test)
bun --filter play14-api typecheck          # tsc --noEmit

# Web-specific commands
bun --filter play14-web dev                # next dev --turbopack
bun --filter play14-web build              # Production build (standalone output)
bun --filter play14-web start              # Run production server
bun --filter play14-web lint               # Biome lint
bun --filter play14-web check              # Biome check (lint + format verification)
bun --filter play14-web format             # Biome format (write)
bun --filter play14-web typecheck          # tsc --noEmit
bun --filter play14-web test               # Vitest unit tests
bun --filter play14-web test:e2e           # Playwright E2E tests

# Work with Storybook
bun --filter play14-design storybook          # Start Storybook dev server
bun --filter play14-design build-storybook    # Build Storybook
```

### Aggregate root scripts

`package.json` at the repo root exposes these shortcuts (from `bun run`):

- `lint` / `lint:fix` / `check` / `format` — run the corresponding Biome task across API and web
- `typecheck` — run the web package `tsc --noEmit` (API has its own via `bun --filter play14-api typecheck`)
- `test`, `test:api`, `test:web`, `test:int`, `test:all` — unit + integration test runners
- `verify` — lint + check + typecheck + test:all
- `api`, `web` — start each dev server; `build`, `build:api`, `build:web` — build bundles; `start:api`, `start:web` — production run

### Container Development

```bash
# Start all services (API, database, pgAdmin, design)
podman-compose up

# Start specific services
podman-compose up play14-api play14-db    # API and database only
podman-compose up design                   # Design/Storybook only

# Stop all services
podman-compose down
```

**Available Services**:

- `play14-api`: Strapi API (port 1337, Prometheus metrics on 9000)
- `play14-db`: PostgreSQL 17.6 database (port 5432)
- `play14-db-test`: Ephemeral PostgreSQL for integration tests (port 5433)
- `play14-redis`: Redis 7 (port 6379) — used for cache + distributed cron locks
- `play14-minio` + `play14-minio-init`: Local S3-compatible object storage (ports 9100/9101) standing in for the Clever Cloud Cellar add-on
- `pgadmin`: Database admin UI (port 5050)
- `play14-web`: Next.js frontend (port 3000)
- `design`: Storybook (port 8080)
- `stripe-webhook`: Stripe CLI webhook forwarder (forwards to API on host network)

## Deployment

Both apps deploy to **Clever Cloud** via GitHub Actions:

- `.github/workflows/clever-deploy-staging.yml` — staging (`play14-api-staging`, `play14-web-staging`)
- `.github/workflows/clever-deploy-production.yml` — production (`play14-api`, `play14-web`) on push to `main`

Provisioning scripts for apps, add-ons, buckets, env vars, and custom domains live in [`iac/clever-cloud/`](./iac/clever-cloud/). See the README there for the workflow.

## Quality gates

- **Linter/formatter**: Biome (root `biome.json`, plus per-package overrides). Run `bun run check` before pushing.
- **Type checking**: `bun run typecheck` for web; `bun --filter play14-api typecheck` for API.
- **Pre-commit hook** (`.husky/pre-commit`): runs `lint-staged` (Biome on staged files) and then `tsc --noEmit` only for packages with staged `.ts`/`.tsx` files. Don't bypass with `--no-verify`.
- **Tests**: Vitest unit tests live next to source as `*.test.ts`; Playwright E2E specs live in `packages/web/tests/`; API integration tests use the ephemeral `play14-db-test` container on port 5433.

## Commit and PR conventions

- Use **Conventional Commits** with an optional scope: `fix(web): …`, `chore: …`, `ci(deploy): …`, `feat(api): …`. Recent history is the source of truth — follow the same prefixes.
- Default branch is `main`; both production deploys trigger from pushes to it.
- Keep commits scoped to a single package when possible (the deploy workflow detects which package changed).

## Internationalisation

- Web app uses `next-intl` with **five locales**: `en`, `fr`, `de`, `es`, `it` (files in `packages/web/messages/`).
- `next-intl` throws `MISSING_MESSAGE` at runtime if a key is absent in the active locale, so any UI-copy change must add the key to **all five files**. The `i18n-sync` skill handles this — invoke it after any string change.

## UI Development

When creating or modifying UI components, always consider both light and dark mode. Ensure styles work correctly in both themes.

## Writing style

Use sentence case for all text: only capitalize the first letter of the first word. Do not capitalize every word in titles, headings, labels, or button text.

- Correct: "Things we like", "Create new event", "Back to home"
- Incorrect: "Things We Like", "Create New Event", "Back To Home"

Exceptions: proper nouns, acronyms, and brand names keep their standard capitalization (e.g., "Next.js", "Strapi", "#play14").

## API Permissions Bootstrap

When adding or modifying content types, controllers, or routes in the API package that require permission handling, remember to update the permissions bootstrap files:

- `packages/api/src/bootstrap/permissions/actions.ts` - Define new permission actions
- `packages/api/src/bootstrap/permissions/definitions.ts` - Configure role-based permission assignments

This ensures that new API endpoints have proper access control configured automatically on bootstrap. The `strapi-permissions-audit` skill (see "Claude Code tooling" below) detects drift automatically.

## Claude Code tooling

This repo ships specialised subagents and skills under `.claude/` to keep contributions aligned with project conventions. Browse via `/agents` and `/skills`; they auto-trigger on matching phrases and delegate work across the stack.

### Subagents (`.claude/agents/`)

| Agent | Use for |
| --- | --- |
| `typescript-pro` | TypeScript across both packages — generics, strict-mode fallout, dual-tsconfig concerns |
| `frontend-developer` | `packages/web` — Next.js 16 App Router, React 19, SCSS, Radix UI, next-intl, Mapbox |
| `ui-designer` | Visual design, SvelteKit Storybook specs, light/dark-mode coverage |
| `accessibility-tester` | WCAG audits, Playwright a11y checks, Radix baseline awareness |
| `strapi-developer` | `packages/api` — content types, controllers/services/routes, webhooks, API contract design |
| `postgres-pro` | PG 17 — query profiling and indexes via Knex lifecycle hooks (Strapi owns the schema) |
| `code-reviewer` | Review + targeted refactoring, project-convention checks |
| `test-automator` | Vitest unit + integration + Playwright E2E |
| `performance-engineer` | Core Web Vitals, Strapi Prometheus metrics, Redis caching levers |
| `clever-cloud-expert` | Deploy, add-ons, metrics, CI workflows |

### Skills (`.claude/skills/`)

| Skill | Purpose |
| --- | --- |
| `i18n-sync` | Keep the 5 next-intl message files under `packages/web/messages/` synchronised. Run after any UI-copy change — next-intl throws `MISSING_MESSAGE` at runtime for missing keys. |
| `strapi-permissions-audit` | Detect silent 403s from missing entries in `packages/api/src/bootstrap/permissions/{actions,definitions}.ts`. Run after any change under `packages/api/src/api/*/routes/` or `controllers/`. |
| `strapi-content-type-scaffolder` | Scaffold a new Strapi 5 content type end-to-end (schema, controller, service, router, permissions actions + definitions) so nothing is forgotten. |

### Handoff map

- Schema work → `strapi-developer`; query tuning → `postgres-pro`.
- Visual design → `ui-designer`; implementation → `frontend-developer`; WCAG audit → `accessibility-tester`.
- Review / refactoring → `code-reviewer`; infra and deploy → `clever-cloud-expert`.
- Every API change → run `strapi-permissions-audit`. Every UI-copy change → run `i18n-sync`.

## Stripe Integration

The platform uses Stripe Connect for event ticketing, allowing hosts to receive payments directly to their own Stripe Express accounts.

### Environment Variables (packages/api/.env)

```bash
STRIPE_SECRET_KEY=sk_test_xxx                  # Stripe API secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx                # Platform webhook signing secret
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_xxx        # Connected accounts webhook signing secret
STRIPE_PUBLISHABLE_KEY=pk_test_xxx             # Public key (also in web/.env.local)
STRIPE_PLATFORM_FEE_PERCENT=0                  # Platform fee (0% for non-profit)
```

### Dual Webhook Architecture

The platform uses **two separate webhook endpoints** with different signing secrets:

1. **Platform Account Webhook** (`STRIPE_WEBHOOK_SECRET`)
   - Events from: Your account (platform account)
   - Handles: Direct platform payments (standard checkout sessions)
   - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`

2. **Connected Accounts Webhook** (`STRIPE_WEBHOOK_SECRET_CONNECT`)
   - Events from: Connected accounts
   - Handles: Stripe Connect events (host payments, account status)
   - Events: `account.updated`, `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`

Both webhooks point to the same endpoint, which automatically verifies signatures against both secrets.

### Webhook Endpoint

- **Route**: `POST /api/webhooks/stripe`
- **Handler**: `packages/api/src/api/ticket-order/controllers/webhook.ts`
- **Auth**: None (uses Stripe signature verification with dual-secret support)

### Local Development with Stripe CLI

For local webhook testing, use the `stripe-webhook` container defined in `compose.yaml`:

```bash
# Start the Stripe webhook forwarder
podman-compose up stripe-webhook

# Or run Stripe CLI manually
stripe listen --forward-to localhost:1337/api/webhooks/stripe
```

The container uses the official Stripe CLI image and forwards webhook events to the local API. It requires `STRIPE_SECRET_KEY` to be set in `packages/api/.env`.

### Key Files

- `packages/api/src/services/payment/providers/stripe.ts` - Stripe service provider
- `packages/api/src/api/ticket-order/controllers/webhook.ts` - Webhook handler
- `packages/api/src/api/stripe-account/` - Connected accounts management
- `docs/specs/stripe-connect-ticketing.md` - Full technical specification

