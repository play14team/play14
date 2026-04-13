#!/usr/bin/env bash
# Create Cellar buckets for play14 and apply CORS policy.
#
# Cellar is S3-compatible, so we use the AWS CLI pointed at the Cellar
# endpoint. Bucket names must be globally unique across Cellar.
#
# Prerequisites:
#   - AWS CLI installed (any recent version)
#   - Cellar add-on env vars exported (or sourced from a .env file):
#       CELLAR_ADDON_HOST=cellar-c2.services.clever-cloud.com
#       CELLAR_ADDON_KEY_ID=<staging or prod access key>
#       CELLAR_ADDON_KEY_SECRET=<staging or prod secret>
#
#   Get them with:
#       clever addon env play14-cellar-staging   # staging credentials
#       clever addon env play14-cellar           # production credentials
#
# Usage:
#   # staging
#   ./buckets.sh play14-uploads-staging --addon play14-cellar-staging
#   # production
#   ./buckets.sh play14-uploads-prod --addon play14-cellar
#
#   # Or pass the addon ID directly (avoids the by-name lookup issue):
#   ./buckets.sh play14-uploads-staging --addon addon_205a7840-4de1-4970-b4f6-daa68b9a8190
#
#   # Or pre-export and skip the --addon flag entirely:
#   eval $(clever addon env <addon-id-or-name> | grep CELLAR_)
#   ./buckets.sh play14-uploads-staging

set -euo pipefail

BUCKET="${1:-}"
ADDON=""
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --addon) ADDON="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$BUCKET" ]]; then
  echo "Usage: $0 <bucket-name> [--addon <addon-id-or-name>]" >&2
  exit 1
fi

# If --addon is given, source its env into our shell. Otherwise rely on the
# CELLAR_* vars already being exported by the caller.
if [[ -n "$ADDON" ]]; then
  ORG_DEFAULT="${CC_ORG-play14}"
  echo "==> Loading Cellar credentials from add-on $ADDON (org: ${ORG_DEFAULT:-personal})"

  # Try with --org first, then without; first one returning non-empty output wins.
  ADDON_ENV=""
  if [[ -n "$ORG_DEFAULT" ]]; then
    ADDON_ENV="$(clever addon env "$ADDON" --org "$ORG_DEFAULT" 2>/dev/null || true)"
  fi
  if [[ -z "$ADDON_ENV" ]]; then
    ADDON_ENV="$(clever addon env "$ADDON" 2>/dev/null || true)"
  fi
  if [[ -z "$ADDON_ENV" ]]; then
    echo "ERROR: 'clever addon env $ADDON' returned no output." >&2
    echo "       Try passing the add-on ID instead of the name (e.g. addon_xxxx)." >&2
    echo "       List addons:  clever addon list --org ${ORG_DEFAULT:-<your-org>}" >&2
    exit 1
  fi

  # shellcheck disable=SC1090
  eval "$(printf '%s\n' "$ADDON_ENV" | grep -E '^(export )?CELLAR_')"
fi

: "${CELLAR_ADDON_HOST:?CELLAR_ADDON_HOST not set — pass --addon <id-or-name> or eval clever addon env first}"
: "${CELLAR_ADDON_KEY_ID:?CELLAR_ADDON_KEY_ID not set}"
: "${CELLAR_ADDON_KEY_SECRET:?CELLAR_ADDON_KEY_SECRET not set}"

ENDPOINT="https://${CELLAR_ADDON_HOST}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_FILE="${SCRIPT_DIR}/cors-policy.json"

# Use Cellar credentials for this script run only — don't pollute the user's
# default AWS profile.
export AWS_ACCESS_KEY_ID="$CELLAR_ADDON_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$CELLAR_ADDON_KEY_SECRET"
export AWS_DEFAULT_REGION="${CELLAR_REGION:-us-east-1}"

echo "==> Bucket: $BUCKET (endpoint: $ENDPOINT)"

# Create bucket if it doesn't exist.
if aws --endpoint-url "$ENDPOINT" s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  [skip] bucket $BUCKET already exists"
else
  echo "  Creating bucket $BUCKET"
  aws --endpoint-url "$ENDPOINT" s3 mb "s3://$BUCKET"
fi

# Apply CORS policy (idempotent — overwrites).
echo "==> Applying CORS policy from $CORS_FILE"
aws --endpoint-url "$ENDPOINT" s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration "file://$CORS_FILE"

echo
echo "==> Verify CORS:"
aws --endpoint-url "$ENDPOINT" s3api get-bucket-cors --bucket "$BUCKET"

echo
echo "==> Done. Bucket public URL pattern:"
echo "       https://${BUCKET}.${CELLAR_ADDON_HOST}/<key>"
