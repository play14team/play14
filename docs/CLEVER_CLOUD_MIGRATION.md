# Migration Plan: Azure Container Apps → Clever Cloud

## Executive Summary

Migration of the #play14 community platform from Azure Container Apps to Clever Cloud, implementing automatic production deployments and on-demand PR preview environments with dedicated resources.

**Current State:**
- Azure Container Apps with Bicep IaC
- Monorepo: Strapi 5 API + Next.js 16 Web
- Azure PostgreSQL + Azure Blob Storage + (implicit) Redis
- GitHub Actions with federated OIDC auth
- Production domains: community.play14.org (API), play14.org (Web)

**Target State:**
- Clever Cloud Node.js apps with Bun runtime
- Separate apps per PR (play14-api-pr-123, play14-web-pr-123)
- PostgreSQL addon + Redis addon + Cellar (S3) addon
- GitHub Actions with Clever Cloud CLI
- Immediate cleanup on PR merge/close
- **Staged rollout domains:**
  - **Phase 1 (parallel environment):** new.api.play14.org (API), new.play14.org (Web)
  - **Phase 2 (cutover):** community.play14.org (API), play14.org (Web)

**Migration Strategy:**
- Use **Strapi export/import** for data migration (includes media library)
- **Scripted infrastructure** provisioning (idempotent, version-controlled)
- **Parallel environments** running simultaneously during validation
- **DNS-only cutover** (zero code changes needed for go-live)

---

## Implementation Steps

### 1. Clever Cloud Setup & Infrastructure Provisioning Script (Week 1)

**1.1 Install Clever Tools CLI**
```bash
npm install -g clever-tools
```

**1.2 Generate API Tokens**
- Go to Clever Cloud Console → Profile → Tokens
- Create token named "GitHub Actions"
- Save `CLEVER_TOKEN` and `CLEVER_SECRET` (expires in 1 year)
- **Set calendar reminder**: Token expires 2026-02-04, must refresh

**1.3 Set GitHub Secrets**
```bash
gh secret set CLEVER_TOKEN -b "<token>"
gh secret set CLEVER_SECRET -b "<secret>"
gh secret set CLEVER_ORG_ID -b "<org-id>"
```

**1.4 Test Clever Cloud Access**
```bash
clever login --token $CLEVER_TOKEN --secret $CLEVER_SECRET
clever applications --org $CLEVER_ORG_ID
```

**1.5 Create Infrastructure Provisioning Script**

Create script: `scripts/clever-cloud/provision-production.sh`

This script will be **idempotent** (safe to run multiple times) and version-controlled.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
CLEVER_ORG_ID="${CLEVER_ORG_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-production}"
API_APP_NAME="play14-api-${ENVIRONMENT}"
WEB_APP_NAME="play14-web-${ENVIRONMENT}"
DB_ADDON_NAME="play14-db-${ENVIRONMENT}"
REDIS_ADDON_NAME="play14-redis-${ENVIRONMENT}"
CELLAR_ADDON_NAME="play14-storage-${ENVIRONMENT}"
CELLAR_BUCKET="play14-uploads-${ENVIRONMENT}"

# Domains (staging vs production)
if [ "$ENVIRONMENT" = "production" ]; then
  API_DOMAIN="new.api.play14.org"
  WEB_DOMAINS=("new.play14.org")
else
  API_DOMAIN="${ENVIRONMENT}.api.play14.org"
  WEB_DOMAINS=("${ENVIRONMENT}.play14.org")
fi

echo "🚀 Provisioning Clever Cloud infrastructure for: $ENVIRONMENT"
echo "   Organization: $CLEVER_ORG_ID"

# Function: Check if app exists
app_exists() {
  clever applications --org "$CLEVER_ORG_ID" | grep -q "$1" || return 1
}

# Function: Check if addon exists
addon_exists() {
  clever addon list --org "$CLEVER_ORG_ID" | grep -q "$1" || return 1
}

# 1. Create PostgreSQL addon
if addon_exists "$DB_ADDON_NAME"; then
  echo "✓ PostgreSQL addon already exists: $DB_ADDON_NAME"
else
  echo "📦 Creating PostgreSQL addon: $DB_ADDON_NAME"
  clever addon create postgresql-addon "$DB_ADDON_NAME" \
    --plan <PLAN> \
    --org "$CLEVER_ORG_ID" \
    --region par \
    --yes
fi

# 2. Create Redis addon
if addon_exists "$REDIS_ADDON_NAME"; then
  echo "✓ Redis addon already exists: $REDIS_ADDON_NAME"
else
  echo "📦 Creating Redis addon: $REDIS_ADDON_NAME"
  clever addon create redis-addon "$REDIS_ADDON_NAME" \
    --plan <PLAN> \
    --org "$CLEVER_ORG_ID" \
    --region par \
    --yes
fi

# 3. Create Cellar addon
if addon_exists "$CELLAR_ADDON_NAME"; then
  echo "✓ Cellar addon already exists: $CELLAR_ADDON_NAME"
else
  echo "📦 Creating Cellar addon: $CELLAR_ADDON_NAME"
  clever addon create cellar-addon "$CELLAR_ADDON_NAME" \
    --org "$CLEVER_ORG_ID" \
    --region par \
    --yes

  # Create S3 bucket
  echo "📦 Creating S3 bucket: $CELLAR_BUCKET"
  # Get Cellar credentials and create bucket via AWS CLI
  # (credentials will be auto-injected as env vars when linked)
fi

# 4. Create API application
if app_exists "$API_APP_NAME"; then
  echo "✓ API app already exists: $API_APP_NAME"
else
  echo "🚀 Creating API app: $API_APP_NAME"
  clever create "$API_APP_NAME" \
    --type node \
    --org "$CLEVER_ORG_ID" \
    --region par \
    --alias "$API_APP_NAME"
fi

# 5. Link addons to API
echo "🔗 Linking addons to API..."
clever link "$API_APP_NAME" --org "$CLEVER_ORG_ID"
clever service link-addon "$API_APP_NAME" "$DB_ADDON_NAME" || echo "Already linked"
clever service link-addon "$API_APP_NAME" "$REDIS_ADDON_NAME" || echo "Already linked"
clever service link-addon "$API_APP_NAME" "$CELLAR_ADDON_NAME" || echo "Already linked"

# 6. Configure API environment variables
echo "⚙️  Configuring API environment variables..."
source "./scripts/clever-cloud/env-vars-api-${ENVIRONMENT}.sh"
configure_api_env_vars

# 7. Add API custom domain
echo "🌐 Adding API domain: $API_DOMAIN"
clever domain add "$API_DOMAIN" --app "$API_APP_NAME" || echo "Domain already added"

# 8. Create Web application
if app_exists "$WEB_APP_NAME"; then
  echo "✓ Web app already exists: $WEB_APP_NAME"
else
  echo "🚀 Creating Web app: $WEB_APP_NAME"
  clever create "$WEB_APP_NAME" \
    --type node \
    --org "$CLEVER_ORG_ID" \
    --region par \
    --alias "$WEB_APP_NAME"
fi

# 9. Link database to Web (for session management if needed)
echo "🔗 Linking database to Web..."
clever link "$WEB_APP_NAME" --org "$CLEVER_ORG_ID"
clever service link-addon "$WEB_APP_NAME" "$DB_ADDON_NAME" || echo "Already linked"

# 10. Configure Web environment variables
echo "⚙️  Configuring Web environment variables..."
source "./scripts/clever-cloud/env-vars-web-${ENVIRONMENT}.sh"
configure_web_env_vars

# 11. Add Web custom domains
for domain in "${WEB_DOMAINS[@]}"; do
  echo "🌐 Adding Web domain: $domain"
  clever domain add "$domain" --app "$WEB_APP_NAME" || echo "Domain already added"
done

echo "✅ Infrastructure provisioning complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure DNS records in CloudFlare:"
echo "      - $API_DOMAIN CNAME → (get from: clever domain --app $API_APP_NAME)"
for domain in "${WEB_DOMAINS[@]}"; do
  echo "      - $domain CNAME → (get from: clever domain --app $WEB_APP_NAME)"
done
echo "   2. Deploy applications: clever deploy --app $API_APP_NAME"
echo "   3. Verify health checks"
```

**1.6 Create Environment Variable Configuration Scripts**

Create `scripts/clever-cloud/env-vars-api-production.sh`:

```bash
#!/usr/bin/env bash

configure_api_env_vars() {
  local app="play14-api-production"

  # Build configuration
  clever env set NODE_ENV production --app "$app"
  clever env set CC_NODE_VERSION 22 --app "$app"
  clever env set APP_FOLDER packages/api --app "$app"
  clever env set CC_PRE_BUILD_HOOK "npm install -g bun@1.3.5 && bun install --frozen-lockfile && cd packages/api && bun run build" --app "$app"
  clever env set CC_RUN_COMMAND "bun run start" --app "$app"

  # Database (auto-injected, aliased for consistency)
  clever env set DATABASE_HOST '${POSTGRESQL_ADDON_HOST}' --app "$app"
  clever env set DATABASE_PORT '${POSTGRESQL_ADDON_PORT}' --app "$app"
  clever env set DATABASE_NAME '${POSTGRESQL_ADDON_DB}' --app "$app"
  clever env set DATABASE_USERNAME '${POSTGRESQL_ADDON_USER}' --app "$app"
  clever env set DATABASE_PASSWORD '${POSTGRESQL_ADDON_PASSWORD}' --app "$app"
  clever env set DATABASE_SSL true --app "$app"

  # Redis
  clever env set REDIS_URL 'redis://${REDIS_ADDON_HOST}:${REDIS_ADDON_PORT}' --app "$app"

  # Cellar S3
  clever env set CELLAR_BUCKET play14-uploads-production --app "$app"

  # Server settings
  clever env set HOST 0.0.0.0 --app "$app"
  clever env set PORT 1337 --app "$app"
  clever env set TZ UTC --app "$app"

  # URLs (IMPORTANT: staging domains during parallel phase)
  clever env set PUBLIC_URL "https://new.api.play14.org" --app "$app"
  clever env set FRONTEND_URL "https://new.play14.org" --app "$app"

  # Cache & Cron
  clever env set CACHE_ENABLED true --app "$app"
  clever env set CACHE_PROVIDER redis --app "$app"
  clever env set CRON_ENABLED true --app "$app"

  # CORS (IMPORTANT: include both staging and production domains)
  clever env set ALLOWED_ORIGINS "https://new.play14.org,https://play14.org,https://www.play14.org" --app "$app"

  echo "⚠️  WARNING: Secrets not set (must be configured manually or via CI/CD):"
  echo "   - APP_KEYS, ADMIN_JWT_SECRET, JWT_SECRET, API_TOKEN_SALT, TRANSFER_TOKEN_SALT"
  echo "   - STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN"
  echo "   - RESEND_API_KEY"
  echo "   - GITHUB_TOKEN"
  echo "   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET_CONNECT"
  echo "   - SENTRY_DSN"
}
```

Create `scripts/clever-cloud/env-vars-web-production.sh` (similar structure).

---

### 2. Data Migration Strategy: Strapi Export/Import (Week 2)

**2.1 Understanding Strapi Export/Import**

Strapi v5 provides built-in export/import commands that handle:
- All content types (including media metadata)
- Media files (actual uploads)
- Relations and complex data structures
- Configuration (optional)

**Advantages over manual migration:**
- Single command for data + media
- No SQL knowledge required
- Preserves all relations and structure
- Handles large datasets with streaming

**2.2 Export from Azure Production**

Connect to current Azure Strapi API and run export:

```bash
# Option 1: Via SSH/console access to Azure Container App
az containerapp exec \
  -n play14-api \
  -g play14-community \
  --command "/bin/sh"

# Inside container:
cd /app
strapi export \
  --file /tmp/play14-export-$(date +%Y%m%d-%H%M%S).tar.gz \
  --encrypt \
  --key "$EXPORT_ENCRYPTION_KEY"

# Download export file
az containerapp exec \
  -n play14-api \
  -g play14-community \
  --command "cat /tmp/play14-export-*.tar.gz" > play14-export.tar.gz

# Option 2: Add export endpoint to Strapi admin API (recommended)
# Or run export locally against production database with read-only credentials
```

**Alternative approach: Run export locally**

```bash
# Clone production database to local (read-only)
pg_dump -h play14-pg.postgres.database.azure.com \
  -U <readonly-user> \
  -d play14_prod \
  --no-owner --no-privileges \
  -F c -f local-db-backup.dump

# Start local Strapi with production database (read-only mode)
# Set DATABASE_SSL=true, DATABASE_HOST=play14-pg.postgres...

# Run export
cd packages/api
strapi export \
  --file ../../exports/play14-export-$(date +%Y%m%d).tar.gz \
  --encrypt \
  --key "$EXPORT_ENCRYPTION_KEY"
```

**Export file contents:**
- `/data`: JSON files for each content type
- `/media`: All uploaded files from media library
- `/schemas`: Content type definitions (optional)

**2.3 Provision Clever Cloud Infrastructure**

Run provisioning script:

```bash
# Set environment variables
export CLEVER_ORG_ID="<org-id>"
export ENVIRONMENT="production"

# Run provisioning script
bash scripts/clever-cloud/provision-production.sh
```

This creates:
- PostgreSQL addon (empty database)
- Redis addon
- Cellar S3 addon + bucket
- API app (not deployed yet)
- Web app (not deployed yet)
- All environment variables configured
- Custom domains added: new.api.play14.org, new.play14.org

**2.4 Configure DNS for Staging Domains**

In CloudFlare DNS, add CNAME records:

```
new.api.play14.org CNAME → app-XXX.cleverapps.io (from clever domain --app play14-api-production)
new.play14.org CNAME → app-YYY.cleverapps.io (from clever domain --app play14-web-production)
```

**2.5 Deploy Initial Empty Strapi to Clever Cloud**

```bash
# Deploy API (will fail health checks until data is imported, that's OK)
clever deploy --app play14-api-production --force

# Wait for build to complete
clever logs --app play14-api-production --before-deploy
```

**2.6 Import Data to Clever Cloud Strapi**

```bash
# Option 1: Upload export file to Clever Cloud app via SFTP
# (Clever Cloud provides SFTP access to app filesystem)

# Option 2: Run import via clever ssh command
clever ssh --app play14-api-production

# Inside Clever Cloud container:
cd /app/packages/api
strapi import \
  --file /tmp/play14-export-YYYYMMDD.tar.gz \
  --key "$EXPORT_ENCRYPTION_KEY"

# Option 3: Run import locally against Clever Cloud database
# Set DATABASE_HOST=${POSTGRESQL_ADDON_HOST} from Clever Cloud
# This requires PostgreSQL addon to be accessible externally (may need to configure)
```

**2.7 Verify Data Migration**

```bash
# Check database row counts
psql -h $POSTGRESQL_ADDON_HOST \
  -U $POSTGRESQL_ADDON_USER \
  -d $POSTGRESQL_ADDON_DB \
  -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC;"

# Check media library via Strapi admin
open https://new.api.play14.org/admin

# Verify files uploaded to Cellar
aws s3 ls s3://play14-uploads-production/assets/ --recursive \
  --endpoint-url https://cellar-c2.services.clever-cloud.com
```

**2.8 Restart API After Import**

```bash
clever restart --app play14-api-production --without-cache
```

---

### 3. Strapi Storage Plugin Migration (Week 2)

**3.1 Install Cellar Plugin**
```bash
cd packages/api
bun add strapi-provider-upload-clevercloud-cellar
bun remove strapi-provider-upload-azure-storage
```

**3.2 Update Plugin Configuration**

File: [packages/api/config/plugins.ts:117-131](packages/api/config/plugins.ts#L117-L131)

Replace Azure Blob Storage configuration:
```typescript
upload: {
  config: {
    provider: "strapi-provider-upload-clevercloud-cellar",
    providerOptions: {
      host: env("CELLAR_ADDON_HOST", "cellar-c2.services.clever-cloud.com"),
      accessKeyId: env("CELLAR_ADDON_KEY_ID"),
      secretAccessKey: env("CELLAR_ADDON_KEY_SECRET"),
      bucket: env("CELLAR_BUCKET", "play14-uploads-prod"),
      region: env("CELLAR_ADDON_REGION", "fr-par"),
      defaultPath: "assets",
      maxConcurrent: 10,
    },
  },
}
```

**3.3 Test Locally**
```bash
# Set Cellar credentials in packages/api/.env.local
CELLAR_ADDON_HOST=cellar-c2.services.clever-cloud.com
CELLAR_ADDON_KEY_ID=<key>
CELLAR_ADDON_KEY_SECRET=<secret>
CELLAR_BUCKET=play14-uploads-prod

# Start API
bun --filter play14-api develop

# Test upload via Strapi admin panel
# Verify file appears in Cellar: aws s3 ls s3://play14-uploads-prod/assets/
```

---

### 4. GitHub Actions Workflows (Week 3)

**4.1 Create Production Deployment Workflow**

File: [.github/workflows/clever-production-deployment.yml](.github/workflows/clever-production-deployment.yml) (new file)

```yaml
name: Production Deployment (Clever Cloud)

on:
  push:
    branches: [main]
    paths:
      - "packages/api/**"
      - "packages/web/**"
  workflow_dispatch:

concurrency:
  group: production-deployment
  cancel-in-progress: false

jobs:
  detect-changes:
    # Same as current production-deployment.yml:33-78

  validate:
    # Same as current production-deployment.yml:83-116

  api-deploy:
    name: Deploy API
    runs-on: ubuntu-latest
    needs: [detect-changes, validate]
    if: |
      needs.detect-changes.outputs.api-changed == 'true' &&
      needs.validate.result == 'success'
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Clever Tools
        run: npm install -g clever-tools

      - name: Login to Clever Cloud
        run: clever login --token ${{ secrets.CLEVER_TOKEN }} --secret ${{ secrets.CLEVER_SECRET }}

      - name: Deploy API
        run: |
          clever link play14-api-prod --org ${{ secrets.CLEVER_ORG_ID }}
          clever deploy --force

      - name: Wait for deployment
        run: sleep 30

      - name: Health check
        run: |
          URL=$(clever domain --app play14-api-prod | head -n1)
          for i in {1..30}; do
            if curl -sf https://$URL/_health; then
              echo "API is healthy"
              exit 0
            fi
            sleep 10
          done
          exit 1

  web-deploy:
    name: Deploy Web
    runs-on: ubuntu-latest
    needs: [detect-changes, validate, api-deploy]
    if: |
      needs.detect-changes.outputs.web-changed == 'true' &&
      needs.validate.result == 'success' &&
      (needs.api-deploy.result == 'success' || needs.api-deploy.result == 'skipped')
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Clever Tools
        run: npm install -g clever-tools

      - name: Login to Clever Cloud
        run: clever login --token ${{ secrets.CLEVER_TOKEN }} --secret ${{ secrets.CLEVER_SECRET }}

      - name: Deploy Web
        run: |
          clever link play14-web-prod --org ${{ secrets.CLEVER_ORG_ID }}
          clever deploy --force

      - name: Wait for deployment
        run: sleep 30

      - name: Health check
        run: |
          URL=$(clever domain --app play14-web-prod | head -n1)
          for i in {1..30}; do
            if curl -sf https://$URL/api/health; then
              echo "Web is healthy"
              exit 0
            fi
            sleep 10
          done
          exit 1
```

**4.2 Create PR Deployment Workflow**

File: [.github/workflows/clever-pr-deployment.yml](.github/workflows/clever-pr-deployment.yml) (new file)

Key differences from Azure version:
- Create apps with `clever create play14-api-pr-${{ github.event.pull_request.number }}`
- Create addons with `clever addon create postgresql-addon play14-db-pr-${{ github.event.pull_request.number }}`
- Link addons with `clever service link-addon`
- Set environment variables with `clever env set`
- Deploy with `clever deploy --force`
- Cleanup with `clever delete` and `clever addon delete`

**Structure:**
```yaml
jobs:
  cleanup-pr:
    # Runs on PR close
    # Delete API app, Web app, PostgreSQL addon, Redis addon

  detect-changes:
    # Same as Azure version

  validate:
    # Same as Azure version

  create-or-update-pr:
    # Create apps and addons if not exist
    # Update environment variables
    # Deploy API and Web

  deployment-summary:
    # Post PR comment with URLs
```

**Note on Cellar Storage:**
- Share production Cellar bucket with PR-specific paths: `assets/pr-{number}/`
- Set `CELLAR_BUCKET=play14-uploads-prod` for all PR environments

**Note on PR Database Backup/Restore Workflow:**

Clever Cloud PostgreSQL addons **do not have native standby/pause**. Implementation strategy:

**On PR Close:**
1. Export database to backup file:
   ```bash
   pg_dump -h $POSTGRESQL_ADDON_HOST \
     -U $POSTGRESQL_ADDON_USER \
     -d $POSTGRESQL_ADDON_DB \
     --no-owner --no-privileges \
     -F c -f pr-${{ github.event.pull_request.number }}-backup.dump
   ```

2. Upload backup to Cellar S3:
   ```bash
   aws s3 cp pr-${{ github.event.pull_request.number }}-backup.dump \
     s3://play14-uploads-prod/pr-backups/ \
     --endpoint-url https://cellar-c2.services.clever-cloud.com
   ```

3. Delete PostgreSQL addon:
   ```bash
   clever addon delete play14-db-pr-${{ github.event.pull_request.number }} --yes
   ```

**On PR Reopen:**
1. Create new PostgreSQL addon:
   ```bash
   clever addon create postgresql-addon play14-db-pr-${{ github.event.pull_request.number }} \
     --plan DEV --org $CLEVER_ORG_ID --region par --yes
   ```

2. Download backup from Cellar:
   ```bash
   aws s3 cp s3://play14-uploads-prod/pr-backups/pr-${{ github.event.pull_request.number }}-backup.dump . \
     --endpoint-url https://cellar-c2.services.clever-cloud.com
   ```

3. Restore database:
   ```bash
   pg_restore -h $POSTGRESQL_ADDON_HOST \
     -U $POSTGRESQL_ADDON_USER \
     -d $POSTGRESQL_ADDON_DB \
     --no-owner --no-privileges \
     pr-${{ github.event.pull_request.number }}-backup.dump
   ```

**Advantages:**
- Zero cost when PR is closed (no running addon)
- PR data preserved in Cellar (cheap S3 storage)
- Fast restoration if PR is reopened
- Backups can be kept for 30 days, then auto-deleted (S3 lifecycle policy)

---

### 5. Parallel Environment Validation (Week 3-4)

**Phase: Both environments running side-by-side**

**5.1 Initial Deployment to Clever Cloud**

Deploy to staging domains (new.api.play14.org, new.play14.org):

```bash
# Deploy API
clever deploy --app play14-api-production --force

# Wait for deployment
clever logs --app play14-api-production --follow

# Deploy Web
clever deploy --app play14-web-production --force
clever logs --app play14-web-production --follow
```

**5.2 Verification Checklist (Staging Domains)**

Test on **https://new.api.play14.org** and **https://new.play14.org**:

- [ ] API health endpoint responds (https://new.api.play14.org/_health)
- [ ] Strapi admin panel loads and authenticates
- [ ] Database queries execute correctly (verify imported data)
- [ ] Redis cache operational (check via `clever env | grep REDIS`)
- [ ] Cellar file uploads work (test avatar upload in admin)
- [ ] Cellar file downloads work (verify URLs resolve correctly)
- [ ] Cron jobs execute on schedule (check logs after 5 mins)
- [ ] Email sending via Resend successful (test welcome email)
- [ ] Stripe webhooks received (update webhook URL in Stripe dashboard temporarily)
- [ ] Web frontend renders correctly (https://new.play14.org)
- [ ] Server actions fetch data from API
- [ ] Mapbox maps display correctly
- [ ] Event listing and detail pages load
- [ ] Player profiles display with avatars from Cellar
- [ ] No errors in Sentry dashboard
- [ ] Prometheus metrics available (port 9000 via clever logs)

**5.3 Performance Comparison (Staging vs Azure Production)**

Compare metrics between:
- Azure Production: https://community.play14.org
- Clever Cloud Staging: https://new.api.play14.org

Metrics to compare:
- [ ] Page load times (use WebPageTest or Lighthouse)
- [ ] API response times (check Sentry performance monitoring)
- [ ] Database query performance (Strapi query logs)
- [ ] Memory usage (Clever Cloud metrics vs Azure Container Apps)
- [ ] CPU usage
- [ ] Cache hit rates (Redis INFO stats)

**5.4 Parallel Testing Period (1-2 Weeks)**

**Strategy:** Run both environments in parallel, gradually shift test traffic to Clever Cloud

- [ ] Week 1: Internal team testing only on staging domains
- [ ] Week 2: Selected beta users testing on staging domains
- [ ] Monitor error rates daily (Azure vs Clever Cloud Sentry environments)
- [ ] Fix any issues discovered during testing
- [ ] Update environment variables if needed
- [ ] Verify Stripe webhooks work with production keys

**5.5 Pre-Cutover Environment Variable Updates**

**Important:** Before DNS cutover, update environment variables to production domains:

```bash
# Update API environment
clever link play14-api-production
clever env set PUBLIC_URL "https://community.play14.org"
clever env set FRONTEND_URL "https://play14.org"
clever env set ALLOWED_ORIGINS "https://play14.org,https://www.play14.org"

# Update Web environment
clever link play14-web-production
clever env set STRAPI_API_URL "https://community.play14.org"
clever env set NEXT_PUBLIC_SITE_URL "https://play14.org"

# Restart both apps (DO NOT deploy, just restart with new env vars)
clever restart --app play14-api-production
clever restart --app play14-web-production
```

**After restart, apps will still be accessible via:**
- https://new.api.play14.org (via CNAME to cleverapps.io)
- https://new.play14.org

But internal URLs/CORS will be ready for production domains.

---

### 6. DNS Cutover (Week 4-5 - Go Live)

**Strategy:** DNS-only cutover with zero code changes

**6.1 Pre-Cutover Checklist**
- [ ] All staging tests passed (Week 3-4 validation complete)
- [ ] Environment variables updated to production domains
- [ ] Apps restarted with new env vars (apps still on staging domains)
- [ ] Final Strapi export from Azure (verified backup)
- [ ] Clever Cloud apps healthy on staging domains
- [ ] Sentry, Stripe, GitHub integrations configured for production
- [ ] Set DNS TTL to 300s (5 minutes) in CloudFlare 24h before cutover
- [ ] Announce maintenance window to users (30 minutes)
- [ ] Team on standby for rollback
- [ ] Prepare rollback DNS entries in CloudFlare (disabled)

**6.2 Cutover Procedure (30-Minute Maintenance Window)**

**Time T+0: Enable maintenance mode on Azure**
```bash
# Optional: Show maintenance page on Azure
az containerapp update \
  -n play14-ui \
  -g play14-community \
  --set-env-vars MAINTENANCE_MODE=true
```

**Time T+5: Update DNS in CloudFlare**

Get Clever Cloud app domains:
```bash
clever domain --app play14-api-production | head -n1
# Output: app-12345.cleverapps.io

clever domain --app play14-web-production | head -n1
# Output: app-67890.cleverapps.io
```

Update CloudFlare DNS records:
```
community.play14.org CNAME → app-12345.cleverapps.io (change from Azure)
play14.org CNAME → app-67890.cleverapps.io (change from Azure)
www.play14.org CNAME → app-67890.cleverapps.io (change from Azure)
```

**Time T+10: Wait for DNS propagation**
```bash
# Check DNS propagation
dig +short community.play14.org
# Should return: app-12345.cleverapps.io

dig +short play14.org
# Should return: app-67890.cleverapps.io

# Test from multiple locations
curl -I https://community.play14.org/_health
curl -I https://play14.org/api/health
```

**Time T+15: Verify production domains**
```bash
# Monitor health checks
watch -n 5 curl -I https://community.play14.org/_health
watch -n 5 curl -I https://play14.org/api/health
```

**Time T+20: Test end-to-end flows on production domains**
- [ ] Open https://play14.org (should load)
- [ ] Event listing page loads
- [ ] Player profile page loads
- [ ] Strapi admin at https://community.play14.org/admin (login works)
- [ ] Image upload in Strapi (file saved to Cellar)
- [ ] Event registration flow (if applicable)
- [ ] Ticket purchase with Stripe test card (webhooks received)

**Time T+30: Announce migration complete**
- [ ] Post announcement on platform (if applicable)
- [ ] Notify team in Slack/email
- [ ] Update status page

**6.3 Post-Cutover Monitoring (First 24 Hours)**
- [ ] Monitor Sentry error rates (compare to pre-migration baseline)
- [ ] Check Clever Cloud logs for errors (`clever logs -f`)
- [ ] Verify cron jobs running on schedule
- [ ] Monitor database connection pool (`psql -c "SELECT count(*) FROM pg_stat_activity"`)
- [ ] Check Redis cache hit rates (`redis-cli INFO stats`)
- [ ] Test Stripe webhooks with real payments (if any occur)
- [ ] Monitor page load times via RUM (Real User Monitoring)
- [ ] Verify Sentry performance traces show Clever Cloud infrastructure
- [ ] Check for any CORS errors in browser console

**6.4 Update Stripe Webhook URLs (Critical!)**

```bash
# Log into Stripe Dashboard
# Update webhook endpoint URLs:
# OLD: https://community.play14.org/api/webhooks/stripe (Azure, still works via DNS)
# NEW: (no change needed - DNS now points to Clever Cloud!)

# Verify webhook is receiving events
# Test webhook: Send test event from Stripe dashboard
```

**No Stripe changes needed** - webhook URL stays the same, DNS now routes to Clever Cloud!

---

### 7. Azure Decommissioning (Week 5-6)

**Keep Azure running for 1-2 weeks post-migration for rollback safety**

**7.1 Observation Period (Week 5)**
- [ ] Monitor Clever Cloud production for 1 week (no critical issues)
- [ ] Compare costs: Azure vs Clever Cloud (weekly spend)
- [ ] Verify all integrations working (Stripe, Resend, GitHub, Sentry)
- [ ] Confirm no DNS resolution issues
- [ ] Validate cron jobs running reliably
- [ ] Check for any unexpected errors in logs

**7.2 Azure Shutdown (Week 6)**

**Step 1: Stop Azure Container Apps**
```bash
# Stop production apps (reduce costs while keeping data)
az containerapp stop -n play14-api -g play14-community
az containerapp stop -n play14-ui -g play14-community
az containerapp stop -n play14-api-acc -g play14-community
az containerapp stop -n play14-ui-acc -g play14-community
```

**Step 2: Archive Azure Data (Keep for 3 Months)**
```bash
# Export final PostgreSQL backup
pg_dump -h play14-pg.postgres.database.azure.com \
  -U <username> \
  -d play14_prod \
  --no-owner --no-privileges \
  -F c -f azure-final-backup-$(date +%Y%m%d).dump

# Download all Azure Blob Storage (verify against Cellar)
az storage blob download-batch \
  --account-name play14storage \
  --account-key $STORAGE_ACCOUNT_KEY \
  --source strapi_uploads \
  --destination ./azure-blob-archive/

# Create manifest for verification
find ./azure-blob-archive -type f -exec sha256sum {} \; > azure-blob-manifest.txt
```

**Step 3: Delete Azure Resources (After 2 Weeks)**
```bash
# Delete Container Apps
az containerapp delete -n play14-api -g play14-community -y
az containerapp delete -n play14-ui -g play14-community -y
az containerapp delete -n play14-api-acc -g play14-community -y
az containerapp delete -n play14-ui-acc -g play14-community -y

# Delete Container Registry
az acr delete -n play14containerregistry -g play14-community -y

# Delete PostgreSQL (POINT OF NO RETURN - verify backups first!)
az postgres flexible-server delete -n play14-pg -g play14-community -y

# Delete Storage Account (after verifying Cellar has all files)
az storage account delete -n play14storage -g play14-community -y
```

**Step 4: Delete Resource Group (After 1 Month)**
```bash
# Final cleanup
az group delete -n play14-community -y
```

**7.3 Update Documentation**
- [ ] Update [CLAUDE.md](CLAUDE.md):
  - Replace Azure commands with Clever Cloud CLI
  - Update deployment instructions
  - Update environment setup
- [ ] Update [packages/api/CLAUDE.md](packages/api/CLAUDE.md):
  - Replace Azure Container Apps with Clever Cloud
  - Update Cellar storage provider
- [ ] Update [packages/web/CLAUDE.md](packages/web/CLAUDE.md):
  - Update build/deployment instructions
- [ ] Archive Azure Bicep IaC files:
  ```bash
  mkdir -p docs/archive/azure-iac
  mv packages/api/iac/* docs/archive/azure-iac/
  ```
- [ ] Archive old GitHub Actions workflows:
  ```bash
  mkdir -p .github/workflows/archive
  mv .github/workflows/production-deployment.yml .github/workflows/archive/
  mv .github/workflows/pr-deployment.yml .github/workflows/archive/
  ```
- [ ] Create new README section: "Deployment (Clever Cloud)"
- [ ] Update contributing guide with new deployment process

**7.4 Final Cleanup Checklist**
- [ ] Remove Azure CLI from CI/CD workflows
- [ ] Delete Azure service principal (if not used elsewhere)
- [ ] Remove Azure-related GitHub secrets:
  - `AZURE_CLIENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
  - `STORAGE_ACCOUNT_KEY` (if stored)
- [ ] Update team documentation/wiki
- [ ] Notify team of new deployment process
- [ ] Schedule training session on Clever Cloud console/CLI

---

## Infrastructure-as-Code Scripts to Create

All scripts should be version-controlled and idempotent (safe to run multiple times).

### 1. Production Provisioning Script
**File:** `scripts/clever-cloud/provision-production.sh`
- Creates PostgreSQL, Redis, Cellar addons
- Creates API and Web applications
- Links addons to applications
- Configures custom domains
- Calls environment variable configuration scripts
- **Idempotent:** Checks if resources exist before creating

### 2. PR Provisioning Script
**File:** `scripts/clever-cloud/provision-pr.sh`
- Similar to production but with PR-specific naming
- Takes PR number as parameter
- Creates minimal-sized addons (dev plans)
- Shares production Cellar bucket with PR-specific paths
- Used by GitHub Actions PR deployment workflow

### 3. Environment Variable Configuration Scripts

**File:** `scripts/clever-cloud/env-vars-api-production.sh`
- Contains all API environment variables
- Sources secrets from environment or .env file
- Function: `configure_api_env_vars()`

**File:** `scripts/clever-cloud/env-vars-web-production.sh`
- Contains all Web environment variables
- Function: `configure_web_env_vars()`

**File:** `scripts/clever-cloud/env-vars-api-pr.sh` (for PR environments)
**File:** `scripts/clever-cloud/env-vars-web-pr.sh` (for PR environments)

### 4. Data Migration Scripts

**File:** `scripts/clever-cloud/export-strapi-data.sh`
- Exports Strapi data from Azure production
- Creates encrypted tar.gz file
- Uploads to temporary storage (or Cellar)

**File:** `scripts/clever-cloud/import-strapi-data.sh`
- Downloads export file from temporary storage
- Imports to Clever Cloud Strapi
- Verifies import success (row counts, file counts)

### 5. Cleanup Script

**File:** `scripts/clever-cloud/cleanup-pr.sh`
- Deletes PR applications and addons
- Takes PR number as parameter
- Used by GitHub Actions PR cleanup job

### 6. DNS Cutover Checklist

**File:** `scripts/clever-cloud/dns-cutover-checklist.sh`
- Interactive script for DNS cutover day
- Guides through pre-cutover checks
- Provides CNAME values to set in CloudFlare
- Monitors DNS propagation
- Runs post-cutover health checks

---

## Critical Files to Modify

### 1. Strapi Upload Plugin Configuration
**File:** [packages/api/config/plugins.ts:117-131](packages/api/config/plugins.ts#L117-L131)
- Replace `strapi-provider-upload-azure-storage` with `strapi-provider-upload-clevercloud-cellar`
- Update providerOptions to use Cellar environment variables

### 2. Package Dependencies
**File:** [packages/api/package.json](packages/api/package.json)
- Add: `strapi-provider-upload-clevercloud-cellar`
- Remove: `strapi-provider-upload-azure-storage`

### 3. Production Deployment Workflow
**File:** [.github/workflows/production-deployment.yml](.github/workflows/production-deployment.yml)
- Replace Azure CLI (`az containerapp`) with Clever Tools CLI (`clever deploy`)
- Remove Docker build steps (Clever Cloud builds from source)
- Update authentication (OIDC → OAuth tokens)

### 4. PR Deployment Workflow
**File:** [.github/workflows/pr-deployment.yml](.github/workflows/pr-deployment.yml)
- Replace Azure Container Apps with Clever Cloud apps
- Add app/addon creation logic
- Update cleanup logic (delete apps and addons)
- Update PR comment with Clever Cloud URLs

### 5. Database Configuration
**File:** [packages/api/config/database.ts](packages/api/config/database.ts)
- No code changes needed (already uses environment variables)
- Verify SSL configuration works with Clever Cloud PostgreSQL

---

## Rollback Strategy

### Immediate Rollback (< 1 Hour)
If critical failure during DNS cutover:
1. Revert DNS records to Azure Container Apps endpoints
2. Azure infrastructure still running (not deleted yet)
3. No data loss (Azure database unchanged during first week)

### Database Rollback
If data corruption during migration:
1. Restore from pre-migration Azure backup
2. Re-run pg_dump/pg_restore with `--clean` flag
3. Verify checksums and row counts

### Cellar Storage Rollback
If file upload issues:
1. Keep Azure Blob Storage plugin code as fallback
2. Toggle via environment variable: `STORAGE_PROVIDER=azure|cellar`
3. DNS remains at Azure for blob CDN

### Deployment Rollback on Clever Cloud
```bash
# List recent deployments
clever activity --app play14-api-prod

# Rollback to previous commit
clever restart --without-cache --commit <previous-sha>
```

---

## Instance Sizing & Scaling Configuration

### Current Azure Configuration

Based on [packages/api/iac/main.bicep](packages/api/iac/main.bicep):

**Production (both API and Web):**
- CPU: 0.25 vCores
- Memory: 0.5 GiB (512 MB)
- Min replicas: 1
- Max replicas: 1 (no horizontal scaling)
- **Cost per instance**: Very minimal (~€7-15/month per app on Azure)

**Acceptance:**
- Same resources (0.25 CPU, 0.5 GiB)
- Min replicas: 0 (scales down to zero when PR closed)
- Max replicas: 1

### Recommended Clever Cloud Configuration

#### Production Environment (Cost-Optimized)

**API (play14-api-production):**
- **Instance type**: XS (Extra Small)
  - **XS**: 1 vCPU, 1 GB RAM (~€10-15/month)
- **Rationale**:
  - Node.js is single-threaded (event loop) - extra vCPUs don't help much
  - 1 GB RAM sufficient for Strapi with external Redis cache
  - Horizontal scaling is more effective than vertical for Node.js
- **Horizontal scaling**:
  - Min instances: 1
  - Max instances: 3 (for traffic spikes)
  - **Auto-scaling triggers**: CPU > 80% or Memory > 85%
- **Scaling strategy**: Horizontal scaling (spawn more XS instances vs upgrading to M)

**Web (play14-web-production):**
- **Instance type**: XS (Extra Small)
  - **XS**: 1 vCPU, 1 GB RAM (~€10-15/month)
- **Rationale**:
  - Node.js single-threaded - 1 vCPU is optimal
  - Next.js standalone is efficient, 1 GB RAM is sufficient
  - Static assets served by CloudFlare CDN (not by app)
  - SSR overhead is minimal for this workload
- **Horizontal scaling**:
  - Min instances: 1
  - Max instances: 5 (stateless SSR scales horizontally well)
  - **Auto-scaling triggers**: CPU > 70% or requests/second > 100
- **Scaling strategy**: Horizontal scaling preferred (add XS instances as needed)

**PostgreSQL:**
- **Plan**: XXS (Extra Extra Small)
  - **XXS**: 256 MB RAM, 5 GB storage (~€7-10/month)
- **Rationale**:
  - Current Azure DB likely small (community platform, not high-traffic)
  - Connection pool: Reduce to 10 connections max (adjust in Strapi config)
  - Can upgrade later if needed (monitor slow query logs)
- **Important**: Check current Azure DB size first:
  ```sql
  SELECT pg_size_pretty(pg_database_size('play14_prod'));
  ```

**Redis:**
- **Plan**: S (Small)
  - **S**: 100 MB RAM (~€7-10/month)
- **Rationale**:
  - Used only for cache + cron locking (not session storage)
  - 100 MB sufficient for cache with TTL eviction
  - Monitor cache hit rates, upgrade if memory pressure

**Cellar S3:**
- **Storage**: Pay-per-use
- **Estimate**: €2-3/month for 100 GB

**Production Total: €36-53/month** (vs €103/month in original plan)

#### PR Environments

**API (play14-api-pr-{number}):**
- **Instance type**: XS (Extra Small) or Nano
  - **Nano**: 0.5 vCPU, 512 MB RAM (~€3-5/month)
  - **XS**: 1 vCPU, 1 GB RAM (~€7-10/month)
- **Recommendation**: **Nano** (matches Azure 0.25 CPU, 512 MB)
- **Horizontal scaling**: Fixed 1 instance (no auto-scaling needed)

**Web (play14-web-pr-{number}):**
- **Instance type**: Nano or XS
- **Recommendation**: **Nano** (sufficient for PR testing)
- **Horizontal scaling**: Fixed 1 instance

**PostgreSQL:**
- **Plan**: DEV or Nano
  - **DEV**: Free tier or ~€7/month
- **Recommendation**: **DEV** plan (smallest available)

**Redis:**
- **Plan**: DEV or Nano
  - **DEV**: Free tier or ~€7/month
- **Recommendation**: **DEV** plan

**Cellar S3:**
- Share production bucket with PR-specific paths (no additional cost)

### Horizontal Scaling Configuration

**How to configure in Clever Cloud:**

```bash
# API - Allow horizontal scaling (1-3 instances)
clever scale --app play14-api-production --min-instances 1 --max-instances 3

# Web - Allow horizontal scaling (1-5 instances)
clever scale --app play14-web-production --min-instances 1 --max-instances 5

# Auto-scaling is automatic on Clever Cloud based on:
# - CPU usage (>80%)
# - Memory usage (>85%)
# - Request queue depth
```

**Scaling triggers (Clever Cloud auto-managed):**
- Scales UP when: CPU > 80% for 2 minutes OR memory > 85%
- Scales DOWN when: CPU < 20% for 5 minutes AND memory < 50%
- Cooldown period: 3 minutes between scaling events

**Load balancing:**
- Clever Cloud provides automatic HTTP/HTTPS load balancing
- Round-robin distribution across instances
- Sticky sessions: NOT required (Next.js is stateless, Strapi sessions in PostgreSQL)

### Performance Comparison: Azure vs Clever Cloud

| Metric | Azure (Current) | Clever Cloud (Cost-Optimized) |
|--------|----------------|-------------------------------|
| API CPU | 0.25 vCores | 1 vCore (XS instance) |
| API Memory | 512 MB | 1 GB (XS instance) |
| Web CPU | 0.25 vCores | 1 vCore (XS instance) |
| Web Memory | 512 MB | 1 GB (XS instance) |
| Horizontal Scaling | None (fixed 1 replica) | Yes (API: 1-3, Web: 1-5) |
| Auto-scaling triggers | Manual only | Automatic (CPU/memory) |
| Database | Shared Azure PostgreSQL | Dedicated Clever Cloud addon (XXS) |
| Redis | None (implied external) | Dedicated Clever Cloud addon (S) |

**Expected performance improvements:**
- **2x more memory per instance** (512 MB → 1 GB) → Better caching, fewer OOM errors
- **4x more CPU per instance** (0.25 → 1 vCore) → Faster request processing
- **Horizontal auto-scaling** → Better handling of traffic spikes
- **Dedicated Redis** → Faster cache hits, reliable cron locking
- **Dedicated PostgreSQL** → Better isolation, no noisy neighbor issues

### Cost Analysis

**Estimated Clever Cloud Costs (Production):**

**Cost-Optimized Configuration (Recommended Start):**
- API (XS instance): €12/month
- Web (XS instance): €12/month
- PostgreSQL (XXS addon): €8/month
- Redis (S addon): €8/month
- Cellar storage (100GB): €2.5/month
- **Base Total**: **€42.5/month**

**With Horizontal Scaling (Auto-scales on demand):**
- API: €12-36/month (1-3 XS instances)
- Web: €12-60/month (1-5 XS instances)
- Addons: Fixed €18.5/month (PostgreSQL + Redis + Cellar)
- **Scaling Range**: **€42.5-114.5/month** (only pays more during traffic spikes)

**Upgrade Path if Needed (After Monitoring):**
- API (S instance): €25/month (+€13)
- Web (S instance): €25/month (+€13)
- PostgreSQL (S addon): €20/month (+€12)
- **Upgraded Total**: €78/month (if performance monitoring shows need)

**PR Environment Costs (per active PR):**
- API (Nano): €4/month
- Web (Nano): €4/month
- PostgreSQL (DEV): €7/month
- Redis (DEV): €7/month
- Cellar: Shared (€0)
- **Total per PR**: **€22/month** (when running)
- **With immediate cleanup**: €0/month (deleted on PR close)

**Azure Cost Comparison:**
- Current Azure spend: ~€30-50/month (2x 0.25 vCPU, 512 MB instances)
- Clever Cloud cost-optimized: **€42.5/month base**
- **Difference**: ~€0-12/month (comparable cost) BUT with:
  - 2x more memory per instance (512 MB → 1 GB)
  - Horizontal auto-scaling capability
  - Dedicated database and Redis (vs shared/implied)
  - Better performance for similar cost

**Why Node.js Single-Threaded Makes XS Optimal:**
- Node.js uses a single-threaded event loop (non-blocking I/O)
- Additional vCPUs only help for:
  - CPU-intensive operations (not typical in Strapi/Next.js)
  - Worker threads (not used in your stack)
- **Horizontal scaling** (multiple XS instances) is more cost-effective than vertical scaling (one M instance)
- Example: 3x XS (€36) provides better throughput than 1x M (€45) for Node.js workloads

**Cost Optimization Strategies:**
1. **Start small**: XS instances, XXS database, monitor for 2-4 weeks
2. **Monitor key metrics**:
   - CPU usage (should stay <70% on average)
   - Memory usage (should stay <80%)
   - Database connection pool saturation
   - Redis memory usage
3. **Upgrade path** (only if metrics show need):
   - Database slow queries → Upgrade PostgreSQL to XS (€12) or S (€20)
   - Memory pressure on API → Add 2nd XS instance (horizontal scaling)
   - High web traffic → Add more XS instances (horizontal scaling)
4. **PR cleanup discipline**: Immediate cleanup on PR close = €0 PR costs
5. **Database optimization**:
   - Reduce Strapi connection pool from 20 to 10 connections (edit [database.ts](packages/api/config/database.ts))
   - Enable query logging to identify slow queries
   - Add database indexes if needed (monitor with `EXPLAIN ANALYZE`)

---

## Key Differences: Azure vs Clever Cloud

| Aspect | Azure Container Apps | Clever Cloud |
|--------|---------------------|--------------|
| **Deployment** | Push Docker images | Build from Git source |
| **Authentication** | OIDC federated (passwordless) | OAuth tokens (1-year expiry) |
| **IaC** | Bicep templates | CLI commands + env vars |
| **Monorepo** | Container registry + paths | APP_FOLDER + build hooks |
| **Health Checks** | Built-in probes | Manual curl checks |
| **Scaling** | Auto-scale via Bicep | Instance sizing via console |
| **Storage** | Azure Blob Storage | Cellar (S3-compatible) |

---

## Notes on PR Database Backup/Restore Strategy

Clever Cloud PostgreSQL addons **do not support native standby/pause**. The recommended approach is:

**Backup-to-Cellar Strategy** (implemented in PR deployment workflow):

**On PR Close:**
1. Perform full database backup using `pg_dump`
2. Upload backup to Cellar S3 (`s3://play14-uploads-prod/pr-backups/`)
3. Delete PostgreSQL addon completely (zero cost when PR closed)

**On PR Reopen:**
1. Create new PostgreSQL addon
2. Download backup from Cellar S3
3. Restore database using `pg_restore`

**Advantages:**
- **Zero cost when PR closed** - no running database addon
- **Backup preserved** - stored in cheap S3 storage (Cellar)
- **Fast restoration** - can restore in ~1-2 minutes
- **Auto-cleanup** - implement S3 lifecycle policy to delete backups after 30 days

**Implementation Details:**
See section 4.2 "Create PR Deployment Workflow" for the complete backup/restore workflow integrated into GitHub Actions.

**Alternative Approaches (not recommended):**
1. **Full deletion without backup**: Simplest but loses PR data permanently
2. **Scale down**: Keep addon but downgrade to smallest plan (still incurs ~€7/month, not free)

---

## Success Criteria

- [ ] Production deployment triggered by push to main
- [ ] PR preview environments created automatically on PR open
- [ ] PR environments deleted automatically on PR close/merge
- [ ] API health endpoint responds correctly
- [ ] Web frontend renders without errors
- [ ] Database queries execute successfully
- [ ] File uploads work via Cellar
- [ ] Cron jobs run on schedule
- [ ] Stripe webhooks received
- [ ] No increase in error rates (Sentry)
- [ ] Page load times comparable to Azure
- [ ] Team trained on Clever Cloud console and CLI
- [ ] Documentation updated

---

## Additional Resources

- [Clever Cloud Deployment Hooks Documentation](https://www.clever-cloud.com/doc/develop/build-hooks/)
- [Clever Cloud PostgreSQL Documentation](https://www.clever-cloud.com/doc/addons/postgresql/)
- [Clever Cloud Cellar S3 Documentation](https://www.clever-cloud.com/doc/addons/cellar/)
- [strapi-provider-upload-clevercloud-cellar GitHub](https://github.com/plduhoux/strapi-provider-upload-clevercloud-cellar)
- [Clever Tools CLI GitHub](https://github.com/CleverCloud/clever-tools)
