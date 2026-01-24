#!/bin/bash

# Azure Container Registry Cleanup Script
# Keeps only the N latest images for specified repositories
# Always preserves: "prod", "acc" tags and any tags sharing the same SHA
# Usage: ./acr-cleanup.sh [--dry-run] [--keep N]

set -e

# Configuration
REGISTRY="play14containerregistry"
REPOSITORIES=("play14/play14-api" "play14/play14-web")
KEEP_COUNT=5
DRY_RUN=false
PROTECTED_TAGS=("prod" "acc")

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --keep)
            KEEP_COUNT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--keep N]"
            exit 1
            ;;
    esac
done

echo "=== Azure Container Registry Cleanup ==="
echo "Registry: $REGISTRY"
echo "Keeping latest: $KEEP_COUNT images per repository"
echo "Protected tags: ${PROTECTED_TAGS[*]} (and tags with same SHA)"
echo "Dry run: $DRY_RUN"
echo ""

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "Error: Not logged in to Azure. Run 'az login' first."
    exit 1
fi

# Process each repository
for REPO in "${REPOSITORIES[@]}"; do
    echo "--- Processing repository: $REPO ---"

    # Get all manifests with digest and tags in a single API call
    # Using -r for registry and -n for repository name
    # Output format: digest<TAB>tag1,tag2,tag3 (one manifest per line, sorted by time desc)
    # Note: tr -d '\r' removes Windows-style carriage returns from Azure CLI output
    MANIFESTS=$(az acr manifest list-metadata \
        -r "$REGISTRY" \
        -n "$REPO" \
        --orderby time_desc \
        --query "[?tags].{digest:digest, tags:join(',', tags)}" \
        --output tsv \
        --only-show-errors 2>/dev/null | tr -d '\r' || echo "")

    if [ -z "$MANIFESTS" ]; then
        echo "  No manifests found for $REPO (or repository doesn't exist)"
        continue
    fi

    # Count manifests
    MANIFEST_COUNT=$(echo "$MANIFESTS" | wc -l)
    echo "  Total manifests with tags: $MANIFEST_COUNT"

    # First pass: find protected digests (manifests that have prod or acc tags)
    declare -A PROTECTED_DIGESTS
    while IFS=$'\t' read -r digest tags; do
        for PROTECTED_TAG in "${PROTECTED_TAGS[@]}"; do
            if [[ ",$tags," == *",$PROTECTED_TAG,"* ]]; then
                PROTECTED_DIGESTS[$digest]=1
                echo "  Protected manifest: ${digest:0:20}... (has tag: $PROTECTED_TAG)"
                break
            fi
        done
    done <<< "$MANIFESTS"

    # Second pass: decide which manifests to keep, collect manifests to delete
    declare -a MANIFESTS_TO_DELETE=()
    declare -a KEPT_MANIFESTS=()
    KEPT_NON_PROTECTED=0

    while IFS=$'\t' read -r digest tags; do
        # Skip manifests with no tags
        if [ -z "$tags" ]; then
            continue
        fi

        if [ -n "${PROTECTED_DIGESTS[$digest]}" ]; then
            # Always keep protected manifests
            KEPT_MANIFESTS+=("${digest:0:20}... (protected: $tags)")
        elif [ $KEPT_NON_PROTECTED -lt $KEEP_COUNT ]; then
            # Keep first N non-protected manifests
            KEPT_MANIFESTS+=("${digest:0:20}... ($tags)")
            KEPT_NON_PROTECTED=$((KEPT_NON_PROTECTED + 1))
        else
            # Store digest and tags for deletion (we only need to delete by digest once)
            MANIFESTS_TO_DELETE+=("$digest|$tags")
        fi
    done <<< "$MANIFESTS"

    echo "  Manifests to keep: ${#KEPT_MANIFESTS[@]}"
    for manifest in "${KEPT_MANIFESTS[@]}"; do
        echo "    - $manifest"
    done

    # Delete manifests
    DELETE_COUNT=${#MANIFESTS_TO_DELETE[@]}
    if [ $DELETE_COUNT -eq 0 ]; then
        echo "  Nothing to delete"
    else
        echo "  Manifests to delete: $DELETE_COUNT"
        for MANIFEST_INFO in "${MANIFESTS_TO_DELETE[@]}"; do
            DIGEST="${MANIFEST_INFO%%|*}"
            TAGS="${MANIFEST_INFO#*|}"
            if [ "$DRY_RUN" = true ]; then
                echo "    [DRY RUN] Would delete: ${DIGEST:0:20}... (tags: $TAGS)"
            else
                echo "    Deleting: ${DIGEST:0:20}... (tags: $TAGS)"
                az acr manifest delete \
                    -r "$REGISTRY" \
                    "${REGISTRY}.azurecr.io/${REPO}@${DIGEST}" \
                    --yes \
                    --only-show-errors 2>/dev/null || true
            fi
        done
    fi

    # Third pass: clean up untagged manifests (orphaned images)
    UNTAGGED_MANIFESTS=$(az acr manifest list-metadata \
        -r "$REGISTRY" \
        -n "$REPO" \
        --query "[?tags==null || length(tags)==\`0\`].digest" \
        --output tsv \
        --only-show-errors 2>/dev/null | tr -d '\r' || echo "")

    if [ -n "$UNTAGGED_MANIFESTS" ]; then
        UNTAGGED_COUNT=$(echo "$UNTAGGED_MANIFESTS" | wc -l)
        echo "  Untagged manifests to delete: $UNTAGGED_COUNT"
        DELETED=0
        FAILED=0
        for DIGEST in $UNTAGGED_MANIFESTS; do
            if [ -z "$DIGEST" ]; then
                continue
            fi
            if [ "$DRY_RUN" = true ]; then
                echo "    [DRY RUN] Would delete untagged: ${DIGEST:0:20}..."
            else
                if az acr manifest delete \
                    -r "$REGISTRY" \
                    "${REGISTRY}.azurecr.io/${REPO}@${DIGEST}" \
                    --yes \
                    --only-show-errors 2>/dev/null; then
                    DELETED=$((DELETED + 1))
                    # Show progress every 10 deletions
                    if [ $((DELETED % 10)) -eq 0 ]; then
                        echo "    Deleted $DELETED untagged manifests..."
                    fi
                else
                    FAILED=$((FAILED + 1))
                fi
            fi
        done
        echo "    Untagged cleanup: $DELETED deleted, $FAILED failed/already gone"
    fi

    # Clean up for next iteration
    unset PROTECTED_DIGESTS
    unset MANIFESTS_TO_DELETE
    unset KEPT_MANIFESTS

    echo ""
done

echo "=== Cleanup complete ==="
