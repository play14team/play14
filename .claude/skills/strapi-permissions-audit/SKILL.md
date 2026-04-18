---
name: strapi-permissions-audit
description: Audit the play14 Strapi API against the permissions bootstrap in `packages/api/src/bootstrap/permissions/` to find missing action constants, unassigned roles, and dead permission entries. Trigger proactively whenever the user mentions permissions, RBAC, 403, "forbidden", adds or renames a Strapi route/controller/custom-action, or modifies any file under `packages/api/src/api/*/routes/` or `packages/api/src/api/*/controllers/`. Missing permission entries cause silent 403s in production — always run this after any API change, even small ones, not only when the user explicitly asks.
---

# strapi-permissions-audit

Every Strapi endpoint in play14 is gated through `packages/api/src/bootstrap/permissions/{actions.ts,definitions.ts}`. When a route exists but no constant in `actions.ts` exposes its action ID, or no entry in `definitions.ts` assigns a minimum role, the role-based access check silently rejects the request with a 403. This skill finds those gaps before they reach production.

## Files and truth sources

- **Scanned (read-only)**: `packages/api/src/api/*/routes/*.ts`, `packages/api/src/api/*/controllers/*.ts`.
- **Truth source (read + patch on request)**:
  - `packages/api/src/bootstrap/permissions/actions.ts` — grouped `<GROUP>_ACTIONS` constants, each mapping `KEY → "api::<model>.<controller>.<method>"`.
  - `packages/api/src/bootstrap/permissions/definitions.ts` — array of `{ action: GROUP.KEY, minimumRole: ROLE_TYPES.<X> }`.
- **Role hierarchy** (from `packages/api/src/bootstrap/permissions/types.ts`): `PUBLIC < PLAYER < HOST < MENTOR < FOUNDER`.

## Out of scope

- Plugin routes (`plugin::users-permissions.*`, `plugin::upload.*`, `plugin::i18n.*`, etc.) — these live under `plugin::` IDs and are already wired up. The audit deliberately skips them.

## Workflow

### 1. Run the audit script

From the repo root:

```bash
python3 .claude/skills/strapi-permissions-audit/scripts/audit_permissions.py packages/api
```

Output is JSON with three categories. Exit code is `0` when clean, `1` when gaps were found.

- **untracked** — a route or custom-controller action exists but no constant in `actions.ts` matches it. Cause of silent 403 on the endpoint itself.
- **unassigned** — an `actions.ts` constant exists but no entry in `definitions.ts` maps it to a minimum role. Cause of silent 403 once the route hits the role check.
- **dead** — a `definitions.ts` entry points at an action with no matching route/controller. Not a bug but clutter from past refactors.

### 2. Present the findings

Group by severity:

- **Critical**: `untracked` + `unassigned` (silent 403 in production).
- **Cleanup**: `dead` (no functional impact).

For each item, cite the file path where the action was detected so the user can jump there.

### 3. Patch interactively

#### Untracked

Propose a constant name matching the existing convention: `<SHOUTY_SNAKE>_ACTIONS.<KEY>`. For a standard CRUD gap on `api::foo.foo.find`, the constant is `FOO_ACTIONS.FIND`. For a custom action like `api::event.custom-event.publishEvent`, it's `EVENT_ACTIONS.PUBLISH_EVENT`.

Ask the user where to place it:
- If `<GROUP>_ACTIONS` already exists in `actions.ts`, add the new key at the bottom of that object.
- Otherwise, create a new section using the existing `// ==================== <GROUP> ====================` comment convention.

#### Unassigned

Ask for the minimum role. Default suggestions:

| Action kind                                                      | Suggested minimum role |
| ---------------------------------------------------------------- | ---------------------- |
| `find`, `findOne` on public content (articles, games, venues)    | `PUBLIC` or `PLAYER`   |
| `find`, `findOne` on auth-gated content                          | `PLAYER`               |
| Standard CRUD `create`, `update`, `delete`                       | `FOUNDER`              |
| Event-host mutations (`createEvent`, `updateEvent`, `publishEvent`, `uploadImage`, …) | `HOST`                 |
| Admin-library mutations (`liked-item.*`, `content-type-builder.*`) | `FOUNDER`              |
| Stripe webhooks / public lookup (`handle*Webhook`, `getAvailable*Tickets`, `getOrderStatus`) | `PUBLIC`               |
| AI / newsletter / moderation                                     | `FOUNDER`              |

Always confirm the suggestion before patching.

Place the new entry under the matching role section in `definitions.ts` — the file groups entries under `// ==================== PUBLIC ROLE ====================`, `PLAYER ROLE`, `HOST ROLE`, `FOUNDER ROLE` comments. Preserve that grouping.

When adding a new `<GROUP>_ACTIONS` import to `definitions.ts`, insert it alphabetically within the existing import block.

#### Dead

Ask whether to delete the dead entries or restore the missing route. Deleting is usually right — if the route came back, the next audit will surface it as untracked.

### 4. Verify

Run both in parallel:

```bash
bun --filter play14-api typecheck
bun --filter play14-api check
```

Then re-run the audit script. A clean bill should print `"summary": { "untracked": 0, "unassigned": 0, ... }` and exit `0`.

### 5. Remind the user to restart Strapi

The bootstrap only syncs permissions on app boot. Suggest:

```bash
bun --filter play14-api dev
```

and have the user watch the startup logs — a clean sync confirms the grants landed. Silent startup that still 403s means the action ID in the route handler doesn't match the constant in `actions.ts`.

## Known limitations of the script

- Custom-controller scanning uses a regex that matches methods whose first parameter is `ctx` (Strapi's Koa context). Helper methods that don't take `ctx` are ignored — this is intentional to avoid false positives from utility functions. If a custom action has a non-standard signature, the audit may miss it; mention this possibility to the user if the controller file contains unusual shapes.
- Routes that dynamically compute their handler strings (rare) are not detected. Strapi convention in this codebase is static string handlers, so this is almost never an issue.

## Why this matters

The bootstrap is the one mechanism between "the route is exposed" and "the RBAC hierarchy actually enforces roles". Drift is silent: the route responds (with 403), tests pass unless they exercise real auth, and only real users hit the wall. Run this skill every time a custom action is added, renamed, or removed — that's the one habit that prevents the whole class of bugs.
