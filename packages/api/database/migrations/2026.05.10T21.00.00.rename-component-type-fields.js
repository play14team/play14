/**
 * Migration: Rename 'type' field to <componentName>Type on two components
 *
 *   components_contact_social_networks: type -> social_network_type
 *   components_events_media:            type -> media_type
 *
 * Reason: 'type' is on the Strapi 5 reserved-name list (pitfall #10 in
 * packages/api/CLAUDE.md). When admin users edit the parent record's nested
 * component instances (e.g. a player's social-network list), the admin form
 * conflates the custom field with Strapi internals and can reject legitimate
 * values. Renamed pre-emptively for consistency with the
 * `eventStatus`/`orderStatus`/`webhookStatus`/`expectationType` pattern.
 *
 * Component data tables are flat — Strapi stores each component-instance row
 * with the component's own attribute columns plus the parent linkage handled
 * by Strapi's morph join tables. So a plain `renameColumn` on the component
 * table is all that's needed; the parent relationships are unaffected.
 *
 * Both renames are idempotent and packaged as one migration because they share
 * a motivation and a deploy window.
 */

const RENAMES = [
  {
    table: "components_contact_social_networks",
    oldColumn: "type",
    newColumn: "social_network_type",
    fallbackEnum: [
      "Twitter",
      "LinkedIn",
      "Facebook",
      "Youtube",
      "Instagram",
      "Xing",
      "Email",
      "Website",
      "Wikipedia",
      "Vimeo",
      "Other",
    ],
    fallbackNotNull: false,
  },
  {
    table: "components_events_media",
    oldColumn: "type",
    newColumn: "media_type",
    fallbackEnum: ["Photos", "Videos"],
    fallbackNotNull: true,
  },
]

export async function up(knex) {
  console.log("Starting migration: Rename component type fields")

  await knex.transaction(async (trx) => {
    for (const { table, oldColumn, newColumn, fallbackEnum, fallbackNotNull } of RENAMES) {
      const hasTable = await trx.schema.hasTable(table)
      if (!hasTable) {
        console.log(`${table} does not exist yet, skipping (will be created by schema sync)`)
        continue
      }

      const hasOld = await trx.schema.hasColumn(table, oldColumn)
      const hasNew = await trx.schema.hasColumn(table, newColumn)

      if (hasOld && !hasNew) {
        console.log(`Renaming ${oldColumn} -> ${newColumn} on ${table}`)
        await trx.schema.alterTable(table, (t) => {
          t.renameColumn(oldColumn, newColumn)
        })
        console.log(`Successfully renamed ${oldColumn} -> ${newColumn} on ${table}`)
      } else if (hasNew) {
        console.log(`${newColumn} already exists on ${table}, skipping`)
      } else {
        console.log(`${oldColumn} not found on ${table}, creating ${newColumn}`)
        await trx.schema.alterTable(table, (t) => {
          const col = t.enu(newColumn, fallbackEnum)
          if (fallbackNotNull) col.notNullable()
        })
      }
    }
  })
}

export async function down(knex) {
  console.log("Rolling back migration: Rename component type fields")

  await knex.transaction(async (trx) => {
    for (const { table, oldColumn, newColumn } of RENAMES) {
      const hasNew = await trx.schema.hasColumn(table, newColumn)
      const hasOld = await trx.schema.hasColumn(table, oldColumn)

      if (hasNew && !hasOld) {
        console.log(`Renaming ${newColumn} -> ${oldColumn} on ${table}`)
        await trx.schema.alterTable(table, (t) => {
          t.renameColumn(newColumn, oldColumn)
        })
        console.log(`Successfully reverted ${newColumn} -> ${oldColumn} on ${table}`)
      } else {
        console.log(
          `Cannot rollback ${table}: ${oldColumn} already exists or ${newColumn} not found`
        )
      }
    }
  })
}
