# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**#play14 API** is a Strapi 5 headless CMS serving the #play14 global community platform for agile game players and facilitators. Currently on `migration-v5` branch after upgrading from Strapi 4 with Node 22.

**Tech Stack**: Strapi 5.33.0, Node.js 22, PostgreSQL 14.5, Azure Container Apps, Azure Blob Storage, GraphQL + REST APIs

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

### Container Development

```bash
# Local with PostgreSQL + Adminer (using Podman Compose)
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

### Infrastructure Deployment (Bicep)

```powershell
# Validate Bicep templates
bicep build iac/main.bicep

# Deploy to dev environment
az deployment group create --resource-group play14-dev --template-file iac/main.bicep --parameters @iac/dev.parameters.json

# Validate without executing
az deployment group validate --resource-group play14-dev --template-file iac/main.bicep --parameters @iac/dev.parameters.json
```

## Architecture & Code Structure

### Content Type Pattern

All API resources in `src/api/*/` follow this Strapi structure:

```
src/api/{resource}/
├── content-types/{resource}/
│   ├── schema.json         # Data model with customType fields
│   └── lifecycles.js       # Hooks for slug generation, etc.
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

### Slug Generation Pattern

All content types auto-generate slugs in `lifecycles.js` using `src/libs/strings.js`:

```javascript
const { eventToSlug } = require("../../../../libs/strings");

module.exports = {
  beforeCreate(event) {
    // Events use "name-MM" format (name + start month)
    event.params.data.slug = eventToSlug(
      event.params.data.name,
      event.params.data.start
    );
  },
  beforeUpdate(event) {
    if (event.params.data.name || event.params.data.start) {
      event.params.data.slug = eventToSlug(
        event.params.data.name,
        event.params.data.start
      );
    }
  },
};
```

**Important**: Never manually set slugs - lifecycle hooks handle this automatically.

### Automated Tasks (Cron Jobs)

Located in `config/cron-tasks.js`, using Document Service API:

**Event Status Automation** (daily at 00:00 UTC):

- Transitions events past their end date from `Open`/`Announced` to `Over`
- Uses `strapi.documents('api::event.event').findMany()` and `.update()`

**Player Position Management** (daily at 00:05 UTC):

- Auto-promotes: Player → Host (if hosted ≥1 event) → Mentor (if mentored ≥1 event)
- Founders are immutable
- Uses populated relations to check event counts

**Note**: Cron is disabled in production by default (`CRON_ENABLED=false` in `config/env/production/server.js`). Enable with environment variable.

### GitHub Actions Integration

Custom service in `src/api/github-trigger/services/github-trigger.js` triggers frontend (`play14-web`) rebuilds on content changes:

- Listens for publish/unpublish/delete events on: Events, Players, Games, Articles, Home, Venues, Hostings
- Debounces triggers (5-second window)
- Calls GitHub Actions API via `GITHUB_TOKEN`
- Workflow: `play14team/play14-web` workflow ID `52506304`
- Hooks registered in `src/extensions/github-trigger-lifecycles.js` (uses DB lifecycle API, not Document Service)

### Plugin Configuration

Key plugins in `config/plugins.js`:

**GraphQL**:

- Enabled with introspection for development
- `v4CompatibilityMode: true` for migration compatibility

**Upload (Azure Storage)**:

- Provider: `strapi-provider-upload-azure-storage`
- Container: `strapi_uploads`
- CDN: `STORAGE_CDN_URL` environment variable
- `defaultPath: "assets"` - don't change without CDN updates

**Fuzzy Search**:

- Configured for events (threshold: -200) and players
- Weighted fields for relevance

**CKEditor 5**:

- Custom rich text editor (@\_sh/strapi-plugin-ckeditor 6.0.2)
- Note: CKEditor v6 uses different config approach than v2

### Custom Routes

Standard Strapi routes are auto-generated. Custom routes include:

**Event by Slug**: `src/api/event/routes/custom-event.js`

```javascript
{
  method: 'GET',
  path: '/events/:slug',
  handler: 'event.findOneBySlug',
}
```

## Critical Constraints

### Frozen Dependencies (Now Updated)

**Historical note**: These were previously frozen but had to be updated for Strapi 5:

- ~~`react-router-dom` (was 5.3.4)~~ → Now 6.28.0 (test admin panel compatibility)
- ~~`styled-components` (was 5.3.11)~~ → Now 6.1.13 (test admin panel compatibility)

### Database Configuration

PostgreSQL with SSL enabled (`config/database.js`):

```javascript
{
  client: 'postgres',
  connection: {
    host: env('DATABASE_HOST'),
    port: env.int('DATABASE_PORT'),
    database: env('DATABASE_NAME'),
    user: env('DATABASE_USERNAME'),
    password: env('DATABASE_PASSWORD'),
    ssl: env.bool('DATABASE_SSL', true) && {
      rejectUnauthorized: env.bool('DATABASE_SSL_SELF', false),
    },
  },
}
```

**Important**: SSL required for Azure Database for PostgreSQL. Set `DATABASE_SSL_SELF=true` for local development with self-signed certificates.

### Security & CORS

CSP configured in `config/middlewares.js`:

- Allows Mapbox CDN (`api.mapbox.com`, `cdn.jsdelivr.net`)
- Azure Storage domains from `STORAGE_URL`/`STORAGE_CDN_URL`
- `upgradeInsecureRequests: null` for Azure App Service compatibility

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

Use Node 22 (`.nvmrc`):

```bash
nvm use 22
```

## Deployment Pipeline

### PR Deployment (Acceptance Environment)

GitHub Actions workflow (`.github/workflows/pr-deployment.yml`):

- **Triggers**: Pull request events (opened, synchronize, reopened, closed) targeting `main`
- **Authentication**: Federated credentials (OIDC) - passwordless via `play14-github-actions` service principal
- **Container App**: `play14-api-acc` (acceptance environment)
- **Custom Domain**: `community-acc.play14.org`
- **Lifecycle**:
  1. On PR open/update: Build image → Push to ACR → Deploy to `play14-api-acc` → Scale up (1 replica)
  2. On PR close: Scale down to 0 replicas (cost optimization)
- **Image Tags**: `pr-{number}` and `pr-{number}-{sha}` for each PR

### Production Deployment

GitHub Actions workflow (`.github/workflows/production-deployment.yml`):

1. Triggers on `main` branch push
2. Builds Docker image with Mapbox token build arg
3. Pushes to Azure Container Registry
4. Deploys to Azure Container App `play14-api` in `play14-community` resource group

### Infrastructure as Code

**Bicep Templates**: `iac/main.bicep` with environment-specific parameters in `iac/bicep/parameters/`

- **Provisioning Script**: `iac/cli/provision-acc.ps1` - Creates container app and federated credentials
- **Validation Script**: `iac/cli/validate-deployment.ps1` - Pre-deployment checks
- **Federated Credentials**:
  - `play14-api-pr`: For PR deployments (`repo:play14team/play14-api:pull_request`)
  - `play14-api-main`: For production deployments (`repo:play14team/play14-api:ref:refs/heads/main`)

See [iac/DEPLOYMENT_GUIDE.md](iac/DEPLOYMENT_GUIDE.md) for detailed deployment documentation.

## Environment Variables

Critical variables (see `.env.example`):

**Database**:

- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `DATABASE_SSL=true` (required for Azure)
- `DATABASE_DEBUG=false` (set true for query debugging)

**Azure Storage**:

- `STORAGE_ACCOUNT`, `STORAGE_ACCOUNT_KEY`
- `STORAGE_URL` (blob storage base URL)
- `STORAGE_CDN_URL` (CDN endpoint)

**Security**:

- `APP_KEYS` (4 comma-separated keys for session encryption)
- `ADMIN_JWT_SECRET`, `JWT_SECRET`, `API_TOKEN_SALT`

**Integrations**:

- `GITHUB_TOKEN` (for triggering play14-web rebuilds)
- `STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN` (required for admin panel maps)

**Cron**:

- `CRON_ENABLED=false` (set true in production to enable automated tasks)

## Common Pitfalls

1. **Slug Conflicts**: Don't manually set slugs - lifecycle hooks auto-generate them
2. **GraphQL Cache**: Restart dev server after schema changes to refresh introspection
3. **Custom Fields**: Current blocker - plugins installed but not registering with Strapi 5
4. **Azure Upload**: `defaultPath: "assets"` required - don't change without CDN updates
5. **Node Version**: Use Node 22 exactly (`.nvmrc`)
6. **Bun Only**: Never use npm or yarn - package manager pinned to bun@1.3.5
7. **Cron Jobs**: Disabled by default - enable with `CRON_ENABLED=true` in production
8. **File Watching**: Admin panel ignores `config/sync/**`, `bootstrap/md/**`, `bootstrap/json/**`

## Reference Documentation

**Coding Standards & Instructions**: See `.github/instructions/` for:

- `strapi5.instructions.md` - Strapi 5 best practices
- `nodejs.instructions.md` - Node.js/JavaScript guidelines
- `testing.instructions.md` - Testing standards
- `security.instructions.md` - Security best practices
- `bicep.instructions.md` - Infrastructure as Code
- And 11 more domain-specific guides

**Reusable Prompts**: See `.github/prompts/` for common tasks:

- `setup-strapi-component.prompt.md`
- `deploy-azure-infrastructure.prompt.md`
- `write-tests.prompt.md`
- And 13 more task-specific prompts

**Chat Modes**: See `.github/chatmodes/` for specialized AI roles:

- `strapi-architect.chatmode.md` - Architecture planning
- `azure-architect.chatmode.md` - Infrastructure design
- `debugger.chatmode.md` - Bug hunting
- And 4 more specialized modes

## Key File Locations

| Component              | Path                                                   |
| ---------------------- | ------------------------------------------------------ |
| Main bootstrap         | `src/index.js`                                         |
| API definitions        | `src/api/`                                             |
| Slug utilities         | `src/libs/strings.js`                                  |
| Config files           | `config/`                                              |
| Database config        | `config/database.js`                                   |
| Cron tasks             | `config/cron-tasks.js`                                 |
| Plugin config          | `config/plugins.js`                                    |
| Middleware config      | `config/middlewares.js`                                |
| GitHub trigger service | `src/api/github-trigger/services/github-trigger.js`    |
| Lifecycle extensions   | `src/extensions/github-trigger-lifecycles.js`          |
| Admin config           | `src/admin/app.tsx`                                    |
| Components             | `src/components/`                                      |
| Bootstrap data         | `bootstrap/`                                           |
| Infrastructure         | `iac/bicep/`                                           |
| Containers             | `Dockerfile`, `docker-compose.yml` (Podman compatible) |
| Migration docs         | `MIGRATION_STATUS.md`, `MIGRATION_PLAN_STRAPI5.md`     |
