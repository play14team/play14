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
#   eval $(clever addon env play14-cellar-staging | grep CELLAR_)
#   ./buckets.sh play14-uploads-staging
#
#   # production
#   eval $(clever addon env play14-cellar | grep CELLAR_)
#   ./buckets.sh play14-uploads-prod

set -euo pipefail

BUCKET="${1:-}"
if [[ -z "$BUCKET" ]]; then
  echo "Usage: $0 <bucket-name>" >&2
  exit 1
fi

: "${CELLAR_ADDON_HOST:?CELLAR_ADDON_HOST not set (run: eval \$(clever addon env play14-cellar))}"
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
