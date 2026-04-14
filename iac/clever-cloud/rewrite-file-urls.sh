#!/usr/bin/env bash
# Rewrite plugin::upload.file URLs in the Strapi database.
#
# Replaces --from URLs with --to URLs in both the `url` column and the
# `formats` JSONB column (responsive image variants). Optionally sets
# provider to 'aws-s3' on rewritten rows (--set-provider, on by default).
#
# Generic: works for Azure→Cellar, CDN-hostname→Cellar, or any other
# origin swap.
#
# Usage:
#   # Azure → Cellar (staging)
#   ./rewrite-file-urls.sh \
#     --target-addon addon_414e7ccf-ac06-4771-9c9e-c4e1becc3245 \
#     --from 'https://play14-cdn.azureedge.net/strapi-uploads/assets' \
#     --to 'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com/strapi-uploads/assets'
#
#   # CDN hostname → direct Cellar (if CDN setup doesn't work)
#   ./rewrite-file-urls.sh \
#     --target-addon addon_414e7ccf-ac06-4771-9c9e-c4e1becc3245 \
#     --from 'https://cdn-staging.play14.org/strapi-uploads/assets' \
#     --to 'https://play14-uploads-staging.cellar-c2.services.clever-cloud.com/strapi-uploads/assets'
#
#   # Azure → Cellar (production)
#   ./rewrite-file-urls.sh \
#     --target-addon <prod-pg-addon-id> \
#     --from 'https://play14-cdn.azureedge.net/strapi-uploads/assets' \
#     --to 'https://play14-uploads-prod.cellar-c2.services.clever-cloud.com/strapi-uploads/assets'
#
#   # Or pass a connection URI directly
#   ./rewrite-file-urls.sh \
#     --target-uri 'postgresql://user:pass@host:port/db' \
#     --from '...' --to '...'
#
#   # Dry run (shows what would change without modifying data)
#   DRY_RUN=1 ./rewrite-file-urls.sh --target-addon <id> --from '...' --to '...'
#
#   # Skip provider update (e.g. when just swapping hostnames, not providers)
#   ./rewrite-file-urls.sh --target-addon <id> --from '...' --to '...' --no-set-provider

set -euo pipefail

TARGET_URI=""
TARGET_ADDON=""
FROM_ORIGIN=""
TO_ORIGIN=""
SET_PROVIDER=true
DRY_RUN="${DRY_RUN:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-uri)      TARGET_URI="$2"; shift 2 ;;
    --target-addon)    TARGET_ADDON="$2"; shift 2 ;;
    --from)            FROM_ORIGIN="$2"; shift 2 ;;
    --to)              TO_ORIGIN="$2"; shift 2 ;;
    --no-set-provider) SET_PROVIDER=false; shift ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \?//' | head -n -1
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$FROM_ORIGIN" ]] && { echo "Missing --from <origin-url-prefix>" >&2; exit 1; }
[[ -z "$TO_ORIGIN" ]] && { echo "Missing --to <new-url-prefix>" >&2; exit 1; }

# Resolve target URI from add-on if needed.
if [[ -z "$TARGET_URI" ]]; then
  [[ -z "$TARGET_ADDON" ]] && { echo "Missing --target-uri or --target-addon" >&2; exit 1; }

  ORG_DEFAULT="${CC_ORG-play14}"
  echo "==> Loading DB credentials from add-on $TARGET_ADDON"
  ADDON_ENV=""
  if [[ -n "$ORG_DEFAULT" ]]; then
    ADDON_ENV="$(clever addon env "$TARGET_ADDON" --org "$ORG_DEFAULT" 2>/dev/null || true)"
  fi
  if [[ -z "$ADDON_ENV" ]]; then
    ADDON_ENV="$(clever addon env "$TARGET_ADDON" 2>/dev/null || true)"
  fi
  [[ -z "$ADDON_ENV" ]] && { echo "ERROR: clever addon env returned nothing for $TARGET_ADDON" >&2; exit 1; }

  eval "$(printf '%s\n' "$ADDON_ENV" | grep -E '^(export )?POSTGRESQL_ADDON_URI=')"
  TARGET_URI="${POSTGRESQL_ADDON_URI:?POSTGRESQL_ADDON_URI not found in addon env}"
fi

command -v psql >/dev/null 2>&1 || { echo "psql not installed" >&2; exit 1; }

# Extract a LIKE pattern from the --from origin (domain portion for matching).
FROM_LIKE_PATTERN=$(echo "$FROM_ORIGIN" | sed 's|https\?://||' | cut -d/ -f1)

echo "==> URL rewrite"
echo "    From: $FROM_ORIGIN"
echo "    To:   $TO_ORIGIN"
echo "    Match pattern: %${FROM_LIKE_PATTERN}%"
echo "    Set provider:  $SET_PROVIDER"
echo "    DRY_RUN:       $DRY_RUN"
echo

# Preview what will change
echo "==> Current state:"
psql "$TARGET_URI" -c "
  SELECT
    COUNT(*) FILTER (WHERE url LIKE '%${FROM_LIKE_PATTERN}%') AS matching_urls,
    COUNT(*) AS total
  FROM files;
"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> [dry-run] Would rewrite the matching_urls count above. Exiting."
  exit 0
fi

# Build the provider clause
PROVIDER_CLAUSE=""
if [[ "$SET_PROVIDER" == "true" ]]; then
  PROVIDER_CLAUSE=", provider = 'aws-s3'"
fi

echo "==> Rewriting..."
psql "$TARGET_URI" <<SQL
BEGIN;

-- Rewrite main URL column
UPDATE files
SET
  url = REPLACE(url, '${FROM_ORIGIN}', '${TO_ORIGIN}')
  ${PROVIDER_CLAUSE}
WHERE url LIKE '%${FROM_LIKE_PATTERN}%';

-- Rewrite responsive image format URLs (stored as JSONB)
UPDATE files
SET formats = REPLACE(formats::text, '${FROM_ORIGIN}', '${TO_ORIGIN}')::jsonb
WHERE formats IS NOT NULL
  AND formats::text LIKE '%${FROM_LIKE_PATTERN}%';

COMMIT;
SQL

# Extract new domain for verification
TO_LIKE_PATTERN=$(echo "$TO_ORIGIN" | sed 's|https\?://||' | cut -d/ -f1)

echo
echo "==> Verification:"
psql "$TARGET_URI" -c "
  SELECT
    COUNT(*) FILTER (WHERE url LIKE '%${FROM_LIKE_PATTERN}%') AS remaining_old,
    COUNT(*) FILTER (WHERE url LIKE '%${TO_LIKE_PATTERN}%') AS rewritten,
    COUNT(*) AS total
  FROM files;
"

echo "==> Sample URLs:"
psql "$TARGET_URI" -tA -c "SELECT url FROM files ORDER BY random() LIMIT 5;"

echo
echo "==> Done. Restart the Strapi app to pick up changes:"
echo "    clever restart --alias <app-alias>"
