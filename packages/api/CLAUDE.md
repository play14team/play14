# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**#play14 API** is a Strapi 5 headless CMS serving the #play14 global community platform for agile game players and facilitators.

**Tech Stack**: Strapi 5.42.0, Node.js 24, TypeScript 6, PostgreSQL 17, React 18.3 (admin panel), Clever Cloud (Node.js app + PostgreSQL + Cellar + Redis add-ons), GraphQL + REST APIs

## Common Development Commands

### Local Development

```bash
bun run develop       # Start Strapi in development mode with auto-reload
bun run dev           # Start with Podman Compose and follow logs
bun run build         # Build admin panel (required after plugin/config changes)
bun run start         # Production mode without reload
bun run down          # Stop and remove Podman Compose containers
```

### Database Operations

```bash
bun run export        # Export database to ../backup/database/play14
bun run import        # Import from ../backup/database/play14.tar.gz.enc
```

### Testing

- **Unit tests**: `bun --filter play14-api test` (Vitest, colocated `*.test.ts`).
- **Integration tests**: `bun --filter play14-api test:integration` — spins up an ephemeral `play14-db-test` Postgres container on port 5433 (separate from the dev DB on 5432) so tests run against a real database without polluting dev data.

### Container Development

```bash
# Local with PostgreSQL + pgAdmin (using Podman Compose)
bun run dev           # Starts containers and follows logs
bun run down          # Stops and removes containers

# Or use Podman Compose directly
podman compose up -d
podman logs -f play14-api
podman compose down

# Production build (requires Mapbox token)
podman build --build-arg STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=<token> -t play14-api .

# Run container with env file
podman run -p 1337:1337 -it --env-file=./.env --name play14-api play14-api
```

**Note**: This project uses Podman instead of Docker. All commands use `podman` and `podman compose` instead of `docker` and `docker-compose`.

### Infrastructure Deployment (Clever Cloud)

Provisioning lives in `iac/clever-cloud/` at the repo root. See that README for
the full workflow. Routine deploys go through GitHub Actions
(`clever-deploy-staging.yml`, `clever-deploy-production.yml`).

## Architecture & Code Structure

### Content Type Pattern

All API resources in `src/api/*/` follow this Strapi structure:

```
src/api/{resource}/
├── content-types/{resource}/
│   ├── schema.json         # Data model with customType fields
│   └── lifecycles.ts       # Hooks for slug generation, etc.
├── controllers/            # Request handlers
├── services/               # Business logic layer
└── routes/                 # Route definitions (auto-generated + custom)
```

### Key Content Types & Relationships

**Event** (primary resource):

- Has one `event-location` (venue details)
- Has many `players` (attendees, linked via `attended` relation)
- Has many `players` (hosts, linked via `hosted` relation)
- Has many `players` (mentors, linked via `mentored` relation)
- Has many `sponsors`
- Status workflow: `Announced` → `Open` → `Over` (or `Cancelled`)

**Player** (community members):

- Position hierarchy: `Player` → `Host` → `Mentor` → `Founder`
- Positions auto-promoted by cron based on event history
- Has many `events` through `attended`, `hosted`, `mentored` relations

**Custom Fields** (migration blocker - see below):

- Timezone: `plugin::timezone-select.timezone` (used in events)
- Country: `plugin::country-select.country` (used in locations)
- Map: `plugin::map-field.map` (used in venues, players)

**Ticketing (Stripe Connect)**: `ticket-type` (offer), `ticket-order` (checkout session), `ticket` (issued ticket), `stripe-account` (host's connected account), `discount-code`, `processed-webhook` (idempotency). See `docs/specs/stripe-connect-ticketing.md`.

**Other content types**: `article`, `game`, `home`, `venue`, `event-location`, `sponsor`, `tag`, `testimonial`, `newsletter`, `newsletter-send`, `attendance-claim`, `player-claim`, `liked-item`, `history`, `expectation`, `budget-line-item`, `result-line-item`, `import`, `translate`, `media-file`, `media-folder`, `github-trigger`. Run `ls src/api/` for the full list.

### Slug Generation Pattern

All content types auto-generate slugs in `lifecycles.ts` using `src/libs/strings.ts`:

```typescript
import { eventToSlug } from "../../../../libs/strings"

export default {
  beforeCreate(event: any) {
    // Events use "name-MM" format (name + start month)
    event.params.data.slug = eventToSlug(event.params.data.name, event.params.data.start)
  },
  beforeUpdate(event: any) {
    if (event.params.data.name || event.params.data.start) {
      event.params.data.slug = eventToSlug(event.params.data.name, event.params.data.start)
    }
  },
}
```

**Important**: Never manually set slugs - lifecycle hooks handle this automatically.

### Automated Tasks (Cron Jobs)

Located in `config/cron-tasks.ts`, using Document Service API. Tasks use
Redis-based distributed locking so they only run on one container at a time
when scaled out (see `src/services/cron/distributed-lock.ts`).

**Event Status Automation** (daily at 00:00 UTC):

- Transitions events past their end date from `Open`/`Announced` to `Over`
- Uses `strapi.documents('api::event.event').findMany()` and `.update()`

**Player Position Management** (daily at 00:05 UTC):

- Auto-promotes: Player → Host (if hosted ≥1 event) → Mentor (if mentored ≥1 event)
- Founders are immutable
- Uses populated relations to check event counts

**Note**: Cron is disabled in production by default (`CRON_ENABLED=false` in `config/env/production/server.ts`). Enable with environment variable.

### GitHub Actions Integration

Custom service in `src/api/github-trigger/services/github-trigger.ts` triggers frontend (`play14-web`) rebuilds on content changes:

- Listens for publish/unpublish/delete events on: Events, Players, Games, Articles, Home, Venues, Hostings
- Debounces triggers (5-second window)
- Calls GitHub Actions API via `GITHUB_TOKEN`
- Workflow: `play14team/play14-web` workflow ID `52506304`

### Plugin Configuration

Key plugins in `config/plugins.ts`:

**GraphQL**:

- Enabled with introspection for development
- `v4CompatibilityMode: true` for migration compatibility

**Upload (Clever Cloud Cellar via `@strapi/provider-upload-aws-s3`)**:

- Provider: `aws-s3` (Cellar is S3-compatible)
- Credentials: `CELLAR_ADDON_KEY_ID`, `CELLAR_ADDON_KEY_SECRET` (auto-injected by the Cellar add-on)
- Endpoint: `CELLAR_ADDON_HOST`, bucket `CELLAR_BUCKET`
- CDN: `STORAGE_CDN_URL` environment variable (e.g., `https://cdn.play14.org`)
- `defaultPath: "assets"` — don't change without CDN updates

**Fuzzy Search**:

- Configured for events (threshold: -200) and players
- Weighted fields for relevance

**CKEditor 5**:

- Custom rich text editor (`@_sh/strapi-plugin-ckeditor` 7.x)

### Custom Routes

Standard Strapi routes are auto-generated. Custom routes include:

**Event by Slug**: `src/api/event/routes/custom-event.ts`

```typescript
{
  method: 'GET',
  path: '/events/:slug',
  handler: 'event.findOneBySlug',
}
```

## Critical Constraints

### Database Configuration

PostgreSQL with SSL enabled (`config/database.ts`):

```typescript
{
  client: 'postgres',
  connection: {
    // DATABASE_* wins for local dev; falls back to Clever Cloud's auto-injected
    // POSTGRESQL_ADDON_* credentials in staging/production.
    host: env('DATABASE_HOST') || env('POSTGRESQL_ADDON_HOST', '127.0.0.1'),
    port: env.int('DATABASE_PORT') || env.int('POSTGRESQL_ADDON_PORT', 5432),
    database: env('DATABASE_NAME') || env('POSTGRESQL_ADDON_DB', 'strapi'),
    user: env('DATABASE_USERNAME') || env('POSTGRESQL_ADDON_USER', 'strapi'),
    password: env('DATABASE_PASSWORD') || env('POSTGRESQL_ADDON_PASSWORD', 'strapi'),
    ssl: env.bool('DATABASE_SSL', true) && {
      rejectUnauthorized: env.bool('DATABASE_SSL_SELF', false),
    },
  },
}
```

**Important**: SSL is required in production (Clever Cloud PostgreSQL add-on). Set `DATABASE_SSL_SELF=true` for local development with self-signed certificates. Clever Cloud auto-injects `POSTGRESQL_ADDON_*`; the config falls back to those when `DATABASE_*` is unset.

### Security & CORS

CSP configured in `config/middlewares.ts`:

- Allows Mapbox CDN (`api.mapbox.com`, `cdn.jsdelivr.net`)
- Cellar/CDN origins from `STORAGE_CDN_URL` + `https://cdn.play14.org` + `https://*.cellar-c2.services.clever-cloud.com`

### Package Manager

**Use Bun 1.3.5 exclusively** (pinned in `package.json`):

```json
"packageManager": "bun@1.3.5"
```

Bun provides:

- 2-10x faster dependency installation than Yarn/npm
- Drop-in compatibility with Node.js and npm packages
- Native TypeScript and JSX support
- Built-in bundler and test runner

Do not use npm or yarn commands - always use `bun` or `bun run`.

### Node Version

Use Node 24 (`.nvmrc`):

```bash
nvm use 24
```

## Deployment Pipeline

### Staging Deployment

GitHub Actions workflow (`.github/workflows/clever-deploy-staging.yml`):

1. Triggers on push to the staging branch
2. Builds with Bun
3. Deploys to Clever Cloud app `play14-api-staging` via `clever-tools`
4. Exposes `api-staging.play14.org` (set via `domains.sh`)

### Production Deployment

GitHub Actions workflow (`.github/workflows/clever-deploy-production.yml`):

1. Triggers on `main` branch push
2. Builds with Bun
3. Deploys to Clever Cloud app `play14-api`
4. Exposes `api.play14.org`

### Infrastructure as Code

Provisioning scripts in `iac/clever-cloud/` (at the repo root):

- `provision.sh` — creates the 4 apps + 6 add-ons (PG/Cellar/Redis × staging/prod)
- `buckets.sh` — creates Cellar buckets and applies CORS
- `set-env.sh` — applies env var files to a Clever Cloud app
- `domains.sh` — attaches custom domains (staging + production)

## Environment Variables

Critical variables (see `.env.example`):

**Database** (Clever Cloud auto-injects `POSTGRESQL_ADDON_*`; override with the
`DATABASE_*` names for local dev):

- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `DATABASE_SSL=true` (required in production)
- `DATABASE_DEBUG=false` (set true for query debugging)

**Storage (Cellar)** — auto-injected by the Cellar add-on:

- `CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID`, `CELLAR_ADDON_KEY_SECRET`
- `CELLAR_BUCKET` (bucket name)
- `STORAGE_CDN_URL` (public CDN URL, e.g., `https://cdn.play14.org`)

**Security**:

- `APP_KEYS` (4 comma-separated keys for session encryption)
- `ADMIN_JWT_SECRET`, `JWT_SECRET`, `API_TOKEN_SALT`

**URLs**:

- `PUBLIC_URL` (base URL for public assets and OAuth callbacks; used to build the default logo URL `PUBLIC_URL/images/play14_600x200_transparent-light.png`)
- `LOGO_URL` (optional override for the logo used in HTML emails; defaults to the path above so you can point to `http://localhost:1337/...` in dev)

**Integrations**:

- `GITHUB_TOKEN` (for triggering play14-web rebuilds)
- `STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN` (required for admin panel maps)

**Cron**:

- `CRON_ENABLED=false` (set true in production to enable automated tasks)

## API Guidelines

### Document Service API Only

**Always use the Document Service API** (`strapi.documents()`) for all database operations. The old Query API (`strapi.query()`) is deprecated in Strapi 5.

```typescript
// ✅ CORRECT - Document Service API
const user = await strapi.documents("plugin::users-permissions.user").findFirst({
  filters: { id: userId },
  populate: { player: true },
})

await strapi.documents("plugin::users-permissions.user").update({
  documentId: user.documentId,
  data: { player: playerId } as any, // Type assertion needed for extended relations
})

// ❌ DEPRECATED - Query API (do not use)
const user = await strapi.query("plugin::users-permissions.user").findOne({
  where: { id: userId },
  populate: { player: true },
})
```

**Key differences**:

- `findOne({ where })` → `findFirst({ filters })` or `findOne({ documentId })`
- `update({ where, data })` → `update({ documentId, data })`
- Use `as any` for custom relations not in Strapi types (e.g., `player` on users-permissions)

**Document Service API Methods**:

```typescript
// Count entries
const count = await strapi.documents("api::event.event").count({
  filters: { eventStatus: "Open" },
})

// Find with pagination, sorting, and field selection
const events = await strapi.documents("api::event.event").findMany({
  filters: { eventStatus: { $in: ["Open", "Announced"] } },
  fields: ["name", "slug", "start", "end"],
  populate: { location: { fields: ["name", "city"] } },
  sort: { start: "asc" },
  limit: 10,
  offset: 0,
  status: "published", // Draft/publish status filter
})

// Create with publish status
const event = await strapi.documents("api::event.event").create({
  data: { name: "New Event", eventStatus: "Announced" },
  status: "published", // or "draft"
})
```

## Permission Management for Custom API Endpoints

**CRITICAL**: When adding or modifying custom API endpoints, always configure permissions using the existing bootstrap mechanism.

### Permission Setup Pattern

1. **Define action constants** in `src/bootstrap/permissions/actions.ts`:

   ```typescript
   export const EVENT_ACTIONS = {
     // ... existing actions
     UPDATE_SCHEDULE: "api::event.custom-event.updateSchedule",
   }
   ```

2. **Map permissions to roles** in `src/bootstrap/permissions/definitions.ts`:

   ```typescript
   { action: EVENT_ACTIONS.UPDATE_SCHEDULE, minimumRole: ROLE_TYPES.HOST },
   ```

3. **Bootstrap auto-grants permissions** based on position hierarchy (Player < Host < Mentor < Founder)

### Key Files

- `src/bootstrap/permissions/actions.ts` - Action constant definitions
- `src/bootstrap/permissions/definitions.ts` - Role-to-permission mapping
- `src/bootstrap/index.ts` - Bootstrap entry point

### Common Mistakes

- **403 Forbidden**: Missing permission definition for new endpoint
- **Permission not applied**: Action name mismatch between route handler and definition
- **Wrong hierarchy**: Using incorrect `minimumRole` (e.g., `HOST` when should be `MENTOR`)

## Media Library API & Folder Management

### Strapi Upload Plugin Architecture

Strapi 5's upload plugin uses these internal tables:

- `plugin::upload.file` - Files with metadata, URLs, and `folder` relation
- `plugin::upload.folder` - Folder hierarchy with `pathId`, `path`, `parent`, and `name`

**Important**: The `folderPath` field on files is marked as `private: true` in Strapi's schema, so it's NOT exposed via Content API. Custom endpoints are required for folder-aware file queries.

### Custom Media Endpoints

We've implemented custom endpoints because Strapi's Content API doesn't support filtering files by folder:

**`/api/media-files`** (`src/api/media-file/`)

- Lists files with folder filtering: `?filters[folder]=<id>` or `?filters[folder][$null]=true` (root level)
- Supports `mime`, `name` filtering and pagination
- Queries `plugin::upload.file` directly via `strapi.db.query()`

**`/api/media-folders`** (`src/api/media-folder/`)

- Lists folders with parent filtering: `?filters[parent]=<id>` or `?filters[parent][$null]=true` (root)
- Returns folder counts (children, files)
- Queries `plugin::upload.folder` directly

### Uploading Files to Specific Folders

When using the upload service programmatically, specify the folder via `fileInfo.folder`:

```typescript
const uploadService = strapi.plugin("upload").service("upload")

// Get or create folder first
const folderId = await getOrCreateMediaFolder(strapi, "players")

await uploadService.upload({
  data: {
    refId: entityId,
    ref: "api::player.player",
    field: "avatar",
    fileInfo: {
      folder: folderId, // Folder ID (number)
    },
  },
  files: fileArray,
})
```

### Creating Folders Programmatically

Folders require unique `pathId` values:

```typescript
async function getOrCreateMediaFolder(strapi, folderName: string): Promise<number> {
  // Check if exists at root level
  const existing = await strapi.db.query("plugin::upload.folder").findOne({
    where: { name: folderName, parent: null },
  })
  if (existing) return existing.id

  // Get next pathId
  const maxResult = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { pathId: "desc" },
    limit: 1,
  })
  const nextPathId = maxResult.length > 0 ? maxResult[0].pathId + 1 : 1

  // Create folder
  const folder = await strapi.db.query("plugin::upload.folder").create({
    data: {
      name: folderName,
      pathId: nextPathId,
      path: `/${nextPathId}`,
      parent: null,
    },
  })
  return folder.id
}
```

### Permissions for Media Endpoints

Media library endpoints require permission grants in `src/bootstrap/permissions/`:

```typescript
// actions.ts
export const MEDIA_FOLDER_ACTIONS = {
  FIND: "api::media-folder.media-folder.find",
} as const

export const MEDIA_FILE_ACTIONS = {
  FIND: "api::media-file.media-file.find",
} as const

// definitions.ts
{ action: MEDIA_FOLDER_ACTIONS.FIND, minimumRole: ROLE_TYPES.HOST },
{ action: MEDIA_FILE_ACTIONS.FIND, minimumRole: ROLE_TYPES.HOST },
```

### Image MIME Types

When validating web-displayable images, use correct MIME types:

- `image/jpeg` (NOT `image/jpg` - that's invalid)
- `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `image/avif`
- `image/heic` is NOT web-displayable (browsers don't support it)

### Media Folder Organization

Media files are organized into folders by content type:

**Player Avatars**: `players/`

- Uploaded via `/api/admin/players/me/picture` endpoint
- Uses `getOrCreateMediaFolder()` in `custom-player.ts`

**Event Images**: `events/{locationSlug}/{eventSlug}/`

- Uploaded via `/api/admin/events/:slug/images` endpoint
- Creates nested folder hierarchy: events → location → event
- Uses `getOrCreateEventImageFolder()` in `custom-event.ts`
- Falls back to `unknown-location` if event has no location set
- **Default image aspect ratio**: Must be 6:5 (e.g., 600x500, 1200x1000). Validated before upload.
- Gallery images have no aspect ratio requirement

Example folder structure:

```
events/
├── luxembourg/
│   ├── luxembourg-01/
│   └── luxembourg-06/
├── paris/
│   └── paris-03/
└── unknown-location/
    └── virtual-event-02/
players/
```

## Common Pitfalls

1. **Slug Conflicts**: Don't manually set slugs - lifecycle hooks auto-generate them
2. **GraphQL Cache**: Restart dev server after schema changes to refresh introspection
3. **Custom Fields**: Current blocker - plugins installed but not registering with Strapi 5
4. **Upload defaultPath**: `defaultPath: "assets"` required - don't change without CDN updates
5. **Node Version**: Use Node 24 exactly (`.nvmrc`)
6. **Bun Only**: Never use npm or yarn - package manager pinned to bun@1.3.5
7. **Cron Jobs**: Disabled by default - enable with `CRON_ENABLED=true` in production
8. **File Watching**: Admin panel ignores `config/sync/**`, `bootstrap/md/**`, `bootstrap/json/**`
9. **Permissions**: Always add permission definitions when creating custom API endpoints - see "Permission Management" section above
10. **Reserved Field Names**: In Strapi 5, `status`, `type`, `state`, and `id` are reserved and **MUST NEVER** be used as custom attribute names on a content type. They collide with Strapi's draft/publish state (`status`), polymorphic/internal discriminators (`type`), Koa request context (`state`), and the numeric primary key (`id`) — symptoms range from silent admin-UI validation errors ("Invalid status") to runtime breakage on the frontend. Always domain-prefix instead: `orderStatus`, `ticketStatus`, `eventStatus`, `expectationType`, `webhookStatus`, etc. Apply this rule when **designing** new content types — don't ship the reserved name and rename later. If a rename is unavoidable, use the `rename-strapi-attribute` skill (it covers schema, idempotent migration, every API/web/test reference).
11. **User Roles Must Match Player Positions**: When creating users linked to players, always assign the role that matches the player's position. Player positions (Founder, Mentor, Host, Player) map 1:1 to user roles (founder, mentor, host, player). **NEVER** use the generic "authenticated" role - always map the position to the correct role type:
    ```typescript
    const positionToRoleType: Record<string, string> = {
      Founder: "founder",
      Mentor: "mentor",
      Host: "host",
      Player: "player",
    }
    const roleType = positionToRoleType[player.position] || "player"
    const role = await strapi.db.query("plugin::users-permissions.role").findOne({
      where: { type: roleType },
    })
    ```

## Reference Documentation

### Strapi Official Documentation

For Strapi 5 reference, use the official docs at https://docs.strapi.io:

- **AI-Optimized Docs**: Use `https://docs.strapi.io/llms.txt` (summary) or `https://docs.strapi.io/llms-full.txt` (complete) for LLM context
- **Interactive Project Structure**: Navigate code patterns at the interactive project structure page
- **Search & AI Assistant**: Use the search bar or "Ask AI" button for natural language queries

**Key Strapi 5 Concepts**:

- **Document Service API**: Primary backend content interaction method (see "API Guidelines" section)
- **Vite Bundler**: Default admin panel bundler (replaced webpack in Strapi 5)
- **Draft/Publish Status**: Built-in content workflow with `status` field (reserved - see pitfalls)
- **Widget API**: `app.widgets.register()` available in Strapi 5.13+ for homepage customization

### Project-Specific Documentation

- Architecture decisions: `../../docs/adr/`
- Feature specs (e.g. Stripe Connect ticketing): `../../docs/specs/`

## Key File Locations

| Component              | Path                                                   |
| ---------------------- | ------------------------------------------------------ |
| Main bootstrap         | `src/index.ts`                                         |
| API definitions        | `src/api/`                                             |
| Slug utilities         | `src/libs/strings.ts`                                  |
| Config files           | `config/`                                              |
| Database config        | `config/database.ts`                                   |
| Cron tasks             | `config/cron-tasks.ts`                                 |
| Plugin config          | `config/plugins.ts`                                    |
| Middleware config      | `config/middlewares.ts`                                |
| GitHub trigger service | `src/api/github-trigger/services/github-trigger.ts`    |
| Admin config           | `src/admin/app.tsx`                                    |
| Components             | `src/components/`                                      |
| Bootstrap hooks        | `src/bootstrap/`                                       |
| Infrastructure         | `../../iac/clever-cloud/`                              |
| Containers             | `Dockerfile`, `../../compose.yaml` (Podman compatible) |
