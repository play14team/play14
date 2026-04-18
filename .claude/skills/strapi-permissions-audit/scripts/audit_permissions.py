#!/usr/bin/env python3
"""Audit Strapi permissions bootstrap against actual routes + controllers.

Usage:
    python3 audit_permissions.py <packages/api-dir>

Outputs JSON to stdout with three gap categories:
  untracked:  route/controller actions missing from actions.ts
  unassigned: actions.ts constants missing from definitions.ts
  dead:       definitions.ts entries with no corresponding route/controller

Only `api::` actions are checked; `plugin::` actions are out of scope because
they are owned by Strapi plugins and already wired up in actions.ts.

Exit code is 0 when clean, 1 when gaps exist.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

API_PREFIX = "api::"

CORE_CRUD = ("find", "findOne", "create", "update", "delete")


def parse_actions(actions_ts: Path) -> dict[str, dict[str, str]]:
    """Parse actions.ts.

    Returns a mapping { GROUP_NAME: { KEY: action_id_string } }. Preserves
    both `api::` and `plugin::` constants — the caller filters as needed.
    """
    text = actions_ts.read_text(encoding="utf-8")
    groups: dict[str, dict[str, str]] = {}

    for m in re.finditer(
        r"export\s+const\s+([A-Z][A-Z0-9_]*_ACTIONS)\s*=\s*\{([^}]*)\}\s*as\s+const",
        text,
        re.DOTALL,
    ):
        group_name = m.group(1)
        body = m.group(2)
        entries: dict[str, str] = {}
        for em in re.finditer(
            r'(?m)^\s*([A-Z][A-Z0-9_]*)\s*:\s*"([^"]+)"\s*,?\s*$',
            body,
        ):
            entries[em.group(1)] = em.group(2)
        if entries:
            groups[group_name] = entries

    return groups


def parse_definitions(
    definitions_ts: Path, actions: dict[str, dict[str, str]]
) -> tuple[set[str], set[str]]:
    """Parse definitions.ts.

    Returns (resolved_action_ids, unresolvable_refs). An unresolvable ref is a
    `GROUP.KEY` reference that doesn't resolve against the parsed actions.ts —
    usually a typo or a stale refactor leftover that the TS compiler will also
    flag.
    """
    text = definitions_ts.read_text(encoding="utf-8")
    resolved: set[str] = set()
    unresolvable: set[str] = set()

    for m in re.finditer(
        r"action:\s*([A-Z][A-Z0-9_]*_ACTIONS)\.([A-Z][A-Z0-9_]*)",
        text,
    ):
        group = m.group(1)
        key = m.group(2)
        action_id = actions.get(group, {}).get(key)
        if action_id is not None:
            resolved.add(action_id)
        else:
            unresolvable.add(f"{group}.{key}")

    return resolved, unresolvable


def scan_routes_and_controllers(api_dir: Path) -> dict[str, list[str]]:
    """Scan packages/api/src/api/*/ for all expected api:: action IDs.

    Returns:
        {
          "expected": sorted list of expected action IDs,
          "sources": list of "<action_id>  <path>  <detection>" debug lines,
        }
    """
    apis_root = api_dir / "src" / "api"
    expected: set[str] = set()
    sources: list[str] = []

    if not apis_root.is_dir():
        return {"expected": [], "sources": []}

    for sub in sorted(p for p in apis_root.iterdir() if p.is_dir()):
        api_name = sub.name

        # ----- Routes -----
        routes_dir = sub / "routes"
        if routes_dir.is_dir():
            for rf in sorted(routes_dir.glob("*.ts")):
                text = rf.read_text(encoding="utf-8")

                # createCoreRouter("api::foo.foo") implies 5 CRUD actions unless
                # narrowed via { only: [...] } or { except: [...] } as the 2nd arg.
                for m in re.finditer(
                    r'factories\.createCoreRouter\(\s*"(api::[^"]+)"(?:\s*,\s*(\{[^)]*\}))?\s*\)',
                    text,
                    re.DOTALL,
                ):
                    api_id = m.group(1)
                    options_src = m.group(2) or ""
                    actions_for_this_router = set(CORE_CRUD)
                    only_m = re.search(r"only\s*:\s*\[([^\]]*)\]", options_src)
                    except_m = re.search(r"except\s*:\s*\[([^\]]*)\]", options_src)
                    if only_m:
                        actions_for_this_router = {
                            s.strip().strip('"').strip("'")
                            for s in only_m.group(1).split(",")
                            if s.strip()
                        }
                    elif except_m:
                        excluded = {
                            s.strip().strip('"').strip("'")
                            for s in except_m.group(1).split(",")
                            if s.strip()
                        }
                        actions_for_this_router = set(CORE_CRUD) - excluded
                    for action in sorted(actions_for_this_router):
                        action_id = f"{api_id}.{action}"
                        expected.add(action_id)
                        sources.append(f"{action_id}  {rf}  core-router")

                # Custom routes: explicit { method, path, handler: "x.y" } entries.
                for m in re.finditer(
                    r'handler:\s*"([a-z0-9-]+)\.([a-zA-Z0-9_]+)"',
                    text,
                ):
                    handler_prefix = m.group(1)
                    method_name = m.group(2)
                    action_id = f"{API_PREFIX}{api_name}.{handler_prefix}.{method_name}"
                    expected.add(action_id)
                    sources.append(f"{action_id}  {rf}  custom-route")

        # Note: we intentionally do NOT scan controllers for method names.
        # Controller methods become exposed actions only when a route's
        # `handler:` references them — that's what the routes scan above
        # already captures. Scanning controllers would flag private helpers
        # (methods that take `ctx` but aren't wired to a route) as if they
        # were endpoints, producing false positives.

    return {"expected": sorted(expected), "sources": sorted(sources)}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    api_dir = Path(sys.argv[1]).resolve()
    actions_ts = api_dir / "src" / "bootstrap" / "permissions" / "actions.ts"
    definitions_ts = api_dir / "src" / "bootstrap" / "permissions" / "definitions.ts"
    for p in (actions_ts, definitions_ts):
        if not p.exists():
            print(f"missing: {p}", file=sys.stderr)
            return 1

    actions = parse_actions(actions_ts)
    defined, unresolvable = parse_definitions(definitions_ts, actions)

    all_api_constants: set[str] = {
        v for group in actions.values() for v in group.values() if v.startswith(API_PREFIX)
    }

    scan = scan_routes_and_controllers(api_dir)
    expected = set(scan["expected"])

    untracked = sorted(expected - all_api_constants)
    unassigned = sorted(all_api_constants - defined)
    # Only api:: entries can be dead relative to api/ scanning.
    dead = sorted(a for a in (defined - expected) if a.startswith(API_PREFIX))

    out = {
        "api_dir": str(api_dir),
        "summary": {
            "expected_endpoints": len(expected),
            "api_constants": len(all_api_constants),
            "defined_permissions_api": sum(
                1 for a in defined if a.startswith(API_PREFIX)
            ),
            "untracked": len(untracked),
            "unassigned": len(unassigned),
            "dead": len(dead),
            "unresolvable_refs": len(unresolvable),
        },
        "untracked": untracked,
        "unassigned": unassigned,
        "dead": dead,
        "unresolvable_refs": sorted(unresolvable),
        "sources": scan["sources"],
    }
    json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
    print()

    gaps = len(untracked) + len(unassigned) + len(unresolvable)
    return 1 if gaps else 0


if __name__ == "__main__":
    sys.exit(main())
