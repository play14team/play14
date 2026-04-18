#!/bin/bash
# Start dependency containers and report status

# compose.yaml uses ${DATABASE_*} interpolation in the postgres service block
# for POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB. Those only resolve from
# the shell environment or a `.env` next to compose.yaml — env_file: only
# injects into the container at runtime, after interpolation has happened.
# So we load packages/api/.env into this shell before calling podman-compose.
ENV_FILE="$(dirname "$0")/../packages/api/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# Long-running services we want to boot and keep checking on.
CONTAINERS=("play14-db" "play14-redis" "play14-minio" "stripe-webhook")

# One-shot services that run to completion (e.g. minio-init seeds the bucket
# then exits). We start them but don't expect them to stay in "running".
ONE_SHOTS=("play14-minio-init")

# compose.yaml declares some volumes as `external: true`, which means compose
# will refuse to start the service until the volume exists. Create any that
# are missing — creating an empty named volume is idempotent and safe.
EXTERNAL_VOLUMES=("play14-data")
for vol in "${EXTERNAL_VOLUMES[@]}"; do
  if ! podman volume inspect "$vol" > /dev/null 2>&1; then
    echo "  + creating external volume $vol"
    podman volume create "$vol" > /dev/null
  fi
done

# Start containers. Keep stderr so real failures (image pulls, volume errors,
# port conflicts) are visible instead of disappearing.
podman-compose up -d "${CONTAINERS[@]}" "${ONE_SHOTS[@]}" > /dev/null

# Report status for long-running services (expect: running).
for name in "${CONTAINERS[@]}"; do
  state=$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null)
  if [ "$state" = "running" ]; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name (${state:-not found})"
  fi
done

# Report status for one-shots (expect: running, exited with 0, or created).
for name in "${ONE_SHOTS[@]}"; do
  state=$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null)
  exit_code=$(podman inspect --format '{{.State.ExitCode}}' "$name" 2>/dev/null)
  case "$state" in
    running|created)
      echo "  ✓ $name ($state)"
      ;;
    exited)
      if [ "$exit_code" = "0" ]; then
        echo "  ✓ $name (exited 0)"
      else
        echo "  ✗ $name (exited $exit_code)"
      fi
      ;;
    *)
      echo "  ✗ $name (${state:-not found})"
      ;;
  esac
done
