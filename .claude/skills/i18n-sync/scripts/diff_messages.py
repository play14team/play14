#!/usr/bin/env python3
"""Report missing next-intl keys across locale files.

Usage:
    python3 diff_messages.py <messages-dir>

The directory must contain en.json, fr.json, de.json, es.json, it.json. English
is the reference locale. Output is machine-readable JSON on stdout. Exit code is
0 when all locales have the same key set, 1 otherwise.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

LOCALES = ["en", "fr", "de", "es", "it"]


def flatten(obj: object, prefix: str = "") -> dict[str, object]:
    """Flatten a nested dict into dotted-path keys. Arrays are left intact."""
    out: dict[str, object] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                out.update(flatten(v, key))
            else:
                out[key] = v
    return out


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    msg_dir = Path(sys.argv[1]).resolve()
    if not msg_dir.is_dir():
        print(f"not a directory: {msg_dir}", file=sys.stderr)
        return 2

    loaded: dict[str, dict[str, object]] = {}
    for loc in LOCALES:
        p = msg_dir / f"{loc}.json"
        if not p.exists():
            print(f"missing file: {p}", file=sys.stderr)
            return 1
        try:
            loaded[loc] = flatten(json.loads(p.read_text(encoding="utf-8")))
        except json.JSONDecodeError as e:
            print(f"{p}: invalid JSON ({e})", file=sys.stderr)
            return 1

    all_keys: set[str] = set().union(*(set(d.keys()) for d in loaded.values()))
    ref = loaded.get("en", {})

    per_locale: dict[str, dict[str, object]] = {}
    any_missing = False
    for loc in LOCALES:
        missing = sorted(all_keys - set(loaded[loc].keys()))
        extra = sorted(set(loaded[loc].keys()) - set(ref.keys()))
        if missing:
            any_missing = True
        per_locale[loc] = {
            "count": len(loaded[loc]),
            "missing": missing,
            "extra_vs_en": extra,
        }

    result = {
        "messages_dir": str(msg_dir),
        "total_keys": len(all_keys),
        "per_locale": per_locale,
        "en_reference": {k: v for k, v in ref.items() if isinstance(v, str)},
    }
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    print()
    return 1 if any_missing else 0


if __name__ == "__main__":
    sys.exit(main())
