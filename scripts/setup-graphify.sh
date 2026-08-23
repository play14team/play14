#!/bin/bash
# Install graphify (knowledge graph over this repo) and build the first graph.
#
# The Claude Code side of graphify is committed: .claude/skills/graphify/ holds
# the skill, CLAUDE.md holds the always-on rules, .claude/settings.json holds the
# PATH-guarded PreToolUse hooks, and .graphifyignore trims the corpus. This
# script installs the CLI those pieces call, then builds graphify-out/ (which is
# gitignored — every clone builds its own).
#
# Usage:
#   bash scripts/setup-graphify.sh                # install pinned version + build
#   bash scripts/setup-graphify.sh --upgrade      # move to latest, refresh committed skill
#   bash scripts/setup-graphify.sh --extras mcp   # override the extras set
#   bash scripts/setup-graphify.sh --minimal      # no extras (code graph only)
#   bash scripts/setup-graphify.sh --no-build     # install only
#   bash scripts/setup-graphify.sh --hooks        # + git post-commit/post-checkout rebuild
#   bash scripts/setup-graphify.sh --postgres     # + index the local PG schema into the graph

set -euo pipefail

# Version stays pinned so the CLI matches the committed skill body under
# .claude/skills/graphify/. --upgrade moves both together.
GRAPHIFY_VERSION="0.9.31"

# Pinned interpreter so every clone resolves the same wheel set regardless of the
# system Python (this repo sees 3.12 through 3.14 in the wild). uv downloads a
# managed 3.12 if the machine has none.
PYTHON_VERSION="3.12"

# Extras chosen for this repo:
#   mcp       - graphify-mcp binary, for the optional MCP wiring printed at the end
#   pdf       - docs/TheDebriefingCube_*.pdf, packages/web/public/**/*.pdf
#   watch     - `graphify watch .` incremental rebuilds while developing
#   postgres  - `--postgres DSN` maps the Strapi-owned PG 17 schema into the graph
#   office    - packages/design/colors/Colors.docx and friends
#   anthropic - headless semantic extraction in CI via ANTHROPIC_API_KEY
#
# Deliberately NOT here: `leiden`. It pulls graspologic -> umap-learn -> numba,
# whose LLVM backend aborts mid-clustering on arm64 (WSL2 aarch64 reproduces it:
# "UNREACHABLE executed at .../TargetSchedule.cpp"), and it ships no wheels for
# Python 3.13+. graphify falls back to its own community detection, which built
# 393 communities over this repo. Opt in on x86_64 with:
#   bash scripts/setup-graphify.sh --extras "mcp,pdf,watch,postgres,office,anthropic,leiden"
EXTRAS="mcp,pdf,watch,postgres,office,anthropic"

UPGRADE=0
BUILD=1
INSTALL_HOOKS=0
WITH_POSTGRES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --upgrade) UPGRADE=1 ;;
    --minimal) EXTRAS="" ;;
    --extras)
      shift
      [ $# -gt 0 ] || { echo "error: --extras needs a value" >&2; exit 1; }
      EXTRAS="$1"
      ;;
    --extras=*) EXTRAS="${1#--extras=}" ;;
    --no-build) BUILD=0 ;;
    --hooks) INSTALL_HOOKS=1 ;;
    --postgres) WITH_POSTGRES=1 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "error: unknown option $1 (try --help)" >&2; exit 1 ;;
  esac
  shift
done

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v uv > /dev/null 2>&1; then
  cat >&2 <<'EOF'
  ✗ uv not found. Install it, then re-run this script:

      curl -LsSf https://astral.sh/uv/install.sh | sh     # macOS / Linux
      powershell -c "irm https://astral.sh/uv/install.ps1 | iex"   # Windows

EOF
  exit 1
fi

############################
# 1. Install the CLI
############################

if [ -n "$EXTRAS" ]; then
  SPEC="graphifyy[$EXTRAS]"
else
  SPEC="graphifyy"
fi

if [ "$UPGRADE" -eq 1 ]; then
  echo "  + installing $SPEC (latest) on Python $PYTHON_VERSION"
  uv tool install --upgrade --python "$PYTHON_VERSION" "$SPEC"
else
  echo "  + installing $SPEC==$GRAPHIFY_VERSION on Python $PYTHON_VERSION"
  uv tool install --python "$PYTHON_VERSION" "$SPEC==$GRAPHIFY_VERSION"
fi

if ! command -v graphify > /dev/null 2>&1; then
  echo "  ✗ graphify installed but not on PATH. Run 'uv tool update-shell', open a new shell, then re-run." >&2
  exit 1
fi

INSTALLED="$(graphify --version | awk '{print $2}')"
echo "  ✓ graphify $INSTALLED"

############################
# 2. Keep the committed skill in lockstep with the CLI
############################

# The skill body ships inside the wheel. Copying it out of the installed tool
# environment (rather than running `graphify install --project`) keeps the
# upstream installer away from .claude/settings.json and CLAUDE.md, whose
# graphify entries this repo maintains in a portable, committed form.
SKILL_DIR="$ROOT/.claude/skills/graphify"
STAMP="$SKILL_DIR/.graphify-version"
PKG_PYTHON="$(uv tool dir)/graphifyy/bin/python"

if [ ! -x "$PKG_PYTHON" ]; then
  PKG_PYTHON="$(uv tool dir)/graphifyy/Scripts/python.exe"   # Windows layout
fi

if [ -x "$PKG_PYTHON" ]; then
  PKG_DIR="$("$PKG_PYTHON" -c 'import graphify, pathlib; print(pathlib.Path(graphify.__file__).parent)')"
  if [ "$(cat "$STAMP" 2> /dev/null || true)" != "$INSTALLED" ]; then
    mkdir -p "$SKILL_DIR/references"
    cp "$PKG_DIR/skill.md" "$SKILL_DIR/SKILL.md"
    cp "$PKG_DIR/skills/claude/references/"*.md "$SKILL_DIR/references/"
    echo "$INSTALLED" > "$STAMP"
    echo "  ✓ synced .claude/skills/graphify/ from graphify $INSTALLED (commit the diff)"
  else
    echo "  ✓ .claude/skills/graphify/ already at $INSTALLED"
  fi
else
  echo "  ! could not locate the graphify tool environment; skipped skill sync"
fi

# After --upgrade, move the pin too. Otherwise the next plain run reinstalls the
# old version and the committed skill and the CLI drift apart.
# (-i.bak + rm keeps this working on both GNU and BSD/macOS sed.)
if [ "$UPGRADE" -eq 1 ] && [ "$INSTALLED" != "$GRAPHIFY_VERSION" ]; then
  sed -i.bak "s/^GRAPHIFY_VERSION=\".*\"\$/GRAPHIFY_VERSION=\"$INSTALLED\"/" "$SELF"
  rm -f "$SELF.bak"
  echo "  ✓ pinned GRAPHIFY_VERSION=$INSTALLED in scripts/$(basename "$SELF") (commit it)"
fi

############################
# 3. Build the graph
############################

# --code-only is the free path: tree-sitter AST extraction, no LLM, no API key.
# Docs, PDFs and the .docx files need a semantic pass — run `/graphify .` inside
# Claude Code for that, which uses the session model instead of a separate key.
if [ "$BUILD" -eq 1 ]; then
  if [ -f graphify-out/graph.json ]; then
    echo "  + graph exists, updating changed files only"
    graphify update .
  else
    echo "  + building code graph (AST only, no API key)"
    graphify extract . --code-only

    # `extract` stops at graph.json; GRAPH_REPORT.md and graph.html come from
    # the clustering pass. Community *names* are the only LLM-dependent part, so
    # skip naming unless a backend key is around — `/graphify .` in Claude Code
    # names them later with the session model, no key needed.
    if [ -n "${ANTHROPIC_API_KEY:-}${OPENAI_API_KEY:-}${GEMINI_API_KEY:-}" ]; then
      graphify cluster-only .
    else
      echo "  + no LLM backend key set, keeping placeholder community names"
      graphify cluster-only . --no-label
    fi
  fi
  echo "  ✓ graphify-out/{graph.json,GRAPH_REPORT.md,graph.html}"
fi

############################
# 4. Optional: git rebuild hooks
############################

# `graphify hook install` asks git for the hooks dir (`rev-parse --git-path hooks`),
# so it honours core.hooksPath and lands in husky's `.husky/_` rather than the
# inert `.git/hooks`. Husky owns that directory and regenerates it from the
# `prepare` script, so a `bun install` can drop the hook — `graphify hook status`
# shows whether it is still there, and re-running this restores it.
if [ "$INSTALL_HOOKS" -eq 1 ]; then
  echo "  + installing post-commit / post-checkout rebuild hooks into $(git rev-parse --git-path hooks)"
  graphify hook install
  graphify hook status
fi

############################
# 5. Optional: PostgreSQL schema
############################

# Adds tables, views, functions and FK relationships to the same graph, so
# "what writes to ticket_orders?" can cross from TypeScript into the schema.
# Needs the local DB up: `bun run db`.
if [ "$WITH_POSTGRES" -eq 1 ]; then
  ENV_FILE="$ROOT/packages/api/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "  ✗ packages/api/.env not found — copy .env.example first" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  DSN="postgresql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
  echo "  + extracting schema from ${DATABASE_NAME}@${DATABASE_HOST}:${DATABASE_PORT}"
  graphify extract . --postgres "$DSN"
  echo "  ✓ schema merged into the graph"
fi

############################
# Next steps
############################

cat <<'EOF'

Done. In Claude Code:

  /graphify .                          full build incl. docs/PDFs (uses the session model)
  graphify query "how do ticket orders reach Stripe?"
  graphify path "TicketOrder" "stripe"
  graphify explain "webhook"
  graphify update .                    after code changes (AST only, free)
  graphify god-nodes                   most connected nodes

Optional MCP wiring (structured graph tools instead of CLI calls) — add to .mcp.json:

  "graphify": { "command": "graphify-mcp" }

EOF
