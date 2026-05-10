---
name: rename-strapi-attribute
description: Rename an attribute (column) on a Strapi 5 content type in the play14 monorepo end-to-end — schema, idempotent Knex migration, every API/web code reference, generated types, tests, and response payloads. Trigger proactively whenever the user wants to rename a Strapi field, mentions "rename column", "rename attribute", `eventStatus`-style naming conflicts, or any of the Strapi 5 reserved field names (`status`, `type`, `state`, `id`). Skipping a single reference causes silent admin-UI validation errors ("Validation error: Invalid status") or runtime breakage on the frontend, so this skill must be used instead of doing the rename by hand — even if the user asks for "just" the schema change.
---

# rename-strapi-attribute

Renaming a Strapi 5 attribute looks like a one-line schema change. It isn't. The field name appears in the schema, the DB column, every Document Service query, every controller's update/create payload, the response shape returned to the web app, the web app's TypeScript types, the auto-generated `contentTypes.d.ts`, the test factories, the test mocks, and the integration test assertions. Miss any one of them and you get either a silent 403 / 500 in production or — worse — the admin UI's "Validation error: Invalid status" because Strapi 5 conflates custom field names like `status` with its internal draft/publish state.

This procedure has been executed twice in the repo:
- `event.status → eventStatus` — see `packages/api/database/migrations/2025.11.07T08.15.00.rename-event-status-field.js`
- `ticket-order.status → orderStatus` — see `packages/api/database/migrations/2026.05.10T12.00.00.rename-ticket-order-status-field.js`

Both follow the exact same pattern. Use those files as the migration template.

## Strapi 5 reserved-name trap

Pitfall #10 in `packages/api/CLAUDE.md` lists this. The fields `status`, `type`, `state`, and `id` are reserved by Strapi 5 internals (`status` powers draft/publish state). Even with `"draftAndPublish": false` set in the schema options, the admin UI's edit form still rejects writes with "Validation error: Invalid status" because Strapi conflates the field with the publication-state enum. **There is no fix other than renaming the field**. Use this skill whenever such a name conflict surfaces.

The convention in this repo is `<entity><Suffix>` — `eventStatus`, `ticketStatus`, `orderStatus`, `accountStatus`, `chargeStatus`. Match that.

## Inputs

Confirm with the user before starting:

- **Content type** — e.g. `api::ticket-order.ticket-order`. Find via `ls packages/api/src/api/`.
- **Old attribute name** — e.g. `status` (camelCase, as in `schema.json`).
- **New attribute name** — e.g. `orderStatus` (camelCase). Suggest the `<entity><Suffix>` form when the conflict is with a reserved name.
- **Old DB column** — derived from the old attribute via Strapi's snake_case rule: `orderStatus → order_status`. Confirm with `\d ticket_orders` if there's any ambiguity.
- **New DB column** — same derivation: `orderStatus → order_status`.

## Workflow

Always work on a feature branch (`feat/rename-<type>-<oldname>`), never on `main`. Both pushes to `main` auto-deploy.

### 1. Confirm the target via grep

Before any edits, audit the blast radius. The agent should never blindly trust the inventory — it should run greps and report exactly which files contain references to the old name in the context of the chosen content type.

Run from the repo root:

```bash
# API code (excluding Stripe, ticket, event status references that are unrelated)
rg -n --type ts "\\b<oldName>\\b" packages/api/src/

# Web code
rg -n --type ts -t tsx "\\b<oldName>\\b" packages/web/src/

# Generated types
grep -n "<oldName>" packages/api/types/generated/contentTypes.d.ts
```

Critically, separate the matches into:
- **HIGH confidence** — references on objects fetched from `strapi.documents("api::<type>.<type>")`, or in payloads of `update`/`create`/`findOne`/`findMany` against that content type, or in Knex queries against the underlying table.
- **LOW / unrelated** — `ticketStatus`, `eventStatus`, `accountStatus`, `processed_webhooks.status`, Stripe API objects, HTTP `response.status`/`ctx.status`, Prometheus counter labels, draft/publish status. **Do not touch these.**

Present the audited list to the user before making changes. They should sign off on the file list.

### 2. Update the schema

Edit `packages/api/src/api/<type>/content-types/<type>/schema.json`:

```diff
-    "status": {
+    "orderStatus": {
       "type": "enumeration",
       "enum": [...],
       "default": "draft",
       "required": true
     },
```

Only rename the key — preserve enum values, default, required, etc.

### 3. Generate the migration

Strapi will not auto-rename DB columns when the JSON attribute key changes — it would just ADD a new column and orphan the old one. You MUST write a Knex migration.

Create `packages/api/database/migrations/<TIMESTAMP>.rename-<type>-<oldname>-field.js` using the timestamp format the existing migrations use (e.g., `2026.05.10T12.00.00`). Match this template exactly (it's idempotent — safe to re-run, safe across fresh installs):

```js
/**
 * Migration: Rename '<oldName>' field to '<newName>' in <pluralType> table
 *
 * Reason: <explain why — e.g. reserved-name conflict in Strapi 5 admin UI>
 */

export async function up(knex) {
  console.log("Starting migration: Rename <type> <oldName> field")

  const hasTable = await knex.schema.hasTable("<plural_type>")
  if (!hasTable) {
    console.log("<plural_type> table does not exist yet, skipping migration (will be created by schema sync)")
    return
  }

  const hasOldColumn = await knex.schema.hasColumn("<plural_type>", "<old_column>")
  const hasNewColumn = await knex.schema.hasColumn("<plural_type>", "<new_column>")

  if (hasOldColumn && !hasNewColumn) {
    console.log("Renaming <old_column> column to <new_column> in <plural_type> table")
    await knex.schema.alterTable("<plural_type>", (table) => {
      table.renameColumn("<old_column>", "<new_column>")
    })
    console.log("Successfully renamed <old_column> column to <new_column>")
  } else if (hasNewColumn) {
    console.log("Column <new_column> already exists, skipping migration")
  } else {
    // Neither column exists — fresh install. Create with the new name.
    // (Match the original schema's enum/default/required if applicable.)
    console.log("<old_column> column not found, creating <new_column> column")
    await knex.schema.alterTable("<plural_type>", (table) => {
      // table.enu("<new_column>", [...]).notNullable().defaultTo("...")
    })
  }
}

export async function down(knex) {
  console.log("Rolling back migration: Rename <type> <oldName> field")

  const hasNewColumn = await knex.schema.hasColumn("<plural_type>", "<new_column>")
  const hasOldColumn = await knex.schema.hasColumn("<plural_type>", "<old_column>")

  if (hasNewColumn && !hasOldColumn) {
    await knex.schema.alterTable("<plural_type>", (table) => {
      table.renameColumn("<new_column>", "<old_column>")
    })
    console.log("Successfully renamed <new_column> column back to <old_column>")
  } else {
    console.log("Cannot rollback: <old_column> column already exists or <new_column> column not found")
  }
}
```

### 4. Update API code references

For each file flagged HIGH-confidence in step 1, apply these patterns. Be surgical — never use blind `replace_all` because the same attribute name can appear in unrelated contexts.

**Document Service queries** (`strapi.documents("api::<type>.<type>")`):

```diff
- filters: { status: "pending" }
+ filters: { orderStatus: "pending" }

- fields: ["status", "paidAt"]
+ fields: ["orderStatus", "paidAt"]

- data: { status: "paid", paidAt: ... }
+ data: { orderStatus: "paid", paidAt: ... }

- if (order.status === "paid")
+ if (order.orderStatus === "paid")
```

**Knex direct queries** (use the snake_case column name):

```diff
- knex("<plural>").where("<old_column>", "pending").update({ <old_column>: "processing" })
+ knex("<plural>").where("<new_column>", "pending").update({ <new_column>: "processing" })
```

**Response payloads** (controllers returning shaped objects to the frontend) — rename both the destructure and the response key, since the frontend reads the response key:

```diff
- return ctx.send({ data: { ..., status: order.status, ... } })
+ return ctx.send({ data: { ..., orderStatus: order.orderStatus, ... } })
```

**Populate `fields` arrays** in queries from OTHER content types that reference this one:

```diff
- order: { fields: ["orderNumber", "status"] }
+ order: { fields: ["orderNumber", "orderStatus"] }
```

**Lifecycle hooks** (`packages/api/src/api/<type>/content-types/<type>/lifecycles.ts`):

```diff
- const newStatus = result.status
+ const newStatus = result.orderStatus
```

**Cron tasks** in `packages/api/src/services/cron/` — same patterns: filters, Knex updates, document data.

### 5. Update test fixtures and assertions

Three places to touch:

- `packages/api/src/test-utils/factories/<type>.ts` — rename in the `OrderFixture`/`<Type>Fixture` interface AND in every default override (`createOrder`, `createPaidOrder`, `createCancelledOrder`, etc.).
- `packages/api/src/test-utils/seed-database.ts` — rename in the `Test<Type>` interface, the partial-data type, and the response shape returned by the seed helper.
- Integration tests in `packages/api/src/__integration__/` — rename `expect(order.status).toBe(...)` assertions, but **leave** `expect(response.status).toBe(200)` (HTTP response status) and `status: "open"` / `status: "requires_payment_method"` in Stripe mock state (those are Stripe API objects, not your content type).
- Unit tests with `mockResolvedValue({ status: "..." })` and `expect(...).toHaveBeenCalledWith({ data: { status: "..." } })` — rename when the mock is for `strapi.documents("api::<type>.<type>")`. Leave when it's for `processed_webhooks` or other tables.

### 6. Update web app references

For every file in `packages/web/src/` flagged in step 1:

- TypeScript response interfaces (`OrderStatusResponse`, `MyOrderSummary`, etc., usually in `*.action.ts`) — rename the field.
- Components reading `order.status` — rename to `order.orderStatus`. Use `replace_all` only within a single file when you're certain every match in that file refers to the same content type.
- Any switch/case helpers (`getStatusBadgeClass`) typically take a `status: string` parameter — those don't need to change unless the parameter is named after the field; renaming `status` → `orderStatus` in the parameter name is optional polish, not required.

### 7. Update generated types

Strapi regenerates `packages/api/types/generated/contentTypes.d.ts` on next build, but for the typecheck to pass NOW (pre-build), edit it by hand:

```diff
     reservationCreatedAt: Schema.Attribute.DateTime;
     reservationExpiresAt: Schema.Attribute.DateTime;
-    status: Schema.Attribute.Enumeration<
+    orderStatus: Schema.Attribute.Enumeration<
       [
         'draft',
         ...
       ]
     >;
```

### 8. Verify

In order:

```bash
bun --filter play14-api typecheck  # must exit 0
bun --filter play14-web typecheck  # must exit 0
bun --filter play14-api test       # all pre-existing tests still pass
bun --filter play14-web test       # all pre-existing tests still pass
bun run check                      # biome lint + format check
```

If a typecheck error mentions a path you didn't touch, re-run step 1's grep with the OLD name — you missed a reference. Don't comment out the failing line; find the missed file and fix it properly.

### 9. Commit message

Use a `refactor(api):` commit. Include the reserved-name reason if applicable:

```
refactor(api): rename <type> <oldName> field to <newName>

`<oldName>` is a reserved name in Strapi 5 — the admin UI conflated the
custom enum with the internal draft/publish state and rejected legitimate
values when editing records. Same fix as the prior `<other>.<oldName> ->
<other><NewName>` rename, applied across the <type> content type, the
API, the web app, and the test fixtures, with a Knex migration to rename
the underlying column.
```

## Things people forget (checklist)

Use this as the final pass before declaring done:

- [ ] `schema.json` attribute key renamed
- [ ] Migration file created with idempotent up/down + fresh-install branch
- [ ] All `documents("api::<type>.<type>")` calls — filters, fields, data, populate
- [ ] All Knex `where(...)`/`update({...})` against the renamed column
- [ ] Response payloads in controllers (the field exposed to the frontend)
- [ ] `fields: [...]` populate arrays in OTHER content types referencing this one
- [ ] Lifecycle hooks reading `result.<oldName>`
- [ ] Cron tasks
- [ ] Test factories (interface + every override function)
- [ ] `seed-database.ts` (interface + partial type + response shape)
- [ ] Integration tests — content-type assertions (NOT HTTP `response.status`)
- [ ] Unit test mocks — only mocks for this content type, not unrelated tables
- [ ] All web-app components and `*.action.ts` response interfaces
- [ ] `contentTypes.d.ts`
- [ ] All five next-intl locale files if any UI label changed (e.g. status badges) — invoke the `i18n-sync` skill
- [ ] `bun --filter play14-api typecheck && bun --filter play14-web typecheck && bun run check` all clean
- [ ] `bun --filter play14-api test && bun --filter play14-web test` both pass
- [ ] Migration applied locally and dev server starts (`bun --filter play14-api dev`)

## What NOT to rename

- **Strapi internal `status`** — the draft/publish state. If `"draftAndPublish": true` is set, the schema has an implicit `status` field. That's not your field; never touch it.
- **`processed_webhooks.status`** — idempotency table; values are `processing`/`completed`/`failed`.
- **Other content types' status fields** — `ticketStatus`, `eventStatus`, `accountStatus`, `paymentStatus`, etc. Each is its own content type.
- **HTTP `ctx.status` / `response.status`** — Koa/HTTP response code.
- **Prometheus counter labels** — `metric.inc({ status: "success" })` is observability metadata, not your field.
- **External API responses** — Stripe `payment_intent.status`, Stripe `refund.status`, etc. — they're Stripe's enum, leave them alone.

## Coordination

When the rename overlaps with a Stripe webhook handler, the `webhook.ts` controller is touched. Consider whether `stripe-webhook-replay` should run after the migration deploys to recover any in-flight orders that hit the conditional update guard during the cutover window.
