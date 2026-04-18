---
name: strapi-content-type-scaffolder
description: Scaffold a new Strapi 5 content type end-to-end in the play14 api package — schema, controller, service, router, optional lifecycle hooks, and the matching permissions bootstrap entries. Use this skill whenever the user asks to create a new content type, Strapi model, Strapi collection, single type, or API resource. Always prefer this skill over hand-writing the files because it guarantees the permissions bootstrap is updated in the same change — a manual scaffold that forgets the bootstrap causes silent 403s in production.
---

# strapi-content-type-scaffolder

Generate a complete Strapi 5 content type under `packages/api/src/api/<singular>/`, plus the matching entries in `packages/api/src/bootstrap/permissions/{actions.ts,definitions.ts}`. The project convention is that every new content type ships with its permissions configured in the same commit — never separately.

## Workflow

### 1. Interactive intake

Use `AskUserQuestion` to collect the following. Batch related questions together so the user isn't answering a 30-question interrogation.

- **singularName** — kebab-case, lowercase. Example: `event-session`.
- **pluralName** — kebab-case, lowercase, plural. Example: `event-sessions`.
- **displayName** — sentence case for the admin panel. Example: `Event session`. Never title-cased ("Event Session" is wrong in this project — sentence case everywhere).
- **collectionName** — snake_case plural for the DB table. Auto-derive from `pluralName` (`-` → `_`) and ask the user to confirm.
- **kind** — `collectionType` (default) or `singleType`.
- **draftAndPublish** — `true` / `false`. Default `false`; only turn on when the user wants an editorial draft/publish workflow (used by `event`, `article`, `home`).
- **needsSlug** — yes/no. When yes, the lifecycle stub auto-generates `slug` from `name` via `toSlug` from `@/libs/strings`, matching the `game`/`tag` lifecycle pattern.
- **needsRevalidation** — yes/no. When yes, the lifecycle triggers frontend revalidation via `triggerContentRevalidation` (same pattern as `game` and `article`). Only say yes when the content type maps to a public-facing web route.
- **fields** — loop until the user is done. Each field: `{ name, type, required?, unique?, default?, min?, max? }`. Supported types are listed below.
- **relations** — loop. Each relation: `{ fieldName, kind, target }` where `kind ∈ {oneToOne, oneToMany, manyToOne, manyToMany}` and `target` is an existing `api::<x>.<x>` id (e.g. `api::event.event`).
- **permissions** — for each of the 5 CRUD actions, ask for the minimum role. Defaults below, but always confirm:
  - `find`, `findOne`: `PUBLIC` for public content (articles, venues), `PLAYER` for auth-gated content.
  - `create`, `update`, `delete`: `FOUNDER` by default; `HOST` for event-facing types where hosts can manage their own resources.

#### Supported Strapi 5 field types

`string`, `text`, `richtext`, `email`, `password`, `enumeration` (prompt for enum values), `integer`, `biginteger`, `float`, `decimal`, `date`, `datetime`, `time`, `boolean`, `json`, `uid` (prompt for `targetField`), `media` (prompt single/multiple + `allowedTypes` — images, videos, files, audios), `relation` (handled via the `relations` loop), `component` (prompt for component UID + `repeatable`), `dynamiczone` (prompt for component UID list).

### 2. Generate the content-type files

Create these files under `packages/api/src/api/<singular>/` by substituting placeholders in the templates at `.claude/skills/strapi-content-type-scaffolder/templates/`:

| Target file                                              | Template               | Always? |
| -------------------------------------------------------- | ---------------------- | ------- |
| `content-types/<singular>/schema.json`                   | `schema.json.tmpl`     | yes     |
| `controllers/<singular>.ts`                              | `controller.ts.tmpl`   | yes     |
| `services/<singular>.ts`                                 | `service.ts.tmpl`      | yes     |
| `routes/<singular>.ts`                                   | `router.ts.tmpl`       | yes     |
| `content-types/<singular>/lifecycles.ts`                 | `lifecycles.ts.tmpl`   | only if `needsSlug=yes` or `needsRevalidation=yes` |

#### Placeholder substitutions

- `{{SINGULAR}}` → `singularName`
- `{{PLURAL}}` → `pluralName`
- `{{DISPLAY_NAME}}` → `displayName`
- `{{COLLECTION_NAME}}` → `collectionName`
- `{{KIND}}` → `collectionType` or `singleType`
- `{{DRAFT_AND_PUBLISH}}` → `true` or `false`
- `{{ATTRIBUTES_JSON}}` → the JSON representation of the `attributes` object, indented to match the surrounding JSON (2 spaces, same style as `packages/api/src/api/event/content-types/event/schema.json`). Build this from the collected fields + relations.

#### Attribute shapes (mirror existing content types)

```json
"name":        { "type": "string", "required": true, "unique": true }
"description": { "type": "text" }
"hostedAt":    { "type": "datetime", "required": true }
"price":       { "type": "decimal", "min": 0 }
"slug":        { "type": "uid", "targetField": "name" }
"status":      { "type": "enumeration", "enum": ["Draft", "Open", "Closed"] }
"cover":       { "type": "media", "multiple": false, "allowedTypes": ["images"] }
"event":       {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::event.event",
  "inversedBy": "sessions"
}
```

**Never** use `status` as a custom field name on content types that also have `draftAndPublish: true` — Strapi 5 reserves `status` internally for the draft/publish state. If the user wants a status-like field on a draft/publish type, propose `<domain>Status` (e.g. `eventStatus`, `orderStatus`).

### 3. Update the permissions bootstrap

Update `packages/api/src/bootstrap/permissions/actions.ts`:

```typescript
// ==================== <GROUP> ====================
export const <GROUP>_ACTIONS = {
  FIND: "api::<singular>.<singular>.find",
  FIND_ONE: "api::<singular>.<singular>.findOne",
  CREATE: "api::<singular>.<singular>.create",
  UPDATE: "api::<singular>.<singular>.update",
  DELETE: "api::<singular>.<singular>.delete",
} as const
```

where `<GROUP>` is `singularName.toUpperCase().replace(/-/g, "_")`. For `event-session`: `EVENT_SESSION_ACTIONS`.

Place the new block in an appropriate section of `actions.ts`. If it's a standard CRUD content type, under `// ==================== CONTENT TYPES (CRUD) ====================`. If it's a domain-specific resource, create its own section.

Update `packages/api/src/bootstrap/permissions/definitions.ts`:

1. Add `<GROUP>_ACTIONS` to the import block, in alphabetical order.
2. For each of the 5 CRUD actions, add an entry under the role section matching the chosen minimum role:

```typescript
{ action: <GROUP>_ACTIONS.FIND, minimumRole: ROLE_TYPES.PUBLIC },
{ action: <GROUP>_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.PUBLIC },
{ action: <GROUP>_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
{ action: <GROUP>_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
{ action: <GROUP>_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },
```

Respect the existing section comments (`PUBLIC ROLE`, `PLAYER ROLE`, `HOST ROLE`, `FOUNDER ROLE`). Spread entries across sections if their roles differ.

### 4. Verify

Run both in parallel after all files are written:

```bash
bun --filter play14-api typecheck
bun --filter play14-api check
```

If typecheck flags ambient Strapi types on a relation target (common with custom relations not yet in the generated type tree), advise the user that running `bun --filter play14-api strapi ts:generate-types` — which `strapi develop` does on boot — will refresh them.

### 5. Post-scaffold checklist for the user

Print this as a final checklist:

1. **Start Strapi** to auto-migrate the DB schema and sync permissions:
   ```bash
   bun --filter play14-api dev
   ```
   Watch the logs for a clean startup — permission sync failures are logged loudly.

2. **If a relation was added**, open the target content type's `schema.json` (e.g. `packages/api/src/api/event/content-types/event/schema.json`) and add the inverse side (`inversedBy` on the owning side, or `mappedBy` on the other). The scaffolder does not modify the target content type.

3. **Regenerate Strapi's TS types** once Strapi is running, so IDE completions for the new content type appear:
   ```bash
   bun --filter play14-api strapi ts:generate-types
   ```

4. **Commit** using the conventional-commit convention:
   ```bash
   git commit -m "feat(api): add <display name> content type"
   ```

## File conventions

All generated files follow the repo Biome config:

- 2-space indentation, LF endings, trailing newline.
- Double quotes.
- Semicolons only where required (Biome's `asNeeded` style).
- ESM imports.

Never hand-edit the generated files to re-add semicolons or switch quotes — Biome will fight you. Run `bun --filter play14-api check` to have Biome confirm.

## Templates

See `templates/` beside this SKILL.md. Each template uses `{{PLACEHOLDER}}` syntax and must be read, substituted, and written with the `Write` tool (never copied via shell — that bypasses project conventions).
