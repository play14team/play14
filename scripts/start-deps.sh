#!/bin/bash
# Start dependency containers and report status

CONTAINERS=("play14-db" "play14-redis" "stripe-webhook")

# Start containers silently
podman-compose up -d "${CONTAINERS[@]}" > /dev/null 2>&1

# Report status for each
for name in "${CONTAINERS[@]}"; do
  state=$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null)
  if [ "$state" = "running" ]; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name (${state:-not found})"
  fi
done
