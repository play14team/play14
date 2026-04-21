/**
 * Migration: Rewrite legacy Azure CDN URLs to cdn.play14.org
 *
 * The platform was previously hosted behind `play14-cdn.azureedge.net` (Azure
 * Blob + CDN). After the move to Clever Cloud Cellar the hostname no longer
 * resolves, so any stored URL that still points at it produces
 * `getaddrinfo ENOTFOUND` errors on SSR pages and 500s in Next.js `<Image>`.
 *
 * The Cellar bucket kept the same key layout (`strapi-uploads/assets/...`),
 * so a host-only rewrite is safe and sufficient:
 *   https://play14-cdn.azureedge.net/<key>  ->  https://cdn.play14.org/<key>
 *
 * What this migration touches:
 *   1. `files.url` + `files.formats` (Strapi upload plugin) — direct rewrite
 *      using SQL REPLACE (text and jsonb).
 *   2. A generic sweep across every `text` / `varchar` / `json` / `jsonb`
 *      column in the current schema (excluding migration bookkeeping and
 *      the already-handled `files` table), only touching rows that actually
 *      contain the legacy host. This covers rich-text bodies (CKEditor
 *      content in articles/games/home/about/etc.), component tables,
 *      `strapi_core_store_settings.value`, and anywhere else the host may
 *      have been embedded.
 *
 * Idempotent: re-running does nothing because matching rows no longer exist.
 */

const OLD_HOSTS = ["play14-cdn.azureedge.net"]
const NEW_HOST = "cdn.play14.org"

// Tables we never want to scan.
const EXCLUDED_TABLES = new Set([
  "files", // handled explicitly below
  "strapi_migrations",
  "strapi_migrations_internal",
  "strapi_database_schema",
])

const TEXTUAL_TYPES = ["text", "character varying", "json", "jsonb"]

export async function up(knex) {
  console.log("Starting migration: rewrite legacy Azure CDN URLs")

  const filesRewritten = await rewriteFilesTable(knex)
  const sweepRewritten = await sweepTextualColumns(knex)

  console.log(
    `Migration complete: ${filesRewritten} file row column(s) rewritten, ${sweepRewritten} other row(s) rewritten`
  )
}

export async function down() {
  console.log("Rollback skipped: host rewrite is non-destructive and not safely reversible")
}

async function rewriteFilesTable(knex) {
  const hasFiles = await knex.schema.hasTable("files")
  if (!hasFiles) {
    console.log("files table not found, skipping upload URL rewrite")
    return 0
  }

  let totalRewritten = 0

  for (const oldHost of OLD_HOSTS) {
    const pattern = `%${oldHost}%`

    if (await knex.schema.hasColumn("files", "url")) {
      const updated = await knex("files")
        .where("url", "like", pattern)
        .update({ url: knex.raw("REPLACE(url, ?, ?)", [oldHost, NEW_HOST]) })
      if (updated > 0) {
        console.log(`  files.url: ${updated} row(s) rewritten (${oldHost})`)
        totalRewritten += updated
      }
    }

    if (await knex.schema.hasColumn("files", "formats")) {
      const updated = await knex("files")
        .whereRaw("formats::text LIKE ?", [pattern])
        .update({
          formats: knex.raw("REPLACE(formats::text, ?, ?)::jsonb", [oldHost, NEW_HOST]),
        })
      if (updated > 0) {
        console.log(`  files.formats: ${updated} row(s) rewritten (${oldHost})`)
        totalRewritten += updated
      }
    }
  }

  return totalRewritten
}

async function sweepTextualColumns(knex) {
  const schemaResult = await knex.raw("SELECT current_schema() AS schema")
  const schemaName = schemaResult.rows[0].schema

  const columns = await knex("information_schema.columns as c")
    .select("c.table_name", "c.column_name", "c.data_type")
    .join("information_schema.tables as t", function () {
      this.on("c.table_schema", "=", "t.table_schema").andOn("c.table_name", "=", "t.table_name")
    })
    .where("c.table_schema", schemaName)
    .andWhere("t.table_type", "BASE TABLE")
    .whereIn("c.data_type", TEXTUAL_TYPES)

  const targets = columns.filter((col) => !EXCLUDED_TABLES.has(col.table_name))

  let totalRewritten = 0

  for (const { table_name, column_name, data_type } of targets) {
    for (const oldHost of OLD_HOSTS) {
      const rewritten = await rewriteColumn(knex, {
        table: table_name,
        column: column_name,
        dataType: data_type,
        oldHost,
      })
      if (rewritten > 0) {
        console.log(`  ${table_name}.${column_name} (${data_type}): ${rewritten} row(s) rewritten`)
        totalRewritten += rewritten
      }
    }
  }

  return totalRewritten
}

async function rewriteColumn(knex, { table, column, dataType, oldHost }) {
  const pattern = `%${oldHost}%`
  const isJson = dataType === "json" || dataType === "jsonb"
  const quotedColumn = `"${column}"`

  const matchClause = isJson ? `${quotedColumn}::text LIKE ?` : `${quotedColumn} LIKE ?`
  const replaceExpr = isJson
    ? `REPLACE(${quotedColumn}::text, ?, ?)::${dataType}`
    : `REPLACE(${quotedColumn}, ?, ?)`

  try {
    return await knex(table)
      .whereRaw(matchClause, [pattern])
      .update({ [column]: knex.raw(replaceExpr, [oldHost, NEW_HOST]) })
  } catch (error) {
    console.log(`  SKIP ${table}.${column}: ${error.message}`)
    return 0
  }
}
