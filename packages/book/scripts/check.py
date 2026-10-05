#!/usr/bin/env python3
"""Sanity checks for the built book. Run after `scripts/mdbook.sh build`.

Fails (exit 1) when:
  - a relative link in the rendered HTML points to a page that doesn't exist
  - a city in data/lineage.json has no chapter file, or the chapter isn't
    listed in src/SUMMARY.md (mdBook only renders what SUMMARY.md lists)

Also lists the TODO(author) gaps still open in src/, without failing on them.

Usage: python3 scripts/check.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "book"
SRC = ROOT / "src"


def broken_links():
    broken = []
    for page in BOOK.rglob("*.html"):
        if page.name in ("print.html", "toc.html"):
            continue
        for href in re.findall(r'href="([^"#:?]+\.html)(?:#[^"]*)?"', page.read_text()):
            if not (page.parent / href).resolve().exists():
                broken.append(f"{page.relative_to(BOOK)} -> {href}")
    return broken


def lineage_problems():
    summary = (SRC / "SUMMARY.md").read_text()
    data = json.loads((ROOT / "data" / "lineage.json").read_text())
    problems = []
    for city in data["cities"]:
        chapter = city["chapter"]
        if not chapter:  # Luxembourg is told in part 1, not as a city chapter
            continue
        if not (SRC / chapter).exists():
            problems.append(f"{city['city']}: {chapter} is missing")
        elif f"]({chapter})" not in summary:
            problems.append(f"{city['city']}: {chapter} is not listed in SUMMARY.md")
    return problems


def open_todos():
    return [
        f"{path.relative_to(SRC)}:{n}"
        for path in sorted(SRC.rglob("*.md"))
        for n, line in enumerate(path.read_text().splitlines(), 1)
        if "TODO(author)" in line
    ]


def main():
    if not BOOK.exists():
        sys.exit("check.py: book/ not found; run scripts/mdbook.sh build first")

    failures = [("broken link", x) for x in broken_links()] + [("lineage", x) for x in lineage_problems()]
    for kind, detail in failures:
        print(f"error ({kind}): {detail}")

    todos = open_todos()
    print(f"{len(todos)} open TODO(author) gap(s):" if todos else "no open TODO(author) gaps")
    for todo in todos:
        print(f"  {todo}")

    if failures:
        sys.exit(1)
    print("book checks passed")


if __name__ == "__main__":
    main()
