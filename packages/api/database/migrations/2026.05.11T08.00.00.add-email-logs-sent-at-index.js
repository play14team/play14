// The cleanOldEmailLogs cron deletes `WHERE sent_at < cutoff` daily; without
// this index it would seq-scan the full 90-day audit log every run.
//
// Migrations run before Strapi bootstraps, so `strapi.log` isn't available
// here — `console.log` is the right tool, not a style drift.

const INDEX_NAME = "email_logs_sent_at_idx"

async function indexExists(knex) {
  const row = await knex("pg_indexes")
    .where({ indexname: INDEX_NAME, schemaname: "public" })
    .first()
  return !!row
}

export async function up(knex) {
  const hasTable = await knex.schema.hasTable("email_logs")
  if (!hasTable) {
    console.log("email_logs table does not exist yet, skipping (will be created by schema sync)")
    return
  }

  if (await indexExists(knex)) {
    console.log(`Index ${INDEX_NAME} already exists, skipping`)
    return
  }

  console.log(`Creating index ${INDEX_NAME} on email_logs(sent_at)`)
  await knex.schema.table("email_logs", (table) => {
    table.index(["sent_at"], INDEX_NAME)
  })
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("email_logs")
  if (!hasTable) return

  if (!(await indexExists(knex))) return

  console.log(`Dropping index ${INDEX_NAME}`)
  await knex.schema.table("email_logs", (table) => {
    table.dropIndex(["sent_at"], INDEX_NAME)
  })
}
