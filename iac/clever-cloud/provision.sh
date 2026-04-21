#!/usr/bin/env bash
# Provision Clever Cloud apps and add-ons for play14.
#
# Creates four apps (api/web × staging/prod) and six add-ons
# (PostgreSQL/Cellar/Redis × staging/prod), each linked to the
# corresponding API app so add-on env vars are auto-injected.
#
# Idempotent: existing apps/add-ons are detected and skipped.
#
# Prerequisites:
#   - clever-tools installed:    npm install -g clever-tools
#   - authenticated:             clever login
#   - jq installed:              for parsing CLI JSON output
#
# Usage:
#   ./provision.sh                     # creates everything
#   DRY_RUN=1 ./provision.sh           # prints actions without executing
#
# After running, run ./buckets.sh and then set-env.sh / domains.sh.

set -euo pipefail

# --- Configuration -----------------------------------------------------------

REGION="${CC_REGION:-par}"            # par = Paris; mtl = Montreal; etc.
# Clever Cloud organization. Defaults to the play14 org; override with
# CC_ORG=<other-org> ./provision.sh, or CC_ORG="" to target the personal account.
ORG="${CC_ORG-play14}"

# App definitions: alias|type|description
APPS=(
  "play14-api-staging|node|play14 Strapi API (staging)"
  "play14-web-staging|node|play14 Next.js web (staging)"
  "play14-api|node|play14 Strapi API (production)"
  "play14-web|node|play14 Next.js web (production)"
)

# Add-on definitions: alias|provider|plan|linked-app
# Plans (as of 2026): postgresql-addon=xxs/s/m/l/xl, cellar-addon=s, redis-addon=s_mono/m_mono
ADDONS=(
  "play14-pg-staging|postgresql-addon|xxs_sml|play14-api-staging"
  "play14-cellar-staging|cellar-addon|s|play14-api-staging"
  "play14-redis-staging|redis-addon|s_mono|play14-api-staging"
  "play14-pg|postgresql-addon|s_sml|play14-api"
  "play14-cellar|cellar-addon|s|play14-api"
  "play14-redis|redis-addon|s_mono|play14-api"
)

# Scalability: alias|min-flavor|max-flavor|min-instances|max-instances|build-flavor
#
# Clever Cloud's default Node runtime flavor is XS (512 MB RAM, shared CPU),
# which is too small for the Next.js web tier under real traffic — a single
# XS instance of play14-web was hitting 95%+ RAM and triggering Node GC
# stalls long enough to abort outbound fetches (undici kState crash, 10s
# strapi-client timeouts).
#
# Production web runs with both scalers enabled:
#   - Vertical S → M: headroom if S ever feels tight, no cost when not hit
#     (Clever bills the flavor actually running).
#   - Horizontal 1 → 2: HA + zero-downtime deploys + spike absorption. Web
#     is stateless (JWT cookie) so no session affinity needed.
# Clever's auto-scaler triggers on CPU, so keep the Grafana RAM% alert
# separately — GC-driven stalls won't trip a CPU threshold.
#
# Staging and API stay pinned at XS (min=max) — no load, no need. Setting
# min-flavor=max-flavor is equivalent to a fixed flavor but uses the same
# CLI shape uniformly across apps.
#
# Build flavor M is kept for all apps because `next build` and `strapi
# build` both routinely exceed XS memory during compile.
APP_FLAVORS=(
  "play14-api-staging|XS|XS|1|1|M"
  "play14-web-staging|XS|XS|1|1|M"
  "play14-api|XS|XS|1|1|M"
  "play14-web|S|M|1|2|M"
)

# --- Helpers -----------------------------------------------------------------

DRY_RUN="${DRY_RUN:-0}"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  [dry-run] $*"
  else
    echo "  $ $*"
    "$@"
  fi
}

org_arg() {
  [[ -n "$ORG" ]] && echo "--org $ORG" || echo ""
}

app_exists() {
  clever applications $(org_arg) 2>/dev/null | grep -qE "^[[:space:]]*$1[[:space:]]"
}

addon_exists() {
  clever addon $(org_arg) 2>/dev/null | grep -qE "^[[:space:]]*$1[[:space:]]"
}

# --- Pre-flight --------------------------------------------------------------

command -v clever >/dev/null 2>&1 || { echo "clever-tools not installed (npm i -g clever-tools)" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq not installed" >&2; exit 1; }

# Verify auth.
if ! clever profile >/dev/null 2>&1; then
  echo "Not logged in to Clever Cloud. Run: clever login" >&2
  exit 1
fi

echo "==> Region: $REGION  |  Org: ${ORG:-personal}  |  DRY_RUN=$DRY_RUN"
echo

# --- Apps --------------------------------------------------------------------

echo "==> Creating apps"
for entry in "${APPS[@]}"; do
  IFS='|' read -r alias type desc <<<"$entry"
  if app_exists "$alias"; then
    echo "  [skip] app $alias already exists"
  else
    echo "  Creating app $alias ($type)"
    # shellcheck disable=SC2046
    run clever create --type "$type" --region "$REGION" --alias "$alias" $(org_arg) "$alias"
  fi
done
echo

# --- Add-ons -----------------------------------------------------------------

echo "==> Creating add-ons and linking to apps"
for entry in "${ADDONS[@]}"; do
  IFS='|' read -r alias provider plan linked_app <<<"$entry"
  if addon_exists "$alias"; then
    echo "  [skip] add-on $alias already exists"
  else
    echo "  Creating add-on $alias ($provider / $plan) linked to $linked_app"
    # shellcheck disable=SC2046
    run clever addon create "$provider" \
      --plan "$plan" \
      --region "$REGION" \
      --link "$linked_app" \
      $(org_arg) \
      "$alias"
  fi
done
echo

# --- Scalability -------------------------------------------------------------
#
# Apply min/max flavor, instance range, and build flavor. `clever scale` is
# idempotent (setting the same values is a no-op) so this block is safe on
# every run. Using --min-flavor/--max-flavor + --min-instances/--max-instances
# uniformly means we never implicitly disable a scaler that was manually
# enabled in the console.
#
# Note: changing the flavor config does NOT move the running instance to the
# new size — a `clever restart --app <name>` (or the next deploy) is required
# to roll live. Intentional, so re-running provision.sh on a live stack
# doesn't cause unattended restarts.
#
# `clever scale` has no --org flag; `--app <name-or-id>` takes the app name
# directly, which works because our app names are unique within the org.

echo "==> Setting app scalability"
for entry in "${APP_FLAVORS[@]}"; do
  IFS='|' read -r alias min_flavor max_flavor min_inst max_inst build <<<"$entry"
  echo "  Setting $alias → flavor ${min_flavor}→${max_flavor}, instances ${min_inst}→${max_inst}, build ${build}"
  # shellcheck disable=SC2046
  run clever scale --app "$alias" \
    --min-flavor "$min_flavor" --max-flavor "$max_flavor" \
    --min-instances "$min_inst" --max-instances "$max_inst" \
    --build-flavor "$build"
done
echo

# --- Summary -----------------------------------------------------------------

echo "==> Done. Next steps:"
echo "  1. Capture app IDs for GitHub secrets:"
echo "       clever applications $(org_arg)"
echo "     Set CC_API_APP_ID, CC_WEB_APP_ID, CC_API_STAGING_APP_ID,"
echo "     CC_WEB_STAGING_APP_ID in repo Settings → Secrets."
echo
echo "  2. Capture Cellar add-on env vars (needed for ./buckets.sh):"
echo "       clever addon env play14-cellar-staging"
echo "       clever addon env play14-cellar"
echo
echo "  3. Run ./buckets.sh to create Cellar buckets and apply CORS."
echo "  4. Run ./set-env.sh play14-api-staging env-staging.env (etc.)."
echo "  5. Run ./domains.sh to attach staging hostnames."
echo "  6. If flavors were changed above, restart the affected apps so the"
echo "     running instance picks up the new size, e.g."
echo "       clever restart --app play14-web"
