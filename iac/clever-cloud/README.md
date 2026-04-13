# Clever Cloud IaC

Provisioning scripts for the Clever Cloud target of the Azure → Clever Cloud
migration. Designed for a **fully-isolated staging + production** topology:
4 apps (api/web × staging/prod) and 6 add-ons (PG/Cellar/Redis × staging/prod).

## Files

| File | Purpose |
|---|---|
| `provision.sh` | Create apps and add-ons, link add-ons to API apps |
| `buckets.sh` | Create Cellar buckets and apply CORS |
| `set-env.sh` | Apply env vars from a file to a Clever Cloud app |
| `domains.sh` | Attach custom domains (staging now, production at cutover) |
| `cors-policy.json` | S3-format CORS rules applied to Cellar buckets |
| `env-staging-api.example` | Strapi API staging env-var template |
| `env-staging-web.example` | Next.js staging env-var template |
| `env-production-api.example` | Strapi API production env-var template |
| `env-production-web.example` | Next.js production env-var template |

The `*.example` files are committed. The filled-in `*.env` copies are
gitignored (`iac/clever-cloud/*.env`) — they contain secrets.

## Prerequisites

- [`clever-tools`](https://www.clever.cloud/developers/doc/cli/install/):
  `npm install -g clever-tools`
- [`aws` CLI](https://aws.amazon.com/cli/) (for Cellar bucket creation)
- `jq`
- A Clever Cloud account, authenticated:
  `clever login`

## One-time setup (top to bottom)

### 1. Provision apps and add-ons

```bash
cd iac/clever-cloud
./provision.sh                # creates 4 apps + 6 add-ons (idempotent)
DRY_RUN=1 ./provision.sh      # preview without creating
```

After it finishes:

- Capture the app IDs (`clever applications`) and add them to GitHub repo
  secrets so the deploy workflows can target the right apps:
  - `CC_API_APP_ID`, `CC_WEB_APP_ID`
  - `CC_API_STAGING_APP_ID`, `CC_WEB_STAGING_APP_ID`
- Capture `CLEVER_TOKEN` / `CLEVER_SECRET` from `~/.config/clever-cloud/clever-tools.json`
  and add them as repo secrets too.

### 2. Create Cellar buckets and apply CORS

The Cellar add-on gives you S3 credentials but no buckets — create them
explicitly. Sourcing the add-on env into your shell scopes the credentials
to that one command:

```bash
# Staging
eval $(clever addon env play14-cellar-staging | grep CELLAR_)
./buckets.sh play14-uploads-staging

# Production
eval $(clever addon env play14-cellar | grep CELLAR_)
./buckets.sh play14-uploads-prod
```

### 3. Configure environment variables

```bash
cp env-staging-api.example env-staging-api.env
cp env-staging-web.example env-staging-web.env
# Edit both — fill REPLACE_ME entries with real secrets.
# For APP_KEYS / *_SECRET / *_SALT: openssl rand -base64 32 (one per slot).

./set-env.sh play14-api-staging env-staging-api.env
./set-env.sh play14-web-staging env-staging-web.env

# Verify what landed:
clever env --alias play14-api-staging
```

Repeat for production when you're ready (use `env-production-*.example`).
**Production secrets must be regenerated fresh** — never reuse the staging or
legacy Azure values.

### 4. Attach staging domains

```bash
./domains.sh                  # attaches api-staging.play14.org + staging.play14.org
```

The script prints the DNS records you need to set at your registrar /
Cloudflare. After DNS resolves, Clever Cloud auto-provisions Let's Encrypt
certificates (1–3 minutes per host).

### 5. First deploy

The `clever-deploy-staging.yml` GitHub workflow deploys staging on every
push to `feat/clever-cloud-migration`. Push the branch to trigger the first
build:

```bash
git push -u origin feat/clever-cloud-migration
```

Watch the deploy:

```bash
clever logs --alias play14-api-staging -f
clever logs --alias play14-web-staging -f
```

## Production cutover (later)

When ready to flip production:

1. Run `./set-env.sh play14-api env-production-api.env` and
   `./set-env.sh play14-web env-production-web.env`.
2. Push to `main` — the `clever-deploy-api.yml` and `clever-deploy-web.yml`
   workflows deploy to the production apps.
3. Run `STAGE=production ./domains.sh` to attach `community.play14.org`,
   `play14.org`, `www.play14.org` to the production apps.
4. Lower DNS TTL to 60s 24h before cutover, then flip the CNAMEs.
5. After 7-day stability window, run the Azure decommissioning cleanup PR
   that strips the legacy provider, env branching, and Bicep templates.

## Cost notes

This topology runs **two** of everything — separate staging and production.
Approximate baseline (XS/Mono plans):

- 4 × Node app (XS): ~€20/mo
- 2 × PostgreSQL (XXS Small / S Small): ~€25–€60/mo
- 2 × Cellar (S): ~€10/mo
- 2 × Redis (S Mono): ~€10/mo

Scale up production add-ons (PG → M, Redis → M_mono) once data volume is
known. Staging stays small.

## Troubleshooting

**`clever applications` is empty after provision** — check you ran with the
correct org: `CC_ORG=<your-org-alias> ./provision.sh`.

**`clever addon env` returns nothing** — the add-on may not be linked to an
app yet. Re-run `clever service link-addon <app> <addon>` or re-run
`provision.sh` (it's idempotent).

**Bucket CORS fails** — confirm the AWS CLI is using Cellar credentials, not
your real AWS profile: `unset AWS_PROFILE` before running `buckets.sh`.

**Strapi can't reach Cellar** — verify `UPLOAD_PROVIDER=s3` is set
(`clever env --alias play14-api-staging | grep UPLOAD_PROVIDER`) and that the
auto-injected `CELLAR_ADDON_*` vars are present.
