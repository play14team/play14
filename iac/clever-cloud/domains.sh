#!/usr/bin/env bash
# Attach custom domains to Clever Cloud apps.
#
# Pre-cutover: only staging hostnames. Production hostnames are added on
# cutover day (uncomment the production block at the bottom and re-run).
#
# Clever Cloud auto-provisions Let's Encrypt certificates after DNS
# resolves to the app's domain. The CNAME targets shown below are the
# default per-app domains assigned at app creation — confirm yours via:
#   clever domain --alias <app-alias>
#
# Prerequisites:
#   - clever-tools authenticated
#   - DNS records pointing to the Clever Cloud apps (CNAME)
#
# Usage:
#   ./domains.sh                # adds staging domains (idempotent)
#   STAGE=production ./domains.sh   # adds production domains (cutover day)

set -euo pipefail

STAGE="${STAGE:-staging}"
DRY_RUN="${DRY_RUN:-0}"

# Domain definitions: alias|hostname
STAGING_DOMAINS=(
  "play14-api-staging|api-staging.play14.org"
  "play14-web-staging|staging.play14.org"
)

PRODUCTION_DOMAINS=(
  "play14-api|api.play14.org"
  "play14-web|new.play14.org"
)

case "$STAGE" in
  staging)    DOMAINS=("${STAGING_DOMAINS[@]}") ;;
  production) DOMAINS=("${PRODUCTION_DOMAINS[@]}") ;;
  *) echo "STAGE must be 'staging' or 'production' (got: $STAGE)" >&2; exit 1 ;;
esac

command -v clever >/dev/null 2>&1 || { echo "clever-tools not installed" >&2; exit 1; }

echo "==> Attaching $STAGE domains (DRY_RUN=$DRY_RUN)"

for entry in "${DOMAINS[@]}"; do
  IFS='|' read -r alias hostname <<<"$entry"
  if clever domain --alias "$alias" 2>/dev/null | grep -qE "(^|[[:space:]])${hostname}([[:space:]]|$)"; then
    echo "  [skip] $hostname already attached to $alias"
    continue
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  [dry-run] clever domain add $hostname --alias $alias"
  else
    echo "  Adding $hostname → $alias"
    clever domain add "$hostname" --alias "$alias"
  fi
done

echo
echo "==> DNS records you need at your registrar/Cloudflare:"
echo
case "$STAGE" in
  staging)
    cat <<'EOF'
  api-staging.play14.org   CNAME  → <play14-api-staging Clever Cloud domain>
  staging.play14.org       CNAME  → <play14-web-staging Clever Cloud domain>

Get the target CNAME via:
  clever domain --alias play14-api-staging
  clever domain --alias play14-web-staging
EOF
    ;;
  production)
    cat <<'EOF'
  api.play14.org           CNAME  → <play14-api Clever Cloud domain>
  new.play14.org           CNAME  → <play14-web Clever Cloud domain>
  cdn.play14.org           CNAME  → cdn.play14.org.cellar-c2.services.clever-cloud.com
                           (proxied through Cloudflare)
EOF
    ;;
esac
