# Production Deployment Guide

## Document Info

| Field | Value |
|-------|-------|
| **Version** | 2.0 |
| **Date** | 2026-01-17 |
| **Branch** | `feat/admin-panel-oauth` |
| **Status** | Active deployment documentation |

---

## 1. Architecture Overview

### 1.1 Infrastructure

| Component | Technology | Environment |
|-----------|------------|-------------|
| **API** | Strapi 5.33.0 | Azure Container Apps |
| **Web** | Next.js 16 (App Router) | Azure Container Apps |
| **Database** | PostgreSQL 17.6 | Azure Database for PostgreSQL |
| **Storage** | Azure Blob Storage | CDN-enabled |
| **Registry** | Azure Container Registry | `play14containerregistry.azurecr.io` |
| **Cache** | Azure Cache for Redis | Shared cache across replicas |

### 1.2 Environments

| Environment | API Container App | Web Container App | Purpose |
|-------------|-------------------|-------------------|---------|
| **Production** | `play14-api` | `play14-ui` | Live site |
| **Acceptance** | `play14-api-acc` | `play14-ui-acc` | PR testing (auto-start/stop) |

### 1.3 URLs

| Environment | API URL | Web URL |
|-------------|---------|---------|
| **Production** | `https://community.play14.org` | `https://play14.org` |
| **Acceptance** | Auto-assigned Azure URL | Auto-assigned Azure URL |

---

## 2. CI/CD Pipeline

### 2.1 Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Actions                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PR to main (packages/api/**)                                        │
│  ├── Type check                                                      │
│  ├── Unit tests                                                      │
│  ├── Build Strapi admin                                              │
│  ├── Integration tests (PostgreSQL service container)                │
│  ├── Build & push Docker image                                       │
│  ├── Deploy to play14-api-acc (auto-start)                          │
│  └── PR closed → Stop play14-api-acc                                │
│                                                                      │
│  PR to main (packages/web/**)                                        │
│  ├── Lint & type check                                               │
│  ├── Unit tests                                                      │
│  ├── Build Next.js                                                   │
│  ├── Build & push Docker image                                       │
│  ├── Deploy to play14-ui-acc (auto-start)                           │
│  └── PR closed → Stop play14-ui-acc                                 │
│                                                                      │
│  Push to main (packages/api/**)                                      │
│  ├── Type check                                                      │
│  ├── Build Strapi admin                                              │
│  ├── Build & push Docker image                                       │
│  ├── Deploy to play14-api                                           │
│  └── Health check                                                    │
│                                                                      │
│  Push to main (packages/web/**)                                      │
│  ├── Lint & type check                                               │
│  ├── Build Next.js                                                   │
│  ├── Build & push Docker image                                       │
│  ├── Deploy to play14-ui                                            │
│  └── Health check                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Image Tagging Strategy

| Tag | Description |
|-----|-------------|
| `prod` / `acc` | Environment marker |
| `latest` | Most recent production build |
| `<short-sha>` | 7-character commit hash |
| `<full-sha>` | Full commit hash |
| `pr-<number>` | PR-specific tag |
| `pr-<number>-<sha>` | PR + commit specific |

### 2.3 Deployment Triggers

| Trigger | API Workflow | Web Workflow |
|---------|--------------|--------------|
| Push to `main` + `packages/api/**` | Production deploy | - |
| Push to `main` + `packages/web/**` | - | Production deploy |
| PR to `main` + `packages/api/**` | Acceptance deploy | - |
| PR to `main` + `packages/web/**` | - | Acceptance deploy |
| PR closed | Stop acceptance | Stop acceptance |
| `workflow_dispatch` | Manual trigger | Manual trigger |

---

## 3. Environment Variables

### 3.1 API Package (`packages/api`)

#### Core Configuration

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `NODE_ENV` | Environment mode | `production` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `1337` |
| `PUBLIC_URL` | Public API URL | `https://community.play14.org` |
| `CRON_ENABLED` | Enable scheduled tasks | `true` |

#### Database

| Variable | Description |
|----------|-------------|
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_HOST` | Azure PostgreSQL FQDN |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | Database name |
| `DATABASE_USERNAME` | Database user |
| `DATABASE_PASSWORD` | Database password (secret) |
| `DATABASE_SSL` | `true` |
| `DATABASE_SSL_SELF` | `false` |

#### Security & Authentication

| Variable | Description |
|----------|-------------|
| `APP_KEYS` | Session encryption keys (comma-separated, secret) |
| `API_TOKEN_SALT` | Salt for API tokens (secret) |
| `ADMIN_JWT_SECRET` | Admin panel JWT secret (secret) |
| `JWT_SECRET` | User JWT secret (secret) |
| `TRANSFER_TOKEN_SALT` | Transfer token salt (secret) |

#### Azure Storage

| Variable | Description |
|----------|-------------|
| `STORAGE_ACCOUNT` | Azure storage account name |
| `STORAGE_ACCOUNT_KEY` | Storage account key (secret) |
| `STORAGE_CONTAINER_NAME` | Blob container name |
| `STORAGE_URL` | Storage base URL |
| `STORAGE_CDN_URL` | CDN URL for assets |

#### Stripe (Ticketing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (secret) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Platform webhook signing secret (secret) |
| `STRIPE_WEBHOOK_SECRET_CONNECT` | Connected accounts webhook signing secret (secret) |
| `STRIPE_PLATFORM_FEE_PERCENT` | Platform fee percentage (`0` for non-profit) |

#### Email (Resend)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (secret) |
| `RESEND_DEFAULT_FROM` | Default sender email |
| `RESEND_REPLY_TO` | Reply-to address |
| `EMAIL_ADMIN_RECIPIENTS` | Admin notification emails |
| `FRONTEND_URL` | Frontend URL for email links |

#### GitHub Integration

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT for triggering rebuilds (secret) |
| `GITHUB_OWNER` | GitHub organization |
| `GITHUB_REPO` | GitHub repository |
| `GITHUB_WORKFLOW_ID` | Workflow ID to trigger |
| `GITHUB_BRANCH` | Branch to trigger |

#### Mapbox

| Variable | Description |
|----------|-------------|
| `STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN` | Mapbox token for admin panel (secret) |

#### Redis Cache

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Azure Cache for Redis connection string (secret) |

### 3.2 Web Package (`packages/web`)

| Variable | Description | Build/Runtime |
|----------|-------------|---------------|
| `STRAPI_API_URL` | Backend API URL | Runtime |
| `STRAPI_API_SECRET` | API authentication token | Runtime (secret) |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox token (client-side) | Build-time |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL | Build-time |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile key | Build-time |
| `FEATURE_LOGIN_ENABLED` | Enable login feature | Build-time |

**Note**: `NEXT_PUBLIC_*` variables are bundled at build time by Next.js and baked into the Docker image.

---

## 4. GitHub Actions Secrets & Variables

### 4.1 Repository Secrets

| Secret | Used By |
|--------|---------|
| `AZURE_CLIENT_ID` | Azure OIDC authentication |
| `AZURE_TENANT_ID` | Azure OIDC authentication |
| `AZURE_SUBSCRIPTION_ID` | Azure OIDC authentication |
| `STRAPI_API_SECRET` | Web deployment |
| `STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN` | API build |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Web build |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Web build (acceptance) |

### 4.2 Repository Variables

| Variable | Environment | Value |
|----------|-------------|-------|
| `STRAPI_API_URL` | Production | `https://community.play14.org` |
| `STRAPI_API_URL` | Acceptance | Acceptance API URL |

---

## 5. Stripe Configuration

### 5.1 Dual Webhook Architecture

The platform uses **two webhook signing secrets** for different event sources:

| Webhook Type | Secret Variable | Events From |
|--------------|-----------------|-------------|
| **Platform** | `STRIPE_WEBHOOK_SECRET` | Your Stripe account |
| **Connect** | `STRIPE_WEBHOOK_SECRET_CONNECT` | Connected host accounts |

Both webhooks point to the same endpoint: `POST /api/webhooks/stripe`

### 5.2 Required Webhook Events

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Payment successful |
| `checkout.session.expired` | Checkout abandoned |
| `payment_intent.payment_failed` | Payment failed |
| `charge.refunded` | Refund processed |
| `account.updated` | Connect account status change |

### 5.3 Stripe Connect Setup

Hosts connect their Stripe Express accounts through:
1. Admin Panel → My Profile → Stripe tab
2. Click "Connect with Stripe"
3. Complete Stripe Express onboarding

---

## 6. OAuth Providers

OAuth providers are configured in **Strapi Admin UI** (not environment variables):

**Settings → Users & Permissions → Providers**

| Provider | Callback URL |
|----------|--------------|
| GitHub | `https://play14.org/connect/github/redirect` |
| Google | `https://play14.org/connect/google/redirect` |
| LinkedIn | `https://play14.org/connect/linkedin/redirect` |
| Microsoft | `https://play14.org/connect/microsoft/redirect` |

---

## 7. Content Types

### 7.1 Core Content Types

| Content Type | Description |
|--------------|-------------|
| `event` | Community events with scheduling, ticketing, and finance |
| `player` | Player profiles with positions and visibility |
| `venue` | Event venues with geolocation |
| `game` | Agile games catalog |
| `article` | Blog posts and news |

### 7.2 Ticketing Content Types

| Content Type | Description |
|--------------|-------------|
| `ticket-type` | Ticket tiers with pricing and availability |
| `ticket` | Individual purchased tickets |
| `ticket-order` | Purchase orders |
| `discount-code` | Promo codes and discounts |
| `stripe-account` | Connected Stripe accounts for hosts |
| `processed-webhook` | Webhook idempotency tracking |

### 7.3 Claims Content Types

| Content Type | Description |
|--------------|-------------|
| `player-claim` | Player profile ownership claims |
| `attendance-claim` | Event attendance verification claims |

### 7.4 Finance Content Types

| Content Type | Description |
|--------------|-------------|
| `budget-line-item` | Event budget planning items |
| `result-line-item` | Event financial results |

---

## 8. Docker Images

### 8.1 API Dockerfile

- **Base**: `oven/bun:1.3.5-alpine`
- **Runtime deps**: `vips-dev` (image processing), `nodejs`
- **Port**: 1337
- **CMD**: `strapi start`
- **Context**: Project root (needs `node_modules` and `packages/api`)

### 8.2 Web Dockerfile

- **Base**: `oven/bun:1.3.5-alpine`
- **Output**: Next.js standalone build
- **Port**: 3000
- **CMD**: `bun packages/web/server.js`
- **Context**: `packages/web` (with pre-built `.next` output)
- **Health check**: Built-in at `/api/health`

---

## 9. Deployment Commands

### 9.1 Manual Azure CLI Commands

```bash
# Check container app status
az containerapp show --name play14-api --resource-group play14-community

# View logs
az containerapp logs show --name play14-api --resource-group play14-community --follow

# Update image manually
az containerapp update \
  -n play14-api \
  -g play14-community \
  --image play14containerregistry.azurecr.io/play14/play14-api:<tag>

# Start/stop acceptance environment
az rest --method post \
  --url "/subscriptions/<sub-id>/resourceGroups/play14-community/providers/Microsoft.App/containerApps/play14-api-acc/start?api-version=2024-03-01"

az rest --method post \
  --url "/subscriptions/<sub-id>/resourceGroups/play14-community/providers/Microsoft.App/containerApps/play14-api-acc/stop?api-version=2024-03-01"
```

### 9.2 Stripe CLI (Local Testing)

```bash
# Forward webhooks to local API
stripe listen --forward-to localhost:1337/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

---

## 10. Health Checks & Probes

### 10.1 Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| API | `/_health` | 200 or 204 |
| Web | `/api/health` | 200 JSON |

### 10.2 Azure Container Apps Health Probes

Both API and Web container apps have three types of health probes configured:

| Probe | Purpose | Behavior on Failure |
|-------|---------|---------------------|
| **Startup** | Allow time for app initialization | Prevents liveness/readiness until app starts |
| **Readiness** | Check if ready for traffic | Removes from load balancer temporarily |
| **Liveness** | Detect deadlocked processes | Restarts container |

### 10.3 API Probe Configuration

Configured in `packages/api/iac/main.bicep`:

| Probe | Endpoint | Timing | Purpose |
|-------|----------|--------|---------|
| Startup | `/_health` | 90s window (30×3s) | Allow DB migrations |
| Readiness | `/_health` | 10s interval, 3 failures | Ensure API is ready |
| Liveness | `/_health` | 30s interval, 3 failures | Restart if stuck |

### 10.4 Web Probe Configuration

Configured via Azure CLI in deployment workflows:

| Probe | Endpoint | Timing | Purpose |
|-------|----------|--------|---------|
| Startup | `/api/health` | 60s window (20×3s) | Allow Next.js init |
| Readiness | `/api/health` | 10s interval, 3 failures | Ensure app is ready |
| Liveness | `/api/health` | 30s interval, 3 failures | Restart if stuck |

### 10.5 Monitoring Probes

```bash
# Check probe status in Azure Portal
# Container Apps → <app-name> → Revisions → Health

# View probe-related logs
az containerapp logs show -n play14-api -g play14-community --follow | grep -i probe
```

---

## 11. Monitoring

### 11.1 Azure

- Container Apps built-in metrics
- Log Analytics workspace integration
- Application Insights (if configured)

---

## 12. Rollback Procedure

1. **Identify last working image** from Azure Container Registry
2. **Update container app** with previous image tag:
   ```bash
   az containerapp update \
     -n play14-api \
     -g play14-community \
     --image play14containerregistry.azurecr.io/play14/play14-api:<previous-sha>
   ```
3. **Verify health check** passes
4. **Investigate** the failing deployment

---

## 13. Security Considerations

### 13.1 Authentication

- Azure OIDC for CI/CD (no stored credentials)
- Workload identity for container registry access
- JWT tokens with secure secrets for API auth

### 13.2 Secrets Management

- GitHub Secrets for CI/CD
- Azure Container Apps secrets (referenced by `secretref:`)
- Never commit secrets to repository

### 13.3 Stripe Security

- Webhook signature verification with dual secrets
- PCI DSS compliance via Stripe Checkout (hosted)
- No raw card data stored

---

## 14. Redis Cache

### 14.1 Overview

Azure Cache for Redis provides a shared cache layer accessible by all API replicas. This enables consistent caching across scaled-out instances.

### 14.2 Configuration

| Setting | Value |
|---------|-------|
| **Service** | Azure Cache for Redis |
| **SKU** | Basic C0 (250 MB) |
| **Port** | 6380 (SSL) |
| **Protocol** | `rediss://` (TLS enabled) |

### 14.3 Connection String Format

```
rediss://:<access-key>@<redis-name>.redis.cache.windows.net:6380
```

### 14.4 Adding to Container App

```bash
# Add connection string as a secret
az containerapp secret set \
  --name play14-api \
  --resource-group play14-community \
  --secrets "redis-url=rediss://:<access-key>@<redis-name>.redis.cache.windows.net:6380"

# Add environment variable referencing the secret
az containerapp update \
  --name play14-api \
  --resource-group play14-community \
  --set-env-vars "REDIS_URL=secretref:redis-url"
```

### 14.5 Usage in Code

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Set with expiration (1 hour)
await redis.set('key', 'value', 'EX', 3600);

// Get value
const value = await redis.get('key');
```

### 14.6 Use Cases

| Use Case | Description |
|----------|-------------|
| **API Response Caching** | Cache expensive queries across replicas |
| **Rate Limiting** | Distributed rate limiting counters |
| **Session Storage** | Shared session state (if needed) |
| **Job Queues** | Background job coordination |

---

## 15. Support Contacts

| Issue | Contact |
|-------|---------|
| Stripe Support | https://support.stripe.com |
| Resend Support | https://resend.com/support |
| Azure Support | Azure Portal → Help + Support |
