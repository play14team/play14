#!/usr/bin/env bash
# Apply env vars from a file to a Clever Cloud app.
#
# Reads KEY=VALUE lines from the env file (skipping blanks and # comments)
# and applies each via `clever env set`. The Clever Cloud add-on env vars
# (POSTGRESQL_ADDON_*, CELLAR_ADDON_*, REDIS_*) are auto-injected and must
# NOT be set here — only the application-specific config goes in.
#
# Usage:
#   ./set-env.sh <app-alias> <env-file>
#
# Examples:
#   ./set-env.sh play14-api-staging env-staging-api.env
#   ./set-env.sh play14-web-staging env-staging-web.env
#   ./set-env.sh play14-api         env-production-api.env
#   ./set-env.sh play14-web         env-production-web.env
#
# Tips:
#   - Copy env-staging-api.example → env-staging-api.env and fill in secrets.
#   - The .env files are gitignored — do NOT commit them.
#   - Re-running is safe: clever env set overwrites.

set -euo pipefail

APP="${1:-}"
ENV_FILE="${2:-}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "$APP" || -z "$ENV_FILE" ]]; then
  echo "Usage: $0 <app-alias> <env-file>" >&2
  exit 1
fi

[[ -f "$ENV_FILE" ]] || { echo "env file not found: $ENV_FILE" >&2; exit 1; }
command -v clever >/dev/null 2>&1 || { echo "clever-tools not installed" >&2; exit 1; }

echo "==> Applying $ENV_FILE to app $APP (DRY_RUN=$DRY_RUN)"

count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blanks and comments.
  [[ -z "${line// /}" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  # Split on first =.
  key="${line%%=*}"
  value="${line#*=}"
  key="${key// /}"

  # Strip surrounding double quotes if present.
  if [[ "$value" =~ ^\".*\"$ ]]; then
    value="${value:1:-1}"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  [dry-run] clever env set $key '<redacted>' --alias $APP"
  else
    clever env set "$key" "$value" --alias "$APP" >/dev/null
    echo "  set $key"
  fi
  count=$((count + 1))
done <"$ENV_FILE"

echo "==> Done ($count vars)."
echo
echo "Next: trigger a redeploy so the new env takes effect:"
echo "  clever restart --alias $APP"
