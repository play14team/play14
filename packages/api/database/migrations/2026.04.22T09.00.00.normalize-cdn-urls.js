/**
 * Migration: Normalize CDN URLs to this environment's STORAGE_CDN_URL
 *
 * The platform has had two CDN hosts historically:
 *   1. `play14-cdn.azureedge.net` (Azure Blob + CDN, pre-Cellar era — now
 *      defunct, any remaining URL triggers `getaddrinfo ENOTFOUND`).
 *   2. `cdn.play14.org` (Cellar prod CDN, fronted by Cloudflare).
 *
 * Both should resolve to the current environment's STORAGE_CDN_URL so every
 * env serves files from its own bucket — prod from `cdn.play14.org`, staging
 * from `cdn-staging.play14.org`, local dev from its MinIO base URL.
 *
 * Per-env behaviour:
 *   - Prod (STORAGE_CDN_URL=https://cdn.play14.org): Azure references rewrite
 *     to prod CDN, and any stray `http://cdn.play14.org` bumps to https.
 *     `https://cdn.play14.org -> itself` is skipped as a no-op.
 *   - Staging (STORAGE_CDN_URL=https://cdn-staging.play14.org): Azure + prod
 *     references rewrite to staging's own bucket, ending the cross-env bleed
 *     where staging DB rows (restored from prod dumps) served images from
 *     prod's Cellar. Assumes staging's Cellar holds the referenced assets;
 *     if the bucket is sparse, URLs will 404 after rewrite.
 *   - Local (STORAGE_CDN_URL=http://localhost:9100/play14-uploads): rewrites
 *     to the local MinIO path-style URL. Works because the `play14-minio-init`
 *     container seeds MinIO from the prod asset dump.
 *
 * What this touches:
 *   1. `files.url` + `files.formats` (Strapi upload plugin).
 *   2. A generic sweep across every `text` / `varchar` / `json` / `jsonb`
 *      column in the current schema, minus migration bookkeeping and the
 *      already-handled `files` table. This covers CKEditor rich-text embeds
 *      in articles/events/games/home/etc., component tables, and
 *      `strapi_core_store_settings.value`.
 *
 * Scope safety: the rewrite is anchored on `<scheme>://<host>/strapi-uploads/`
 * rather than just the hostname. That excludes prose mentions of the bare
 * domain (e.g. "our assets live at cdn.play14.org") from being rewritten
 * while still matching every stored asset URL, which always carries the
 * `/strapi-uploads/` prefix per Strapi's upload-provider layout.
 *
 * Runs inside a single `knex.transaction` so a mid-migration failure leaves
 * the DB unchanged rather than half-rewritten.
 *
 * Idempotent: once all OLD_BASES have been rewritten, re-running finds zero
 * matches and is a no-op. Skips entirely when STORAGE_CDN_URL is unset
 * rather than writing `undefined` into URLs.
 */

// Scoped to the upload path prefix so the rewrite only touches asset URLs,
// never a prose mention of the bare domain in a CKEditor article. `/strapi-uploads/`
// is Strapi's consistent bucket prefix (defaultPath="assets" beneath it).
const UPLOAD_PATH = "/strapi-uploads/"

const OLD_BASES = [
  `https://play14-cdn.azureedge.net${UPLOAD_PATH}`,
  `http://play14-cdn.azureedge.net${UPLOAD_PATH}`,
  `https://cdn.play14.org${UPLOAD_PATH}`,
  `http://cdn.play14.org${UPLOAD_PATH}`,
]

const EXCLUDED_TABLES = new Set([
  "files",
  "strapi_migrations",
  "strapi_migrations_internal",
  "strapi_database_schema",
])

const TEXTUAL_TYPES = ["text", "character varying", "json", "jsonb"]

export async function up(knex) {
  console.log("Starting migration: normalize CDN URLs to STORAGE_CDN_URL")

  const cdnBase = process.env.STORAGE_CDN_URL?.replace(/\/+$/, "")
  if (!cdnBase) {
    console.log("STORAGE_CDN_URL is not set — skipping migration")
    return
  }

  // Compose the canonical asset prefix for this environment. OLD_BASES include
  // the /strapi-uploads/ suffix too, so the REPLACE operation swaps the full
  // scheme+host+upload-path atomically while preserving the key tail.
  const newPrefix = `${cdnBase}${UPLOAD_PATH}`
  const substitutions = OLD_BASES.filter((old) => old !== newPrefix).map((old) => [old, newPrefix])

  if (substitutions.length === 0) {
    console.log(`Target ${newPrefix} matches every known old base — nothing to do`)
    return
  }

  console.log(`Target prefix: ${newPrefix}`)
  for (const [old, next] of substitutions) {
    console.log(`  will rewrite: ${old} -> ${next}`)
  }

  // Wrap the whole migration in a single transaction so a mid-run failure
  // can't leave the DB half-rewritten. Strapi's migrator typically wraps
  // migrations in a transaction already, but being explicit is cheap
  // insurance and makes the guarantee self-documenting.
  await knex.transaction(async (trx) => {
    const filesRewritten = await rewriteFilesTable(trx, substitutions)
    const sweepRewritten = await sweepTextualColumns(trx, substitutions)

    console.log(
      `Migration complete: ${filesRewritten} file row column(s) rewritten, ${sweepRewritten} other row(s) rewritten`
    )
  })
}

/**
 * Intentionally a no-op. The forward rewrite collapses every historical
 * CDN host onto STORAGE_CDN_URL, so we can't reconstruct which rows were
 * originally Azure vs. cdn.play14.org vs. localhost. Operators rolling
 * back must restore from backup.
 */
export async function down() {
  console.log("Rollback skipped: CDN URL rewrite is not safely reversible")
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

  // Errors propagate so the wrapping `knex.transaction(...)` in `up()` rolls
  // back cleanly. Swallowing them here would let Strapi mark the migration as
  // run with a half-rewritten DB — leaving stale Azure URLs that 404 in prod.
  return await knex(table)
    .whereRaw(matchClause, [pattern])
    .update({ [column]: knex.raw(replaceExpr, [oldPrefix, newPrefix]) })
}
