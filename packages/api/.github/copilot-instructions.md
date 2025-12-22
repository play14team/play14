# #play14 API - Copilot Instructions

## Architecture Overview

This is a **Strapi v5** headless CMS API serving the #play14 community platform with **Azure Bicep Infrastructure as Code**. Core architecture:

- **Backend**: Strapi 5.x with PostgreSQL database
- **Infrastructure**: Azure Bicep templates for repeatable deployments
- **Deployment**: Azure Container Apps via Docker (multi-stage builds)
- **Storage**: Azure Blob Storage for media uploads
- **Frontend Integration**: Triggers `play14-web` repo rebuilds via GitHub Actions (see `update-static-content` plugin config)

### Infrastructure Components

Current infrastructure uses ARM templates in `iac/templates/`, with plans to migrate to Bicep:

- **Container Apps**: Hosting the Strapi 5 API application
- **Database**: PostgreSQL with Azure Database for PostgreSQL
- **Storage**: Azure Storage Account with CDN integration
- **Networking**: Virtual Network with private endpoints
- **Monitoring**: Application Insights and Log Analytics

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

**Infrastructure Development (Bicep)**:

```powershell
# Validate Bicep templates
bicep build iac/main.bicep

# Deploy to development environment
az deployment group create --resource-group play14-dev --template-file iac/main.bicep --parameters @iac/dev.parameters.json

# Validate deployment without executing
az deployment group validate --resource-group play14-dev --template-file iac/main.bicep --parameters @iac/dev.parameters.json
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

- **Database**: PostgreSQL with SSL enabled for Azure (see `config/database.js`)
- **Azure Storage**: `STORAGE_ACCOUNT`, `STORAGE_ACCOUNT_KEY`, `STORAGE_CDN_URL`
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

### Plugin Configuration (`config/plugins.js`)

- **Azure Storage Upload**: Custom provider with CDN support
- **Fuzzy Search**: Configured for events (threshold: -200) and players with weighted fields
- **Update Static Content**: Triggers GitHub workflow 52506304 in `play14-web` repo
- **GraphQL**: Enabled with introspection for development

### Cron Jobs (`config/cron-tasks.js`)

Automated at midnight UTC:

1. **Event Status** (00:00): Transitions "Open"/"Announced" events past their end date to "Over"
2. **Player Position** (00:05): Upgrades Player → Host (if hosted events) → Mentor (if mentored)

**Note**: Cron disabled in production via `config/env/production/server.js` (`CRON_ENABLED=false`)

## Critical Constraints

### Frozen Dependencies (README.md)

**DO NOT UPDATE** these packages without explicit approval:

- `react-router-dom` (pinned to 5.3.4 - v6 breaking changes)
- `styled-components` (pinned to 5.3.11 - theme compatibility)

### Security & CORS

CSP configured in `config/middlewares.js`:

- Allows Mapbox CDN (`api.mapbox.com`, `cdn.jsdelivr.net`)
- Azure Storage domains from `STORAGE_URL`/`STORAGE_CDN_URL` env vars
- `upgradeInsecureRequests: null` for Azure App Service compatibility

### File Watching

Admin panel ignores changes in `config/sync/**`, `bootstrap/md/**`, `bootstrap/json/**` (see `config/admin.js`)

## Deployment Pipeline

GitHub Actions workflow (`.github/workflows/play14-api-aca.yml`):

1. Triggers on `main` branch push
2. Builds Docker image with Mapbox token build arg
3. Pushes to Azure Container Registry (`play14containerregistry.azurecr.io`)
4. Deploys to Azure Container App `play14-api` in `play14-community` resource group

**IaC**: PowerShell scripts in `iac/` for Azure infrastructure provisioning.

## Component Structure

Reusable components in `src/components/`:

- `contact/`, `events/`, `games/`, `location/`, `registration/`, `reporting/`, `shared/`
- Used in content type schemas for complex field groups

## Common Pitfalls

1. **Slug Conflicts**: Lifecycle hooks modify data before save - don't manually set slugs
2. **GraphQL Cache**: Restart dev server after schema changes to refresh introspection
3. **Azure Upload**: Requires `defaultPath: "assets"` in provider config - don't change without CDN updates
4. **Bun Only**: Using Bun 1.3.5 (see `packageManager` in package.json) - avoid `npm` and `yarn`
5. **Node Version**: Check `.nvmrc` for required Node.js version (22.x for compatibility)

## Coding Standards

Follow the language-specific instructions in `.github/instructions/`:

**Application Development**:

- [Node.js/JavaScript Guidelines](./instructions/nodejs.instructions.md)
- [Strapi 5 Best Practices](./instructions/strapi5.instructions.md)
- [Testing Standards](./instructions/testing.instructions.md)
- [Security Best Practices](./instructions/security.instructions.md)
- [Documentation Requirements](./instructions/documentation.instructions.md)
- [Performance Guidelines](./instructions/performance.instructions.md)
- [Code Review Standards](./instructions/code-review.instructions.md)

**Infrastructure Development**:

- [Bicep Best Practices](./instructions/bicep.instructions.md)
- [Azure Security Guidelines](./instructions/azure-security.instructions.md)
- [Infrastructure Testing](./instructions/infrastructure-testing.instructions.md)
- [Azure DevOps Pipelines](./instructions/azure-pipelines.instructions.md)
- [Cost Optimization](./instructions/azure-cost.instructions.md)
- [Monitoring and Observability](./instructions/azure-monitoring.instructions.md)

## Specialized Prompts

Use the prompts in `.github/prompts/` for common development tasks:

**Application Development**:

- [Setup Strapi Component](./prompts/setup-strapi-component.prompt.md)
- [Write Tests](./prompts/write-tests.prompt.md)
- [Code Review](./prompts/code-review.prompt.md)
- [Refactor Code](./prompts/refactor-code.prompt.md)
- [Generate Documentation](./prompts/generate-docs.prompt.md)
- [Debug Issues](./prompts/debug-issue.prompt.md)

**Infrastructure Development**:

- [Deploy Azure Infrastructure](./prompts/deploy-azure-infrastructure.prompt.md)
- [Optimize Azure Costs](./prompts/optimize-azure-costs.prompt.md)
- [Update Bicep Modules](./prompts/update-bicep-modules.prompt.md)
- [Infrastructure Security Review](./prompts/infrastructure-security-review.prompt.md)
- [Generate Infrastructure Documentation](./prompts/generate-infra-docs.prompt.md)
- [Troubleshoot Deployment Issues](./prompts/troubleshoot-deployment.prompt.md)

## Chat Modes

Switch to specialized modes in `.github/chatmodes/`:

**Application Development**:

- [Strapi Architect](./chatmodes/strapi-architect.chatmode.md) - Architecture planning
- [Code Reviewer](./chatmodes/reviewer.chatmode.md) - Code review assistance
- [Debugger](./chatmodes/debugger.chatmode.md) - Bug hunting and fixing

**Infrastructure Development**:

- [Azure Architect](./chatmodes/azure-architect.chatmode.md) - Architecture planning and design
- [Bicep Specialist](./chatmodes/bicep-specialist.chatmode.md) - Bicep template development
- [Infrastructure Reviewer](./chatmodes/infrastructure-reviewer.chatmode.md) - Infrastructure code review
- [Deployment Troubleshooter](./chatmodes/deployment-troubleshooter.chatmode.md) - Deployment issue resolution
