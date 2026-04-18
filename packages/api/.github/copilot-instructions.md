# #play14 API - Copilot Instructions

## Architecture Overview

This is a **Strapi v5** headless CMS API serving the #play14 community platform. Core architecture:

- **Backend**: Strapi 5.x with PostgreSQL database
- **Deployment**: Clever Cloud Node.js apps (see `iac/clever-cloud/`)
- **Storage**: Clever Cloud Cellar (S3-compatible) for media uploads, fronted by Cloudflare at `cdn.play14.org`
- **Frontend Integration**: Triggers `play14-web` repo rebuilds via GitHub Actions (see `update-static-content` plugin config)

### Infrastructure Components

Provisioning scripts live in `iac/clever-cloud/`:

- **Node app**: Hosting the Strapi 5 API application (`play14-api`, `play14-api-staging`)
- **Database**: Clever Cloud PostgreSQL add-on (credentials auto-injected as `POSTGRESQL_ADDON_*`)
- **Storage**: Clever Cloud Cellar add-on (S3-compatible, `CELLAR_ADDON_*`)
- **Cache**: Clever Cloud Redis add-on for distributed cache/cron locking

### Key Content Types

Located in `src/api/*/content-types/*/schema.json`:

- **Events**: Community gatherings with status workflow (Announced → Open → Over → Cancelled)
- **Players**: Community members with hierarchical positions (Player → Host → Mentor → Founder)
- **Games**: Serious games catalog with fuzzy search
- **Venues**: Physical event locations with map coordinates (Mapbox integration)

## Development Workflow

### Local Development

**Strapi Development**:

```bash
bun run dev           # Start with auto-reload (port 1337)
bun run build         # Build admin panel
bun run start         # Production mode without reload
```

### Container Workflow

**Note**: This project uses Podman instead of Docker.

```bash
# Local testing with podman-compose (includes PostgreSQL)
podman compose up

# Production build (requires STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN)
podman build --build-arg STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=<token> -t play14-api .
```

### Environment Setup

Copy `.env.example` → `.env`. Critical variables:

- **Database**: PostgreSQL connection (Clever Cloud injects `POSTGRESQL_ADDON_*` automatically; override with `DATABASE_*` for local dev)
- **Storage (Cellar)**: `CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID`, `CELLAR_ADDON_KEY_SECRET`, `CELLAR_BUCKET`, `STORAGE_CDN_URL`
- **Security**: `APP_KEYS` (4 comma-separated keys), `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`

## Strapi-Specific Patterns

### Slug Generation with Lifecycle Hooks

All content types auto-generate slugs via `lifecycles.js` using `src/libs/strings.js`:

```javascript
// Example: src/api/event/content-types/event/lifecycles.js
const { eventToSlug } = require("../../../../libs/strings");
module.exports = {
  beforeCreate(event) {
    event.params.data.slug = eventToSlug(
      event.params.data.name,
      event.params.data.start
    );
  },
};
```

**Pattern**: Events use `name-MM` format (name + month), others use standard slugify.

### Custom Routes

Standard Strapi routes in `src/api/*/routes/*.js`, plus custom routes like:

- `src/api/event/routes/custom-event.js`: GET `/events/:slug` for slug-based lookups

### Plugin Configuration (`config/plugins.ts`)

- **Upload (Cellar via aws-s3 provider)**: Uses `CELLAR_ADDON_*` env vars and `STORAGE_CDN_URL` for CDN-fronted URLs
- **Fuzzy Search**: Configured for events (threshold: -200) and players with weighted fields
- **Update Static Content**: Triggers GitHub workflow 52506304 in `play14-web` repo
- **GraphQL**: Enabled with introspection for development

### Cron Jobs (`config/cron-tasks.js`)

Automated at midnight UTC:

1. **Event Status** (00:00): Transitions "Open"/"Announced" events past their end date to "Over"
2. **Player Position** (00:05): Upgrades Player → Host (if hosted events) → Mentor (if mentored)

**Note**: Cron disabled in production via `config/env/production/server.js` (`CRON_ENABLED=false`)

## Critical Constraints

### Security & CORS

CSP configured in `config/middlewares.ts`:

- Allows Mapbox CDN (`api.mapbox.com`, `cdn.jsdelivr.net`)
- Cellar/CDN origins from `STORAGE_CDN_URL` env var + `cdn.play14.org` + `*.cellar-c2.services.clever-cloud.com`

### File Watching

Admin panel ignores changes in `config/sync/**`, `bootstrap/md/**`, `bootstrap/json/**` (see `config/admin.ts`)

## Deployment Pipeline

GitHub Actions workflows:

- `.github/workflows/clever-deploy-staging.yml`: Staging deploy on push to the migration branch
- `.github/workflows/clever-deploy-production.yml`: Production deploy on push to `main`

Both build the app with Bun, then push a deploy to the target Clever Cloud app
via `clever-tools`.

## Component Structure

Reusable components in `src/components/`:

- `contact/`, `events/`, `games/`, `location/`, `registration/`, `reporting/`, `shared/`
- Used in content type schemas for complex field groups

## Common Pitfalls

1. **Slug Conflicts**: Lifecycle hooks modify data before save - don't manually set slugs
2. **GraphQL Cache**: Restart dev server after schema changes to refresh introspection
3. **Upload default path**: Requires `defaultPath: "assets"` in provider config - don't change without CDN updates
4. **Bun Only**: Using Bun 1.3.5 (see `packageManager` in package.json) - avoid `npm` and `yarn`
5. **Node Version**: Check `.nvmrc` for required Node.js version (22.x for compatibility)

## Coding Standards

Follow the language-specific instructions in `.github/instructions/`:

- [Node.js/JavaScript Guidelines](./instructions/nodejs.instructions.md)
- [Strapi 5 Best Practices](./instructions/strapi5.instructions.md)
- [Testing Standards](./instructions/testing.instructions.md)
- [Security Best Practices](./instructions/security.instructions.md)
- [Documentation Requirements](./instructions/documentation.instructions.md)
- [Performance Guidelines](./instructions/performance.instructions.md)
- [Code Review Standards](./instructions/code-review.instructions.md)

## Specialized Prompts

Use the prompts in `.github/prompts/` for common development tasks:

- [Setup Strapi Component](./prompts/setup-strapi-component.prompt.md)
- [Write Tests](./prompts/write-tests.prompt.md)
- [Code Review](./prompts/code-review.prompt.md)
- [Refactor Code](./prompts/refactor-code.prompt.md)
- [Generate Documentation](./prompts/generate-docs.prompt.md)
- [Debug Issues](./prompts/debug-issue.prompt.md)

## Chat Modes

Switch to specialized modes in `.github/chatmodes/`:

- [Strapi Architect](./chatmodes/strapi-architect.chatmode.md) - Architecture planning
- [Code Reviewer](./chatmodes/reviewer.chatmode.md) - Code review assistance
- [Debugger](./chatmodes/debugger.chatmode.md) - Bug hunting and fixing
