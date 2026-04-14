# Stage 4 — `strapi transfer` runbook

End-to-end guide for moving content (DB rows + media) from the Azure-hosted
production Strapi to the new Clever Cloud staging instance, and later to
production.

`strapi transfer` is the primary mechanism. It streams entries, files, and
configuration; on the receiving side, file binaries are written through the
destination's upload provider, so URLs in `plugin::upload.file` are
automatically rewritten from Azure Blob to Cellar without manual SQL.

## What it does NOT transfer

Document this and plan around it:

- **Admin users** (`admin_users`, `admin_users_roles_links`) — recreate manually
- **API tokens** (`strapi_api_tokens*`) — generate fresh in destination
- **Transfer tokens** (`strapi_transfer_tokens*`) — irrelevant; only used for the transfer itself

## Pre-flight

1. **Schemas must match exactly** between source and destination.
   - Confirm both Azure prod and Clever Cloud staging are running the same
     git ref. Stage 3 ensures this by deploying the same branch (`main` →
     `feat/clever-cloud-migration`) to staging.
   - If unsure: `git rev-parse HEAD` on both deployment artefacts.

2. **Both instances must be live** for the duration of the transfer.
   - Source: Azure prod must accept incoming reads. No special config — it's
     already running.
   - Destination: Clever Cloud staging must be reachable from the machine
     running the transfer command. Verify with:
     ```bash
     curl -sI https://api-staging.play14.org/admin/init
     # Or pre-DNS-attachment, the auto-assigned URL:
     clever applications --org play14   # find the *.cleverapps.io URL
     ```

3. **Environment**:
   - The transfer command runs from the **source** Strapi codebase, hitting
     the destination admin URL.
   - `bun run strapi transfer ...` invoked from inside `packages/api/`.
   - You can run it from your dev box (faster, no Azure SSH needed) IF the
     dev box has Azure DB firewall access. Otherwise SSH into the Azure
     container app:
     ```bash
     az containerapp exec --name play14-api --resource-group play14-community --command "/bin/sh"
     ```

4. **Cellar bucket must be empty (or pre-cleaned)**:
   ```bash
   eval $(clever addon env addon_205a7840-4de1-4970-b4f6-daa68b9a8190 | grep CELLAR_)
   aws --endpoint-url "https://${CELLAR_ADDON_HOST}" s3 ls s3://play14-uploads-staging --recursive | wc -l
   # If non-zero, wipe with:
   #   aws --endpoint-url "https://${CELLAR_ADDON_HOST}" s3 rm s3://play14-uploads-staging --recursive
   ```

5. **Destination DB must be empty**:
   ```bash
   clever ssh --alias play14-api-staging
   # OR connect with psql using POSTGRESQL_ADDON_URI from `clever addon env`
   ```
   First boot of the destination Strapi creates schema; if the transfer fails
   midway, truncate all tables before retrying (`./reset-destination.sh` —
   write this if you anticipate multiple rehearsal runs).

## Step 1 — Generate a transfer token on the destination

1. Open the **destination** admin: <https://api-staging.play14.org/admin>
   (or the `*.cleverapps.io` URL).
2. Log in as the bootstrap admin (the first admin you create on staging).
3. Go to **Settings → Global settings → Transfer Tokens → Create new Transfer Token**.
4. Name: `azure-to-clever-cloud-transfer`. Type: **Push**. Lifespan: 7 days.
5. Copy the token immediately — it's shown once.

Store it as a shell variable:
```bash
export STRAPI_TRANSFER_TOKEN='paste-here'
```

## Step 2 — Use the wrapper script

```bash
cd iac/clever-cloud
./transfer.sh \
  --to https://api-staging.play14.org \
  --token "$STRAPI_TRANSFER_TOKEN" \
  --throttle 200
```

The wrapper:
- Validates URL & token are present
- Cd's into `packages/api`
- Invokes `bun run strapi transfer --to ...`
- Streams stdout/stderr so you can watch progress
- Captures total duration

`--throttle 200` adds 200ms between batches to avoid saturating Azure
egress. Drop it (or set lower) once you've confirmed the transfer completes.

## Step 3 — Watch progress

The transfer prints per-stage progress:
```
✔ Schemas: 100% (24/24)
✔ Entries: 14% (1245/8800)  → continues...
✔ Assets:  3% (137/4200)    → slowest stage; throttled
✔ Configuration: 100% (3/3)
```

Time estimates (rough):
- Schemas: <30s
- Entries: 5–15min for ~10K rows
- Assets: depends on Cellar upload bandwidth and the 200ms throttle — expect
  10–30min for several thousand files

If interrupted, **rerun from scratch** — there's no resume. Empty the
destination DB + Cellar bucket first.

## Step 4 — Validation pass

Run the validation script:
```bash
./validate-transfer.sh \
  --source-uri 'postgresql://USER:PASS@play14-pg.postgres.database.azure.com:5432/play14_prod?sslmode=require' \
  --target-addon addon_414e7ccf-ac06-4771-9c9e-c4e1becc3245
```

It reports row-count diffs across the 12 critical tables, and pings 20
random files in Cellar to confirm they return 200 OK.

Manual smoke tests (browser, against the destination):
- [ ] Public home page loads
- [ ] Events list shows expected count + thumbnails render
- [ ] Open an event detail; gallery images render
- [ ] Players list with avatars
- [ ] One article opens with embedded media
- [ ] Login flow works (use a recreated admin account)
- [ ] Free ticket reservation completes (Stripe test mode)
- [ ] Email arrives at a `@play14.org` test address

## Step 5 — Recreate admin users + API tokens

Strapi transfer skips admin users. Recreate manually:

1. In the destination admin: **Settings → Users → Invite new user** for each
   admin from Azure prod.
2. Each admin receives a Sender.net invite email; they set their own password.
3. **Settings → API Tokens → Create new API Token** — name it
   `play14-web-prod-readonly`, scope: read-only. Copy the value.
4. Set on the web app:
   ```bash
   # In env-staging-web.env, set STRAPI_API_SECRET=<token>, then:
   ./set-env.sh play14-web-staging env-staging-web.env
   clever restart --alias play14-web-staging
   ```

## Cleanup after rehearsal

If this run was a rehearsal (not the final cutover):

- Revoke the transfer token in the destination admin (one-time use is best practice)
- Note any errors / time taken in the migration tracker
- Decide whether to keep the rehearsal data or wipe and re-rehearse closer to cutover

---

## Fallback: pg_dump + rclone

Use this only if `strapi transfer` fails repeatedly (e.g. timeouts on the
asset stage, transfer token rejected, schema drift).

### A. Database

```bash
# Source (Azure)
pg_dump \
  --host play14-pg.postgres.database.azure.com \
  --port 5432 \
  --username "$AZURE_DB_USER" \
  --dbname play14_prod \
  --format custom \
  --no-owner --no-privileges \
  --file play14-prod.dump

# Target (Clever Cloud)
eval $(clever addon env addon_414e7ccf-ac06-4771-9c9e-c4e1becc3245)
pg_restore \
  --host "$POSTGRESQL_ADDON_HOST" \
  --port "$POSTGRESQL_ADDON_PORT" \
  --username "$POSTGRESQL_ADDON_USER" \
  --dbname "$POSTGRESQL_ADDON_DB" \
  --no-owner --no-privileges \
  --clean --if-exists \
  play14-prod.dump
```

### B. Media files

Configure `rclone` with two remotes:

```ini
# ~/.config/rclone/rclone.conf
[azureblob]
type = azureblob
account = play14storage
key = <azure-account-key>

[cellar]
type = s3
provider = Other
endpoint = https://cellar-c2.services.clever-cloud.com
access_key_id = <CELLAR_ADDON_KEY_ID>
secret_access_key = <CELLAR_ADDON_KEY_SECRET>
```

Then sync (resumable, idempotent):

```bash
rclone sync azureblob:strapi_uploads cellar:play14-uploads-staging \
  --transfers 16 --checkers 32 --progress
```

### C. Rewrite file URLs in the DB

Because the DB rows still point at `play14-cdn.azureedge.net`, run this
one-off SQL on the destination to redirect them to Cellar:

```sql
-- Note: also rewrite the `formats` JSON for responsive image variants.
BEGIN;

UPDATE files
SET
  url = REPLACE(REPLACE(url,
    'https://play14-cdn.azureedge.net',
    'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com'),
    'https://play14storage.blob.core.windows.net/strapi_uploads',
    'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com'),
  provider = 'aws-s3',
  formats = REPLACE(REPLACE(formats::text,
    'https://play14-cdn.azureedge.net',
    'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com'),
    'https://play14storage.blob.core.windows.net/strapi_uploads',
    'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com')::jsonb
WHERE url LIKE '%azureedge.net%' OR url LIKE '%blob.core.windows.net%';

COMMIT;
```

For the production cutover, replace `play14-uploads-staging` with
`play14-uploads-prod` and the CDN host with `cdn.play14.org`.

### D. Validate

Same `./validate-transfer.sh` invocation as in the primary path.

---

## Cutover differences (production)

This runbook describes the **rehearsal** to staging. For the final cutover:

1. Use the production destination: `https://api.play14.org/admin` (after
   DNS flip) or the auto-assigned URL pre-flip.
2. Use the production transfer token, not the staging one.
3. Scale Azure API to 0 replicas BEFORE running the final delta transfer to
   freeze writes:
   ```bash
   az containerapp update --name play14-api --resource-group play14-community \
     --min-replicas 0 --max-replicas 0
   ```
4. Recreate admin users + production API tokens; update `STRAPI_API_SECRET`
   on `play14-web` then `clever restart --alias play14-web`.
5. Update Stripe Dashboard webhook endpoints to confirm they still resolve
   post-DNS-flip.
