# Production cutover checklist

Concrete steps for the final Azure → Clever Cloud DNS cutover, based on
the staging rehearsal (2026-04-14). Uses **pg_dump + rclone + URL rewrite**
(not `strapi transfer`, which fails on any missing asset).

## Pre-requisites (already done)

- [x] Clever Cloud apps provisioned: `play14-api`, `play14-web`
- [x] Add-ons linked: `play14-pg`, `play14-cellar`, `play14-redis`
- [x] Cellar bucket created: `play14-uploads-prod`
- [x] Bucket public-read policy applied
- [x] CORS policy applied to bucket
- [x] Staging rehearsal completed and validated
- [x] GitHub secrets set: `CC_API_APP_ID`, `CC_WEB_APP_ID`, `CLEVER_TOKEN`, `CLEVER_SECRET`
- [x] Branch merged to `main` (or ready to merge)

## T-24h — Preparation

### 1. Lower DNS TTL

In Cloudflare, for each of these records set TTL to **60 seconds**:
- `community.play14.org`
- `play14.org`
- `www.play14.org`
- `cdn.play14.org`

Wait for the old TTL to expire (check `dig +short community.play14.org` from
multiple resolvers to confirm propagation).

### 2. Set production env vars

```bash
cd iac/clever-cloud
cp env-production-api.example env-production-api.env
cp env-production-web.example env-production-web.env
# Edit both — IMPORTANT: regenerate ALL secrets fresh (APP_KEYS, *_SECRET, *_SALT).
# Do NOT reuse staging or Azure values.

./set-env.sh play14-api env-production-api.env
./set-env.sh play14-web env-production-web.env
```

### 3. Set build flavor + runtime config

```bash
clever scale --build-flavor M --alias play14-api
clever scale --build-flavor M --alias play14-web
```

### 4. Deploy code to production apps

```bash
clever deploy --alias play14-api --force
clever deploy --alias play14-web --force
```

Verify both apps start (they'll have empty DBs — that's fine, just confirm
the process boots without errors).

### 5. Announce maintenance window

Notify admins/users of the scheduled downtime.

## T-0 — Cutover

### 6. Freeze Azure writes

Scale Azure API to 0 replicas:
```bash
az containerapp update --name play14-api --resource-group play14-community \
  --min-replicas 0 --max-replicas 0
```

### 7. Dump the Azure production database

```bash
/usr/lib/postgresql/17/bin/pg_dump \
  --host play14-pg.postgres.database.azure.com \
  --port 5432 \
  --username <azure-db-user> \
  --dbname play14_prod \
  --format custom \
  --no-owner --no-privileges \
  --file play14-prod-final.dump
```

### 8. Restore into Clever Cloud production PG

```bash
eval $(clever addon env <play14-pg-addon-id> | grep POSTGRESQL_ADDON)
export PGPASSWORD="$POSTGRESQL_ADDON_PASSWORD"

pg_restore \
  --host "$POSTGRESQL_ADDON_HOST" \
  --port "$POSTGRESQL_ADDON_PORT" \
  --username "$POSTGRESQL_ADDON_USER" \
  --dbname "$POSTGRESQL_ADDON_DB" \
  --no-owner --no-privileges \
  --clean --if-exists \
  play14-prod-final.dump
```

### 9. Sync media files (rclone two-step)

Direct Azure → Cellar fails (metadata incompatibility). Use local disk as
intermediary:

```bash
mkdir -p /tmp/strapi-assets-prod

# Step 1: Download from Azure (~1 GB, ~1 min)
rclone sync azureblob:strapi-uploads/assets /tmp/strapi-assets-prod/ \
  --transfers 8 --progress

# Step 2: Upload to Cellar production bucket (~5 min)
rclone sync /tmp/strapi-assets-prod/ cellar:play14-uploads-prod/strapi-uploads/assets/ \
  --transfers 4 --progress --s3-no-check-bucket

# Step 3: Cleanup
rm -rf /tmp/strapi-assets-prod
```

Requires rclone config with `[azureblob]` and `[cellar]` remotes pointed at
production credentials. See staging rehearsal for config format.

### 10. Apply bucket public-read policy

```bash
eval $(clever addon env <play14-cellar-addon-id> | grep CELLAR_ADDON)
export AWS_ACCESS_KEY_ID="$CELLAR_ADDON_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$CELLAR_ADDON_KEY_SECRET"
export AWS_DEFAULT_REGION=us-east-1

aws --endpoint-url "https://${CELLAR_ADDON_HOST}" s3api put-bucket-policy \
  --bucket play14-uploads-prod \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::play14-uploads-prod/*"
    }]
  }'
```

### 11. Rewrite file URLs in the database

```bash
cd iac/clever-cloud
./rewrite-file-urls.sh \
  --target-addon <play14-pg-addon-id> \
  --from 'https://play14-cdn.azureedge.net/strapi-uploads/assets' \
  --to 'https://play14-uploads-prod.cellar-c2.services.clever-cloud.com/strapi-uploads/assets'
```

### 12. Restart the API

```bash
clever restart --alias play14-api
```

### 13. Create admin users + API tokens

1. Open `https://<play14-api-cleverapps-domain>/admin` (use the auto-assigned
   domain since DNS hasn't flipped yet)
2. Create the bootstrap admin (the pg_dump restored the old admin_users but
   with invalid password hashes since APP_KEYS/salts changed)
3. **Settings → API Tokens → Create new API Token** (read-only, unlimited)
4. Set on the web app:
   ```bash
   clever env set STRAPI_API_SECRET '<token>' --alias play14-web
   ```

### 14. Rebuild the web app

The web app must be rebuilt with the valid API token so `generateStaticParams`
pre-generates all detail pages:

```bash
clever deploy --alias play14-web --force --same-commit-policy rebuild
```

Verify it completes with `Generating static pages using 3 workers (XXXX/XXXX)`.

### 15. Smoke test (pre-DNS-flip)

Using the auto-assigned `*.cleverapps.io` URLs:
- [ ] Strapi admin panel loads, admin can log in
- [ ] API returns events: `curl -sH "Authorization: Bearer <token>" https://<api-domain>/api/events | jq .meta.pagination.total`
- [ ] A sample image loads from Cellar
- [ ] Web homepage renders with images

### 16. Flip DNS

In Cloudflare:

| Record | Type | Target | Proxy |
|---|---|---|---|
| `community.play14.org` | CNAME | `<play14-api cleverapps domain>` | Proxied (orange) |
| `play14.org` | CNAME (flattened) | `<play14-web cleverapps domain>` | Proxied (orange) |
| `www.play14.org` | CNAME | `<play14-web cleverapps domain>` | Proxied (orange) |

SSL/TLS mode: **Full** (not strict) — same as staging.

Also attach domains in Clever Cloud:
```bash
STAGE=production ./domains.sh
```

### 17. Post-flip verification

- [ ] `https://play14.org` loads the homepage
- [ ] `https://play14.org/events/<any-event>` detail page works
- [ ] `https://community.play14.org/admin` Strapi admin loads
- [ ] Images render from Cellar (inspect an `<img>` src in browser devtools)
- [ ] Login flow works (test with a known account)
- [ ] Stripe webhook test: trigger a test event in Stripe dashboard, verify it
      arrives at `https://community.play14.org/api/webhooks/stripe`

### 18. Update Stripe webhook endpoints

In the Stripe Dashboard:
- Verify webhook endpoint URL is still `https://community.play14.org/api/webhooks/stripe`
  (if the hostname didn't change, no action needed)
- Send a test webhook to confirm delivery

## T+2h — Monitor

- `clever logs --alias play14-api -f`
- `clever logs --alias play14-web -f`
- Check Grafana dashboards for errors and anomalies
- Watch Prometheus metrics on `:9000/metrics`

## T+7 days — Decommission Azure

- Scale Azure Container Apps to 0 replicas (already done at T-0)
- Delete resource group `play14-community`:
  ```bash
  az group delete --name play14-community --yes --no-wait
  ```
- Revoke `play14-github-actions` service principal
- Open cleanup PR on `main`:
  - Remove `strapi-provider-upload-azure-storage` from `packages/api/package.json`
  - Remove Azure upload branch from `plugins.ts` and `config/env/production/plugins.ts`
  - Remove Azure hosts from `middlewares.ts` CSP
  - Remove `play14-cdn.azureedge.net` from `next.config.js` remotePatterns
  - Delete `.github/workflows/production-deployment.yml`
  - Delete `packages/api/iac/` (Azure Bicep templates)
  - Delete `packages/api/iac/cli/redis.sh`
  - Raise DNS TTLs back to 3600s

## Lessons from staging rehearsal

These gotchas are already handled in the steps above, but documented here
for context:

1. **`strapi transfer` is unreliable for this migration** — a single 404 asset
   kills the entire pipeline with no resume. Use pg_dump + rclone instead.
2. **rclone Azure → Cellar direct fails** — Azure Blob metadata headers cause
   400 InvalidArgument on Cellar PUTs. Two-step via local disk works.
3. **Cellar buckets are private by default** — must apply `put-bucket-policy`
   for public-read access.
4. **Cloudflare CDN custom hostname needs Enterprise** — Host header rewrite
   requires an Enterprise plan. Use direct Cellar URLs instead of
   `cdn.play14.org` → Cellar.
5. **Cloudflare proxy mode + Full SSL** — avoids Let's Encrypt provisioning
   delays and HSTS issues with self-signed origin certs.
6. **pg_dump restored API tokens are invalid** — salts change between
   environments, so all API tokens/admin passwords must be recreated.
7. **`next build` needs a valid API token** — without it, `generateStaticParams`
   returns empty and detail pages fail with `DYNAMIC_SERVER_USAGE` at runtime.
8. **`next start` vs standalone** — `output: "standalone"` in next.config.js
   means `next start` runs in degraded mode, but works if all pages are
   pre-generated at build time. Standalone server.js path in monorepo TBD.
