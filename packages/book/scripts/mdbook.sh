#!/usr/bin/env bash
# Runs a pinned mdBook, downloading the release binary into .bin/ on first use
# so contributors don't need cargo or a global install. A global `mdbook` on
# PATH is ignored on purpose: the book is built against one known version.
set -euo pipefail

MDBOOK_VERSION="v0.5.4"

cd "$(dirname "$0")/.."
bin=".bin/mdbook-${MDBOOK_VERSION}"

if [[ ! -x "$bin" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) target="x86_64-unknown-linux-musl" ;;
    Linux-aarch64 | Linux-arm64) target="aarch64-unknown-linux-musl" ;;
    Darwin-x86_64) target="x86_64-apple-darwin" ;;
    Darwin-arm64) target="aarch64-apple-darwin" ;;
    *)
      echo "mdbook.sh: no prebuilt mdBook for $(uname -s)-$(uname -m); run 'cargo install mdbook --version ${MDBOOK_VERSION#v}'" >&2
      exit 1
      ;;
  esac
  url="https://github.com/rust-lang/mdBook/releases/download/${MDBOOK_VERSION}/mdbook-${MDBOOK_VERSION}-${target}.tar.gz"
  echo "mdbook.sh: downloading mdBook ${MDBOOK_VERSION} (${target})" >&2
  mkdir -p .bin
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "$url" | tar -xz -C "$tmp"
  mv "$tmp/mdbook" "$bin"
  chmod +x "$bin"
fi

exec "$bin" "$@"
