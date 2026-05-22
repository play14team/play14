// Enforce a case-insensitive unique constraint on `up_users.email` at the
// database level. Strapi's users-permissions advanced setting
// `unique_email: true` only fires inside `providers.connect` (OAuth) and
// `auth.register` (local password) — direct `documents("plugin::…user").create()`
// calls bypass it, which lets `import-audience-attendees.ts` and the
// player-invitation flow in `custom-player.ts` mint a second row with the
// same email. A functional UNIQUE INDEX on LOWER(email) closes the loophole
// for every code path, including future ones.
//
// Migrations run before Strapi bootstraps, so `strapi.log` isn't available
// here — `console.log` is the right tool, not a style drift.

const INDEX_NAME = "up_users_email_lower_unique"

async function indexExists(knex) {
  const row = await knex("pg_indexes")
    .where({ indexname: INDEX_NAME, schemaname: "public" })
    .first()
  return !!row
}

async function findDuplicateEmails(knex) {
  return knex("up_users")
    .select(knex.raw("LOWER(email) AS email"))
    .count({ count: "*" })
    .whereNotNull("email")
    .groupBy(knex.raw("LOWER(email)"))
    .having(knex.raw("COUNT(*) > 1"))
}

export async function up(knex) {
  const hasTable = await knex.schema.hasTable("up_users")
  if (!hasTable) {
    console.log("up_users table does not exist yet, skipping (will be created by schema sync)")
    return
  }

  if (await indexExists(knex)) {
    console.log(`Index ${INDEX_NAME} already exists, skipping`)
    return
  }

  const duplicates = await findDuplicateEmails(knex)
  if (duplicates.length > 0) {
    const sample = duplicates
      .slice(0, 5)
      .map((d) => `${d.email} (${d.count} rows)`)
      .join(", ")
    throw new Error(
      `Cannot create unique index ${INDEX_NAME} on up_users(LOWER(email)) — ` +
        `${duplicates.length} email address(es) currently have duplicate user rows ` +
        `(sample: ${sample}). Run scripts/cleanup-duplicate-users.ts --apply ` +
        `first, then re-deploy.`
    )
  }

  console.log(`Creating unique index ${INDEX_NAME} on up_users(LOWER(email))`)
  await knex.raw(`CREATE UNIQUE INDEX ?? ON up_users (LOWER(email))`, [INDEX_NAME])
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("up_users")
  if (!hasTable) return

  if (!(await indexExists(knex))) return

  console.log(`Dropping index ${INDEX_NAME}`)
  await knex.raw(`DROP INDEX ??`, [INDEX_NAME])
}
