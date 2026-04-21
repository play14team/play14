/**
 * Migration: Rewrite legacy Azure CDN URLs to this environment's STORAGE_CDN_URL
 *
 * The platform was previously hosted behind `play14-cdn.azureedge.net` (Azure
 * Blob + CDN). After the move to Clever Cloud Cellar the hostname no longer
 * resolves, so any stored URL that still points at it produces
 * `getaddrinfo ENOTFOUND` errors on SSR pages and 500s in Next.js `<Image>`.
 *
 * The Cellar bucket kept the same key layout (`strapi-uploads/assets/...`),
 * so swapping the origin is safe and sufficient:
 *   https://play14-cdn.azureedge.net/<key>  ->  ${STORAGE_CDN_URL}/<key>
 *
 * Reading the target from STORAGE_CDN_URL (not a hardcoded host) means this
 * works on every environment: prod rewrites to `https://cdn.play14.org`,
 * staging to `https://cdn-staging.play14.org`, and local to the MinIO base
 * URL (e.g. `http://localhost:9100/play14-uploads`). Skips with a log when
 * the env var is unset to avoid corrupting URLs with `undefined`.
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

  const substitutions = buildSubstitutions()
  if (substitutions.length === 0) {
    console.log("STORAGE_CDN_URL is not set — skipping migration to avoid corrupting URLs")
    return
  }

  const filesRewritten = await rewriteFilesTable(knex, substitutions)
  const sweepRewritten = await sweepTextualColumns(knex, substitutions)

  console.log(
    `Migration complete: ${filesRewritten} file row column(s) rewritten, ${sweepRewritten} other row(s) rewritten`
  )
}

export async function down() {
  console.log("Rollback skipped: host rewrite is non-destructive and not safely reversible")
}

// Build a list of [oldPrefix, newPrefix] pairs that replace the full URL
// origin (scheme + host + any path component in STORAGE_CDN_URL). Replacing
// the origin — not just the hostname — lets this work on envs where the
// target protocol or path differs from Azure's, e.g. local MinIO at
// `http://localhost:9100/play14-uploads`.
function buildSubstitutions() {
  const base = process.env.STORAGE_CDN_URL?.replace(/\/+$/, "")
  if (!base) return []
  return OLD_HOSTS.flatMap((host) => [
    [`https://${host}`, base],
    [`http://${host}`, base],
  ])
}

async function rewriteFilesTable(knex, substitutions) {
  const hasFiles = await knex.schema.hasTable("files")
  if (!hasFiles) {
    console.log("files table not found, skipping upload URL rewrite")
    return 0
  }

  let totalRewritten = 0

  for (const [oldPrefix, newPrefix] of substitutions) {
    const pattern = `%${oldPrefix}%`

    if (await knex.schema.hasColumn("files", "url")) {
      const updated = await knex("files")
        .where("url", "like", pattern)
        .update({ url: knex.raw("REPLACE(url, ?, ?)", [oldPrefix, newPrefix]) })
      if (updated > 0) {
        console.log(`  files.url: ${updated} row(s) rewritten (${oldPrefix} -> ${newPrefix})`)
        totalRewritten += updated
      }
    }

    if (await knex.schema.hasColumn("files", "formats")) {
      const updated = await knex("files")
        .whereRaw("formats::text LIKE ?", [pattern])
        .update({
          formats: knex.raw("REPLACE(formats::text, ?, ?)::jsonb", [oldPrefix, newPrefix]),
        })
      if (updated > 0) {
        console.log(`  files.formats: ${updated} row(s) rewritten (${oldPrefix} -> ${newPrefix})`)
        totalRewritten += updated
      }
    }
  }

  return totalRewritten
}

async function sweepTextualColumns(knex, substitutions) {
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
    for (const [oldPrefix, newPrefix] of substitutions) {
      const rewritten = await rewriteColumn(knex, {
        table: table_name,
        column: column_name,
        dataType: data_type,
        oldPrefix,
        newPrefix,
      })
      if (rewritten > 0) {
        console.log(`  ${table_name}.${column_name} (${data_type}): ${rewritten} row(s) rewritten`)
        totalRewritten += rewritten
      }
    }
  }

  return totalRewritten
}

async function rewriteColumn(knex, { table, column, dataType, oldPrefix, newPrefix }) {
  const pattern = `%${oldPrefix}%`
  const isJson = dataType === "json" || dataType === "jsonb"
  const quotedColumn = `"${column}"`

  const matchClause = isJson ? `${quotedColumn}::text LIKE ?` : `${quotedColumn} LIKE ?`
  const replaceExpr = isJson
    ? `REPLACE(${quotedColumn}::text, ?, ?)::${dataType}`
    : `REPLACE(${quotedColumn}, ?, ?)`

  try {
    return await knex(table)
      .whereRaw(matchClause, [pattern])
      .update({ [column]: knex.raw(replaceExpr, [oldPrefix, newPrefix]) })
  } catch (error) {
    console.log(`  SKIP ${table}.${column}: ${error.message}`)
    return 0
  }
}
