#!/usr/bin/env bash
# Wrapper around `bun run strapi transfer` for the Azure → Clever Cloud
# data migration.
#
# Runs the transfer command from packages/api/ (the source Strapi codebase)
# pointed at the destination admin URL, with sane defaults and timing output.
#
# See transfer-runbook.md for the full procedure including how to obtain the
# transfer token and what to validate afterwards.
#
# Usage:
#   ./transfer.sh --to <destination-admin-url> --token <transfer-token> [opts]
#
# Examples:
#   # Staging rehearsal
#   ./transfer.sh \
#     --to https://api-staging.play14.org \
#     --token "$STRAPI_TRANSFER_TOKEN" \
#     --throttle 200
#
#   # Production cutover (no throttle, faster)
#   ./transfer.sh \
#     --to https://api.play14.org \
#     --token "$STRAPI_TRANSFER_TOKEN" \
#     --force
#
# Options forwarded to strapi transfer:
#   --force          skip the interactive confirmation
#   --throttle N     ms between batches (default 0)
#   --exclude TYPE   exclude content/files/links/configuration

set -euo pipefail

TO=""
TOKEN=""
FORCE="--force"          # default: skip prompt — set --no-force to require confirmation
THROTTLE=""
EXCLUDE=""
DRY_RUN="${DRY_RUN:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to)        TO="$2"; shift 2 ;;
    --token)     TOKEN="$2"; shift 2 ;;
    --no-force)  FORCE=""; shift ;;
    --throttle)  THROTTLE="--throttle $2"; shift 2 ;;
    --exclude)   EXCLUDE="$EXCLUDE --exclude $2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \?//' | head -n -1
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$TO" || -z "$TOKEN" ]]; then
  echo "Usage: $0 --to <destination-admin-url> --token <transfer-token> [opts]" >&2
  echo "       (use -h for full options)" >&2
  exit 1
fi

# Strip trailing slash; strapi-transfer adds /admin internally.
TO="${TO%/}"

# Resolve the source Strapi codebase (../packages/api relative to this script).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../../packages/api" && pwd)"

[[ -d "$API_DIR" ]] || { echo "API dir not found: $API_DIR" >&2; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "bun not installed" >&2; exit 1; }

echo "==> Strapi transfer"
echo "    Source: $API_DIR (current Strapi codebase)"
echo "    Target: $TO/admin"
echo "    Throttle: ${THROTTLE:-none}"
echo "    Exclude: ${EXCLUDE:-none}"
echo "    Token: ${TOKEN:0:8}…"
echo

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[dry-run] cd $API_DIR && bun run strapi transfer --to $TO/admin --to-token <token> $FORCE $THROTTLE $EXCLUDE"
  exit 0
fi

START_TS=$(date +%s)

cd "$API_DIR"
# shellcheck disable=SC2086
bun run strapi transfer \
  --to "$TO/admin" \
  --to-token "$TOKEN" \
  $FORCE \
  $THROTTLE \
  $EXCLUDE

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))
printf "\n==> Transfer finished in %dh:%dm:%ds\n" $((DURATION/3600)) $(((DURATION%3600)/60)) $((DURATION%60))
echo "==> Next: ./validate-transfer.sh (see transfer-runbook.md)"
