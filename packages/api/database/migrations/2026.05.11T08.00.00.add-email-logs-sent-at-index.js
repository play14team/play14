// The cleanOldEmailLogs cron deletes `WHERE sent_at < cutoff` daily; without
// this index it would seq-scan the full 90-day audit log every run.

export async function up(knex) {
  const hasTable = await knex.schema.hasTable("email_logs")
  if (!hasTable) {
    console.log("email_logs table does not exist yet, skipping (will be created by schema sync)")
    return
  }

  const indexName = "email_logs_sent_at_idx"
  const indexExists = await knex("pg_indexes")
    .where("indexname", indexName)
    .first()
    .then((result) => !!result)

  if (indexExists) {
    console.log(`Index ${indexName} already exists, skipping`)
    return
  }

  console.log(`Creating index ${indexName} on email_logs(sent_at)`)
  await knex.schema.raw(`CREATE INDEX ${indexName} ON email_logs(sent_at)`)
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("email_logs")
  if (!hasTable) return

  const indexName = "email_logs_sent_at_idx"
  const indexExists = await knex("pg_indexes")
    .where("indexname", indexName)
    .first()
    .then((result) => !!result)

  if (!indexExists) return

  console.log(`Dropping index ${indexName}`)
  await knex.schema.raw(`DROP INDEX ${indexName}`)
}
