#!/usr/bin/env bash
# Validate a strapi-transfer run by comparing row counts between source
# (Azure PG) and target (Clever Cloud PG add-on), and HEAD-checking a
# random sample of file URLs against Cellar.
#
# Usage:
#   ./validate-transfer.sh \
#     --source-uri 'postgresql://USER:PASS@HOST:5432/DB?sslmode=require' \
#     --target-addon <addon-id-or-name>     # e.g. addon_414e7ccf-... (play14-pg-staging)
#
# Or pass --target-uri instead of --target-addon if you already have the
# Clever Cloud connection string.
#
# Exits non-zero if any row count differs by more than --tolerance (default 0)
# or if any file URL returns non-2xx.

set -euo pipefail

SOURCE_URI=""
TARGET_URI=""
TARGET_ADDON=""
SAMPLE_SIZE="${SAMPLE_SIZE:-20}"
TOLERANCE="${TOLERANCE:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-uri)   SOURCE_URI="$2"; shift 2 ;;
    --target-uri)   TARGET_URI="$2"; shift 2 ;;
    --target-addon) TARGET_ADDON="$2"; shift 2 ;;
    --sample)       SAMPLE_SIZE="$2"; shift 2 ;;
    --tolerance)    TOLERANCE="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \?//' | head -n -1
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$SOURCE_URI" ]] && { echo "Missing --source-uri" >&2; exit 1; }

# Resolve target URI from add-on if needed.
if [[ -z "$TARGET_URI" ]]; then
  [[ -z "$TARGET_ADDON" ]] && { echo "Missing --target-uri or --target-addon" >&2; exit 1; }

  ORG_DEFAULT="${CC_ORG-play14}"
  echo "==> Loading target DB credentials from add-on $TARGET_ADDON (org: $ORG_DEFAULT)"
  ADDON_ENV=""
  if [[ -n "$ORG_DEFAULT" ]]; then
    ADDON_ENV="$(clever addon env "$TARGET_ADDON" --org "$ORG_DEFAULT" 2>/dev/null || true)"
  fi
  if [[ -z "$ADDON_ENV" ]]; then
    ADDON_ENV="$(clever addon env "$TARGET_ADDON" 2>/dev/null || true)"
  fi
  [[ -z "$ADDON_ENV" ]] && { echo "ERROR: clever addon env returned nothing for $TARGET_ADDON" >&2; exit 1; }

  # shellcheck disable=SC1090
  eval "$(printf '%s\n' "$ADDON_ENV" | grep -E '^(export )?POSTGRESQL_ADDON_URI=')"
  TARGET_URI="${POSTGRESQL_ADDON_URI:?POSTGRESQL_ADDON_URI not found in addon env}"
fi

command -v psql >/dev/null 2>&1 || { echo "psql not installed" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl not installed" >&2; exit 1; }

# --- Row-count comparison ---------------------------------------------------

# Tables we care about for the migration. Strapi's draft/publish creates two
# rows per published entry (draft + published) — the count comparison still
# holds because both source and target share the convention.
TABLES=(
  events
  players
  articles
  games
  venues
  event_locations
  hostings
  expectations
  testimonials
  histories
  homes
  sponsors
  tickets
  ticket_orders
  ticket_types
  budget_line_items
  result_line_items
  player_claims
  attendance_claims
  liked_items
  files
  up_users
  up_users_role_links
)

count_rows() {
  local uri="$1" table="$2"
  psql "$uri" -tA -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "ERR"
}

echo
echo "==> Row-count comparison (tolerance: $TOLERANCE)"
printf "%-28s %12s %12s %10s\n" "table" "source" "target" "Δ"
printf -- "----------------------------------------------------------------------\n"

mismatches=0
missing=0
for t in "${TABLES[@]}"; do
  src=$(count_rows "$SOURCE_URI" "$t")
  tgt=$(count_rows "$TARGET_URI" "$t")
  if [[ "$src" == "ERR" || "$tgt" == "ERR" ]]; then
    printf "%-28s %12s %12s %10s\n" "$t" "$src" "$tgt" "—"
    missing=$((missing + 1))
    continue
  fi
  delta=$((tgt - src))
  abs_delta=${delta#-}
  if (( abs_delta > TOLERANCE )); then
    mismatches=$((mismatches + 1))
    printf "%-28s %12s %12s %10s  ⚠\n" "$t" "$src" "$tgt" "$delta"
  else
    printf "%-28s %12s %12s %10s\n" "$t" "$src" "$tgt" "$delta"
  fi
done

echo

# --- File spot-check --------------------------------------------------------

echo "==> File spot-check ($SAMPLE_SIZE random rows from files table on target)"
mapfile -t URLS < <(psql "$TARGET_URI" -tA -c \
  "SELECT url FROM files WHERE url IS NOT NULL ORDER BY random() LIMIT $SAMPLE_SIZE;" 2>/dev/null)

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "  No file rows on target. Skipping HEAD checks."
else
  bad=0
  for url in "${URLS[@]}"; do
    [[ -z "$url" ]] && continue
    code=$(curl -s -o /dev/null -w '%{http_code}' -I -L --max-time 10 "$url" || echo "000")
    if [[ "$code" =~ ^2 ]]; then
      printf "  ✓ %s  %s\n" "$code" "$url"
    else
      printf "  ✗ %s  %s\n" "$code" "$url"
      bad=$((bad + 1))
    fi
  done
  echo
  echo "  $bad / ${#URLS[@]} URLs failed"
  (( bad > 0 )) && mismatches=$((mismatches + 1))
fi

# --- Summary ---------------------------------------------------------------

echo
if (( mismatches == 0 && missing == 0 )); then
  echo "==> ✓ Validation passed."
  exit 0
elif (( missing > 0 && mismatches == 0 )); then
  echo "==> ⚠ Validation completed with $missing missing-table errors (likely permissions or wrong DB). No row mismatches."
  exit 2
else
  echo "==> ✗ Validation FAILED: $mismatches mismatches, $missing query errors."
  exit 1
fi
