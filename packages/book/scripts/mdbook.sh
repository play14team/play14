#!/usr/bin/env bash
# Runs a pinned mdBook, downloading the release binary into .bin/ on first use
# so contributors don't need cargo or a global install. A global `mdbook` on
# PATH is ignored on purpose: the book is built against one known version.
set -euo pipefail

MDBOOK_VERSION="v0.5.4"

cd "$(dirname "$0")/.."
bin=".bin/mdbook-${MDBOOK_VERSION}"

if [[ ! -x "$bin" ]]; then
  # SHA-256 of each release archive, matching the digests GitHub publishes for
  # the v0.5.4 assets. Update them together with MDBOOK_VERSION.
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
      target="x86_64-unknown-linux-musl"
      sha256="5222beabd3e37dc5be0d18ff99b79058469354db5c220153a1b92db5ba12be89" ;;
    Linux-aarch64 | Linux-arm64)
      target="aarch64-unknown-linux-musl"
      sha256="753e5c5c363ee8a56972344dcf91466f005a51db84a7aeffe427ae3ef83d6d44" ;;
    Darwin-x86_64)
      target="x86_64-apple-darwin"
      sha256="a47d7bf0d5d670cff9ee6cce95537cbeb62dc10704d9e7131ffbd13e2b59a5de" ;;
    Darwin-arm64)
      target="aarch64-apple-darwin"
      sha256="03e8a6d8b13a2971e0b3280affd03b388373c1485e26f73407c3a76b0b1838df" ;;
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
  # Download to a file first, so the checksum covers the whole archive and a
  # truncated download can't be extracted
  curl -fsSL -o "$tmp/mdbook.tar.gz" "$url"
  if command -v sha256sum >/dev/null; then
    actual="$(sha256sum "$tmp/mdbook.tar.gz" | cut -d' ' -f1)"
  else
    actual="$(shasum -a 256 "$tmp/mdbook.tar.gz" | cut -d' ' -f1)"
  fi
  if [[ "$actual" != "$sha256" ]]; then
    echo "mdbook.sh: checksum mismatch for ${url}" >&2
    echo "  expected ${sha256}" >&2
    echo "  got      ${actual}" >&2
    exit 1
  fi
  tar -xzf "$tmp/mdbook.tar.gz" -C "$tmp"
  mv "$tmp/mdbook" "$bin"
  chmod +x "$bin"
  # exec below replaces this shell, so the EXIT trap would never fire
  rm -rf "$tmp"
  trap - EXIT
fi

# mdBook serves on 3000 by default, which the web app already uses
if [[ "${1:-}" == "serve" ]]; then
  has_port=false
  for arg in "$@"; do
    case "$arg" in
      -p | -p* | --port | --port=*) has_port=true ;;
    esac
  done
  if [[ "$has_port" == false ]]; then
    set -- "$@" --port 3100
  fi
fi

exec "$bin" "$@"
