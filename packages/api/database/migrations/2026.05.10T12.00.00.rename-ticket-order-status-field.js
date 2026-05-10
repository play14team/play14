/**
 * Migration: Rename 'status' field to 'orderStatus' in ticket-orders table
 *
 * Reason: 'status' is a reserved word in Strapi 5 causing admin panel binding
 * issues — the admin UI rejected legitimate enum values (e.g. 'pending') with
 * "Validation error: Invalid status" because Strapi conflated the custom field
 * with its internal draft/publish state. See pitfall #10 in
 * packages/api/CLAUDE.md.
 *
 * This migration:
 * 1. Renames the 'status' column to 'order_status' in the ticket_orders table.
 * 2. Is idempotent: safe to re-run if a previous attempt partially completed.
 */

export async function up(knex) {
  console.log("Starting migration: Rename ticket-order status field")

  const hasTicketOrdersTable = await knex.schema.hasTable("ticket_orders")
  if (!hasTicketOrdersTable) {
    console.log(
      "ticket_orders table does not exist yet, skipping migration (will be created by schema sync)"
    )
    return
  }

  const hasStatusColumn = await knex.schema.hasColumn("ticket_orders", "status")
  const hasOrderStatusColumn = await knex.schema.hasColumn("ticket_orders", "order_status")

  if (hasStatusColumn && !hasOrderStatusColumn) {
    console.log("Renaming status column to order_status in ticket_orders table")

    await knex.schema.alterTable("ticket_orders", (table) => {
      table.renameColumn("status", "order_status")
    })

    console.log("Successfully renamed status column to order_status")
  } else if (hasOrderStatusColumn) {
    console.log("Column order_status already exists, skipping migration")
  } else {
    console.log("Status column not found, creating order_status column")

    await knex.schema.alterTable("ticket_orders", (table) => {
      table
        .enu("order_status", [
          "draft",
          "pending",
          "processing",
          "paid",
          "cancelled",
          "refunded",
          "partially_refunded",
          "expired",
          "failed",
        ])
        .notNullable()
        .defaultTo("draft")
    })
  }
}

export async function down(knex) {
  console.log("Rolling back migration: Rename ticket-order status field")

  const hasOrderStatusColumn = await knex.schema.hasColumn("ticket_orders", "order_status")
  const hasStatusColumn = await knex.schema.hasColumn("ticket_orders", "status")

  if (hasOrderStatusColumn && !hasStatusColumn) {
    console.log("Renaming order_status column back to status in ticket_orders table")

    await knex.schema.alterTable("ticket_orders", (table) => {
      table.renameColumn("order_status", "status")
    })

    console.log("Successfully renamed order_status column back to status")
  } else {
    console.log("Cannot rollback: status column already exists or order_status column not found")
  }
}
