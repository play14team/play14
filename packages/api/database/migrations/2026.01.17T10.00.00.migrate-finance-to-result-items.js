/**
 * Migration: Migrate finance component data to result-line-items
 *
 * This migration converts the legacy finance component data (revenue, expenses, destination)
 * to the new result-line-item structure for better granular tracking.
 *
 * Old structure (finance component on event):
 * - revenue: decimal
 * - expenses: decimal
 * - destination: string (where surplus goes)
 * - result: Profit | Loss (calculated)
 * - resultAmount: decimal (calculated)
 *
 * New structure (result-line-items collection):
 * - Revenue becomes an "other_income" line item
 * - Expenses become an "other_expense" line item
 * - Destination is stored in the revenue item's description
 */

import { randomUUID } from "node:crypto"

// Generate a Strapi-compatible document ID (24 chars, no dashes)
function generateDocumentId() {
  return randomUUID().replace(/-/g, "").substring(0, 24)
}

export async function up(knex) {
  console.log("Starting migration: Migrate finance data to result-line-items")

  // Check if the required tables exist
  const hasEventsTable = await knex.schema.hasTable("events")
  const hasFinanceTable = await knex.schema.hasTable("components_reporting_finances")
  const hasResultItemsTable = await knex.schema.hasTable("result_line_items")

  if (!hasEventsTable) {
    console.log("events table does not exist, skipping migration")
    return
  }

  if (!hasFinanceTable) {
    console.log("components_reporting_finances table does not exist, skipping migration")
    return
  }

  if (!hasResultItemsTable) {
    console.log("result_line_items table does not exist, skipping migration")
    return
  }

  // Check if events_cmps table exists (Strapi 5 component link table)
  const hasEventsCmpsTable = await knex.schema.hasTable("events_cmps")
  if (!hasEventsCmpsTable) {
    console.log("events_cmps table does not exist, skipping migration")
    return
  }

  // Get all finance components linked to events
  const allFinanceLinks = await knex("events_cmps")
    .select("entity_id", "cmp_id")
    .where("component_type", "reporting.finance")

  if (allFinanceLinks.length === 0) {
    console.log("No finance data found to migrate")
    return
  }

  // Get event IDs and their document IDs to deduplicate
  // In Strapi 5, the same document can have multiple rows (draft/published)
  const eventIds = allFinanceLinks.map((l) => l.entity_id)
  const events = await knex("events")
    .select("id", "document_id")
    .whereIn("id", eventIds)

  // Create a map of event_id -> document_id
  const eventDocMap = new Map(events.map((e) => [e.id, e.document_id]))

  // Get all draft event rows (published_at IS NULL) - we need to link to draft versions
  // because the Strapi admin edits the draft version
  const documentIds = [...new Set(events.map((e) => e.document_id))]
  const draftEvents = await knex("events")
    .select("id", "document_id")
    .whereIn("document_id", documentIds)
    .whereNull("published_at")

  // Create a map of document_id -> draft event_id
  const draftEventMap = new Map(draftEvents.map((e) => [e.document_id, e.id]))

  // Deduplicate finance links by document_id (same document may have multiple event rows)
  const seenDocumentIds = new Set()
  const financeLinks = []
  for (const link of allFinanceLinks) {
    const docId = eventDocMap.get(link.entity_id)
    if (docId && !seenDocumentIds.has(docId)) {
      seenDocumentIds.add(docId)
      financeLinks.push(link)
    }
  }

  console.log(`Found ${financeLinks.length} unique events with finance data (${allFinanceLinks.length} total links)`)

  // Get the finance data
  const componentIds = financeLinks.map((l) => l.cmp_id)
  const financeData = await knex("components_reporting_finances")
    .select("*")
    .whereIn("id", componentIds)

  // Create a map of cmp_id -> finance data
  const financeMap = new Map(financeData.map((f) => [f.id, f]))

  let migratedCount = 0
  let skippedCount = 0

  for (const link of financeLinks) {
    const finance = financeMap.get(link.cmp_id)
    const eventDocumentId = eventDocMap.get(link.entity_id)

    // Get the draft event ID for this document (Strapi admin edits draft version)
    const draftEventId = draftEventMap.get(eventDocumentId)
    if (!finance || !eventDocumentId || !draftEventId) {
      console.log(`Skipping link: event_id=${link.entity_id}, cmp_id=${link.cmp_id} - missing data or no draft`)
      skippedCount++
      continue
    }

    // Check if result items already exist for this event (avoid duplicates on re-run)
    // In Strapi 5, relationships are stored in a separate link table
    // Check against draft event ID since that's where we link
    const existingItems = await knex("result_line_items_event_lnk")
      .where("event_id", draftEventId)
      .count("* as count")

    if (Number(existingItems[0].count) > 0) {
      console.log(`Skipping event ${eventDocumentId}: already has ${existingItems[0].count} result items`)
      skippedCount++
      continue
    }

    const now = new Date().toISOString()
    let sortOrder = 0

    // Create revenue item if revenue > 0
    if (finance.revenue && Number.parseFloat(finance.revenue) > 0) {
      // Insert the result line item
      const [revenueItem] = await knex("result_line_items")
        .insert({
          document_id: generateDocumentId(),
          category: "other_income",
          name: "Revenue",
          description: finance.destination
            ? `Destination: ${finance.destination}`
            : "Migrated from legacy finance data",
          amount: finance.revenue,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
          published_at: now,
          locale: null,
        })
        .returning("id")

      // Link to draft event in Strapi 5 link table (admin edits draft version)
      await knex("result_line_items_event_lnk").insert({
        result_line_item_id: revenueItem.id,
        event_id: draftEventId,
        result_line_item_ord: sortOrder,
      })
      sortOrder++
    }

    // Create expenses item if expenses > 0
    if (finance.expenses && Number.parseFloat(finance.expenses) > 0) {
      // Insert the result line item
      const [expenseItem] = await knex("result_line_items")
        .insert({
          document_id: generateDocumentId(),
          category: "other_expense",
          name: "Expenses",
          description: "Migrated from legacy finance data",
          amount: finance.expenses,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
          published_at: now,
          locale: null,
        })
        .returning("id")

      // Link to draft event in Strapi 5 link table (admin edits draft version)
      await knex("result_line_items_event_lnk").insert({
        result_line_item_id: expenseItem.id,
        event_id: draftEventId,
        result_line_item_ord: sortOrder,
      })
      sortOrder++
    }

    if (sortOrder > 0) {
      console.log(
        `Migrated event ${eventDocumentId}: ${sortOrder} items (revenue: ${finance.revenue}, expenses: ${finance.expenses})`
      )
      migratedCount++
    } else {
      console.log(`Skipping event ${eventDocumentId}: no revenue or expenses to migrate`)
      skippedCount++
    }
  }

  console.log(`Migration complete: ${migratedCount} events migrated, ${skippedCount} skipped`)
}

export async function down(knex) {
  console.log("Starting rollback: Remove migrated result-line-items")

  const hasResultItemsTable = await knex.schema.hasTable("result_line_items")
  if (!hasResultItemsTable) {
    console.log("result_line_items table does not exist, skipping rollback")
    return
  }

  // Find items that were created by this migration (identified by description)
  const migratedItems = await knex("result_line_items")
    .select("id")
    .where("description", "like", "%Migrated from legacy finance data%")
    .orWhere("description", "like", "%Destination:%")

  if (migratedItems.length === 0) {
    console.log("No migrated items found to rollback")
    return
  }

  const itemIds = migratedItems.map((item) => item.id)

  // Delete from link table first (foreign key constraint)
  await knex("result_line_items_event_lnk")
    .whereIn("result_line_item_id", itemIds)
    .delete()

  // Then delete the items
  const deleted = await knex("result_line_items")
    .whereIn("id", itemIds)
    .delete()

  console.log(`Rollback complete: deleted ${deleted} migrated result items`)
}
