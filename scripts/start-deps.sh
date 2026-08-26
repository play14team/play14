#!/bin/bash
# Start dependency containers and report status

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Export the KEY=VALUE lines of an env file into this shell.
#
# We parse instead of sourcing: `. file` executes the file, so a stray line
# without an `=` (a `KEY: value` typo, say) aborts with "command not found"
# and silently drops every variable after it.
#
# A value already present in the environment wins, matching how compose itself
# resolves ${VAR} — so `PLAY14_DB_PORT=15432 bun run deps` is a one-off override
# without editing any file.
load_env() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
      *=*) ;;
      *) continue ;;
    esac
    key="${line%%=*}"
    key="${key#export }"
    # Keys are conservative on purpose: anything else is not a shell-safe name.
    case "$key" in
      *[!A-Za-z0-9_]*|'') continue ;;
    esac
    # Already set in the environment: leave it alone.
    [ -n "${!key+x}" ] && continue
    value="${line#*=}"
    case "$value" in
      # Quoted: take the contents verbatim, comment characters included.
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
      *)
        # Unquoted: drop a trailing inline comment, which sourcing used to
        # handle for free. Only ` #` counts, so a value like pass#word
        # survives — same rule the shell applies.
        case "$value" in
          *' #'*) value="${value%% #*}" ;;
        esac
        # Trailing whitespace would otherwise end up inside the value.
        value="${value%"${value##*[![:space:]]}"}"
        ;;
    esac
    export "$key=$value"
  done < "$file"
}

# compose.yaml uses ${DATABASE_*} interpolation in the postgres service block
# for POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB, and ${PLAY14_*_PORT} for
# every host port mapping. Those only resolve from the shell environment or a
# `.env` next to compose.yaml — env_file: only injects into the container at
# runtime, after interpolation has happened. So we load both env files here.
#
# Root `.env` first, then packages/api/.env: the API file owns the credentials,
# the root file owns the host port layout, and they share no keys.
load_env "$ROOT_DIR/.env"
load_env "$ROOT_DIR/packages/api/.env"

# Host ports. Defaults must stay in sync with the ${VAR:-default} fallbacks in
# compose.yaml so `bun run deps` reports what compose actually binds.
DB_PORT="${PLAY14_DB_PORT:-5432}"
REDIS_PORT="${PLAY14_REDIS_PORT:-6379}"

# The API and web app read their own env files when run on the host rather than
# in a container, so a remapped host port has to be mirrored there by hand.
# Warn on drift instead of letting Strapi fail with a confusing ECONNREFUSED.
if [ -n "${DATABASE_PORT:-}" ] && [ "$DATABASE_PORT" != "$DB_PORT" ]; then
  echo "  ! port drift: play14-db is on host port $DB_PORT (PLAY14_DB_PORT)," \
       "but packages/api/.env has DATABASE_PORT=$DATABASE_PORT"
fi
if [ -n "${REDIS_URL:-}" ]; then
  redis_url_port="${REDIS_URL##*:}"
  redis_url_port="${redis_url_port%%/*}"
  if [ -n "$redis_url_port" ] && [ "$redis_url_port" != "$REDIS_PORT" ]; then
    echo "  ! port drift: play14-redis is on host port $REDIS_PORT (PLAY14_REDIS_PORT)," \
         "but packages/api/.env has REDIS_URL=...:$redis_url_port"
  fi
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

# Host port each service is reachable on, for the status report. Services that
# publish nothing (stripe-webhook shares the host network) get no entry.
declare -A HOST_PORTS=(
  [play14-db]="$DB_PORT"
  [play14-redis]="$REDIS_PORT"
  [play14-minio]="${PLAY14_MINIO_PORT:-9100}"
)

# Report status for long-running services (expect: running).
for name in "${CONTAINERS[@]}"; do
  state=$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null)
  port="${HOST_PORTS[$name]:-}"
  label="$name${port:+ (localhost:$port)}"
  if [ "$state" = "running" ]; then
    echo "  ✓ $label"
  else
    echo "  ✗ $label [${state:-not found}]"
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
