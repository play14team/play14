#!/usr/bin/env bash
# Attach custom domains to Clever Cloud apps.
#
# Pre-cutover: only staging hostnames. Production hostnames are added on
# cutover day (uncomment the production block at the bottom and re-run).
#
# Every custom domain CNAMEs to Clever Cloud's custom-domain load balancer
# for the app's zone (domain.par.clever-cloud.com for Paris). Clever routes
# by Host header to whichever app the domain is bound to. Never point DNS at
# an app's default app-<id>.cleverapps.io domain: that load balancer only
# serves *.cleverapps.io hosts, and after Clever's 2026-11 load-balancer
# upgrade it answers 404 "application doesn't exist" for custom domains
# (this took play14.org down). Clever auto-provisions Let's Encrypt
# certificates once DNS resolves to the load balancer.
#
# Prerequisites:
#   - clever-tools authenticated
#   - DNS records CNAME'd to domain.par.clever-cloud.com
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
  "play14-web|play14.org"
  "play14-web|www.play14.org"
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
  if clever domain --alias "$alias" 2>/dev/null | sed 's|/\s*$||' | grep -qxF "$hostname"; then
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
  api-staging.play14.org   CNAME  → domain.par.clever-cloud.com   (proxied)
  staging.play14.org       CNAME  → domain.par.clever-cloud.com   (proxied)

Do NOT target app-<id>.cleverapps.io: that load balancer 404s custom domains.
EOF
    ;;
  production)
    cat <<'EOF'
  api.play14.org           CNAME  → domain.par.clever-cloud.com   (proxied)
  play14.org               CNAME  → domain.par.clever-cloud.com   (proxied, apex flattened by Cloudflare)
  www.play14.org           CNAME  → domain.par.clever-cloud.com   (proxied)
  cdn.play14.org           CNAME  → cdn.play14.org.cellar-c2.services.clever-cloud.com
                           (proxied through Cloudflare)

Do NOT target app-<id>.cleverapps.io: that load balancer 404s custom domains.
EOF
    ;;
esac
