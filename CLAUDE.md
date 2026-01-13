# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a Bun workspace monorepo with the following structure:

- **Root**: Workspace configuration
- **packages/api**: Strapi 5.33.0 headless CMS API
  - **Tech Stack**: Strapi 5, Node.js 22, PostgreSQL 17.6, Azure Container Apps, GraphQL + REST
  - **Purpose**: Serves the #play14 global community platform for agile game players and facilitators
  - **Key Features**: Content management, event scheduling, player profiles, automated cron jobs
  - See `packages/api/CLAUDE.md` for detailed API documentation
- **packages/web**: Next.js 16 frontend application
  - **Tech Stack**: Next.js 16 App Router, React 19, TypeScript 5.9, SCSS, Mapbox, Azure Container Apps
  - **Purpose**: Frontend for the #play14 community platform, consuming Strapi 5 REST API
  - **Key Features**: SSR, event calendar, player profiles, interactive maps, server actions
  - See `packages/web/CLAUDE.md` for detailed web documentation
- **packages/design**: Design assets and Storybook
  - Contains graphic design resources (logos, colors, fonts, QR codes)
  - Includes a SvelteKit/Storybook application in `storybook/` subdirectory
  - Assets organized in folders: `colors/`, `font/`, `logo/` (with multiple format subfolders: EPS, PNG, SVG, PDF, PSD)

All packages use TypeScript with ES modules (`"type": "module"`).

## Common Commands

### Workspace Management

```bash
# Install all workspace dependencies
bun install
```

### Development

**Package names for bun --filter**: `play14-api`, `play14-web`, `play14-design`

```bash
# Run individual package in dev mode (with watch)
bun --filter play14-api dev          # Start API with database (Strapi develop mode)
bun --filter play14-web dev          # Start Next.js web with Turbopack
bun --filter play14-design dev

# API-specific commands
bun --filter play14-api develop      # Strapi develop mode with auto-reload
bun --filter play14-api build        # Build Strapi admin panel
bun --filter play14-api start        # Production mode without reload
bun --filter play14-api db           # Start database only
bun --filter play14-api down         # Stop containers
bun --filter play14-api test         # Run unit tests
bun --filter play14-api test:integration  # Run integration tests

# Web-specific commands
bun --filter play14-web develop      # Next.js dev with Turbopack
bun --filter play14-web build        # Production build
bun --filter play14-web start        # Run production server
bun --filter play14-web lint         # ESLint check
bun --filter play14-web format       # Prettier format
bun --filter play14-web test         # Run unit tests
bun --filter play14-web test:e2e     # Run E2E tests (Playwright)

# Work with Storybook
bun --filter play14-design storybook          # Start Storybook dev server
bun --filter play14-design build-storybook    # Build Storybook
```

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

- `play14-api`: Strapi API (port 1337)
- `play14-db`: PostgreSQL database (port 5432)
- `pgadmin`: Database admin UI (port 5050)
- `play14-web`: Next.js frontend (port 3000)
- `design`: Storybook (port 8080)
- `stripe-webhook`: Stripe CLI webhook forwarder (forwards to API on host network)

## UI Development

When creating or modifying UI components, always consider both light and dark mode. Ensure styles work correctly in both themes.

## API Permissions Bootstrap

When adding or modifying content types, controllers, or routes in the API package that require permission handling, remember to update the permissions bootstrap files:

- `packages/api/src/bootstrap/permissions/actions.ts` - Define new permission actions
- `packages/api/src/bootstrap/permissions/definitions.ts` - Configure role-based permission assignments

This ensures that new API endpoints have proper access control configured automatically on bootstrap.

## Stripe Integration

The platform uses Stripe Connect for event ticketing, allowing hosts to receive payments directly to their own Stripe Express accounts.

### Environment Variables (packages/api/.env)

```bash
STRIPE_SECRET_KEY=sk_test_xxx      # Stripe API secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx    # Webhook signature verification
STRIPE_PUBLISHABLE_KEY=pk_test_xxx # Public key (also in web/.env.local)
STRIPE_PLATFORM_FEE_PERCENT=0      # Platform fee (0% for non-profit)
```

### Webhook Endpoint

- **Route**: `POST /api/webhooks/stripe`
- **Handler**: `packages/api/src/api/ticket-order/controllers/webhook.ts`
- **Auth**: None (uses Stripe signature verification)

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

