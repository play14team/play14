/**
 * Migration: Sync event dates from production JSON snapshot
 *
 * Reads the production snapshot JSON and updates event start/end/timezone values.
 * Uses document_id to update both draft and published rows safely.
 */

import { readFile } from "node:fs/promises"

const dataUrl = new URL("./data/play14-production-events.json", import.meta.url)

const requiredColumns = ["slug", "document_id", "start", "end", "timezone"]

const timezoneAliases = {
  Singapore: "Asia/Singapore",
  GMT: "UTC",
  "Asia/Calcutta": "Asia/Kolkata",
}

const normalizeTimezone = (value) => {
  if (!value) return null
  return timezoneAliases[value] || value
}

const normalizeKey = (value) =>
  value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : ""

const makeKey = (name, country) =>
  `${normalizeKey(name)}|${(country || "").toUpperCase()}`

const manualTimezoneByKey = new Map([
  [makeKey("Amsterdam", "NL"), "Europe/Amsterdam"],
  [makeKey("Bangkok", "TH"), "Asia/Bangkok"],
  [makeKey("Barcelona", "ES"), "Europe/Madrid"],
  [makeKey("Bari", "IT"), "Europe/Rome"],
  [makeKey("Basel", "CH"), "Europe/Zurich"],
  [makeKey("Beirut", "LB"), "Asia/Beirut"],
  [makeKey("Berlin", "DE"), "Europe/Berlin"],
  [makeKey("Bologna", "IT"), "Europe/Rome"],
  [makeKey("Brussels", "BE"), "Europe/Brussels"],
  [makeKey("Emmental", "CH"), "Europe/Zurich"],
  [makeKey("Hamburg", "DE"), "Europe/Berlin"],
  [makeKey("Iasi", "RO"), "Europe/Bucharest"],
  [makeKey("Kuala Lumpur", "MY"), "Asia/Kuala_Lumpur"],
  [makeKey("Leeds", "GB"), "Europe/London"],
  [makeKey("Leeds", "UK"), "Europe/London"],
  [makeKey("Lisbon", "PT"), "Europe/Lisbon"],
  [makeKey("London", "GB"), "Europe/London"],
  [makeKey("London", "UK"), "Europe/London"],
  [makeKey("Luxembourg", "LU"), "Europe/Luxembourg"],
  [makeKey("Madrid", "ES"), "Europe/Madrid"],
  [makeKey("Mexico", "MX"), "America/Mexico_City"],
  [makeKey("Mexico City", "MX"), "America/Mexico_City"],
  [makeKey("Milano", "IT"), "Europe/Rome"],
  [makeKey("Munich", "DE"), "Europe/Berlin"],
  [makeKey("Paris-Saclay", "FR"), "Europe/Paris"],
  [makeKey("Porto", "PT"), "Europe/Lisbon"],
  [makeKey("Prague", "CZ"), "Europe/Prague"],
  [makeKey("Stuttgart", "DE"), "Europe/Berlin"],
  [makeKey("Sydney", "AU"), "Australia/Sydney"],
  [makeKey("Timisoara", "RO"), "Europe/Bucharest"],
  [makeKey("Utrecht", "NL"), "Europe/Amsterdam"],
  [makeKey("Vienna", "AT"), "Europe/Vienna"],
  [makeKey("Viseu", "PT"), "Europe/Lisbon"],
  [makeKey("Online", ""), "UTC"],
  [makeKey("The Big One", ""), "UTC"],
])

const manualTimezoneByCity = new Map([
  ["amsterdam", "Europe/Amsterdam"],
  ["bangkok", "Asia/Bangkok"],
  ["barcelona", "Europe/Madrid"],
  ["bari", "Europe/Rome"],
  ["basel", "Europe/Zurich"],
  ["beirut", "Asia/Beirut"],
  ["berlin", "Europe/Berlin"],
  ["bologna", "Europe/Rome"],
  ["brussels", "Europe/Brussels"],
  ["emmental", "Europe/Zurich"],
  ["hamburg", "Europe/Berlin"],
  ["iasi", "Europe/Bucharest"],
  ["kuala lumpur", "Asia/Kuala_Lumpur"],
  ["leeds", "Europe/London"],
  ["lisbon", "Europe/Lisbon"],
  ["london", "Europe/London"],
  ["luxembourg", "Europe/Luxembourg"],
  ["madrid", "Europe/Madrid"],
  ["mexico", "America/Mexico_City"],
  ["mexico city", "America/Mexico_City"],
  ["milano", "Europe/Rome"],
  ["milan", "Europe/Rome"],
  ["munich", "Europe/Berlin"],
  ["paris saclay", "Europe/Paris"],
  ["porto", "Europe/Lisbon"],
  ["prague", "Europe/Prague"],
  ["stuttgart", "Europe/Berlin"],
  ["sydney", "Australia/Sydney"],
  ["timisoara", "Europe/Bucharest"],
  ["utrecht", "Europe/Amsterdam"],
  ["vienna", "Europe/Vienna"],
  ["viseu", "Europe/Lisbon"],
  ["online", "UTC"],
  ["the big one", "UTC"],
])

const deriveTimezoneFromLocation = ({ name, country, fallbackName }) => {
  if (name) {
    const key = makeKey(name, country)
    const keyed = manualTimezoneByKey.get(key)
    if (keyed) return keyed

    const city = normalizeKey(name)
    const cityMatch = manualTimezoneByCity.get(city)
    if (cityMatch) return cityMatch
  }

  if (fallbackName) {
    const fallbackCity = normalizeKey(fallbackName)
    const fallbackMatch = manualTimezoneByCity.get(fallbackCity)
    if (fallbackMatch) return fallbackMatch
  }

  return null
}

const stripYearSuffix = (value) =>
  value ? value.replace(/\s+\d{4}\s*$/u, "").trim() : ""

export async function up(knex) {
  console.log("Starting migration: Sync event dates from production JSON snapshot")

  const hasEventsTable = await knex.schema.hasTable("events")
  if (!hasEventsTable) {
    console.log("events table does not exist, skipping migration")
    return
  }

  for (const column of requiredColumns) {
    const hasColumn = await knex.schema.hasColumn("events", column)
    if (!hasColumn) {
      console.log(`events.${column} column does not exist, skipping migration`)
      return
    }
  }

  const raw = await readFile(dataUrl, "utf-8")
  const snapshot = JSON.parse(raw)

  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    console.log("No event data found in snapshot, skipping migration")
    return
  }

  const slugs = snapshot.map((event) => event.slug)
  const existing = await knex("events")
    .select("id", "slug", "document_id", "timezone")
    .whereIn("slug", slugs)

  const slugToDocumentId = new Map()
  const eventIdToTimezone = new Map()

  for (const row of existing) {
    if (!slugToDocumentId.has(row.slug)) {
      slugToDocumentId.set(row.slug, row.document_id)
    }
    if (row.timezone) {
      eventIdToTimezone.set(row.id, normalizeTimezone(row.timezone))
    }
  }

  const locationTableExists = await knex.schema.hasTable("event_locations")
  const linkTableCandidates = ["events_location_links", "events_location_lnk"]
  let linkTable = null

  for (const candidate of linkTableCandidates) {
    if (await knex.schema.hasTable(candidate)) {
      linkTable = candidate
      break
    }
  }

  const eventIdToLocationId = new Map()
  const slugToLocationId = new Map()
  const locationById = new Map()
  const locationTimezoneById = new Map()

  if (linkTable && locationTableExists) {
    const columnInfo = await knex(linkTable).columnInfo()
    const columns = Object.keys(columnInfo)
    const locationIdColumn =
      columns.find((col) => col.includes("event_location") && col.endsWith("_id")) ||
      columns.find((col) => col.includes("location") && col.endsWith("_id"))
    const eventIdColumn =
      columns.find(
        (col) =>
          col.endsWith("_id") &&
          col.includes("event") &&
          !col.includes("event_location")
      ) || columns.find((col) => col === "event_id")

    if (eventIdColumn && locationIdColumn) {
      const linkRows = await knex(linkTable).select(eventIdColumn, locationIdColumn)

      for (const row of linkRows) {
        const eventId = row[eventIdColumn]
        const locationId = row[locationIdColumn]
        if (eventId && locationId) {
          eventIdToLocationId.set(eventId, locationId)
        }
      }

      for (const row of existing) {
        const locationId = eventIdToLocationId.get(row.id)
        if (locationId && !slugToLocationId.has(row.slug)) {
          slugToLocationId.set(row.slug, locationId)
        }
      }

      const locationIds = [...new Set(eventIdToLocationId.values())]
      if (locationIds.length > 0) {
        const locations = await knex("event_locations")
          .select("id", "name", "country")
          .whereIn("id", locationIds)

        for (const location of locations) {
          locationById.set(location.id, location)
        }
      }

      for (const [eventId, timezone] of eventIdToTimezone.entries()) {
        const locationId = eventIdToLocationId.get(eventId)
        if (locationId && timezone && !locationTimezoneById.has(locationId)) {
          locationTimezoneById.set(locationId, timezone)
        }
      }
    } else {
      console.log(
        `Unable to resolve link columns for ${linkTable}; falling back to manual timezone mapping`
      )
    }
  }

  let updatedDocuments = 0
  let updatedRows = 0
  let skippedMissingDoc = 0
  let skippedMissingTimezone = 0
  let skippedMissingLocal = 0
  let skippedWithError = 0

  const now = new Date().toISOString()

  for (const event of snapshot) {
    const documentId = slugToDocumentId.get(event.slug)
    if (!documentId) {
      console.log(`Skipping ${event.slug}: not found in events table`)
      skippedMissingDoc++
      continue
    }

    if (event.utcError) {
      console.log(`Skipping ${event.slug}: utcError=${event.utcError}`)
      skippedWithError++
      continue
    }

    if (!event.localStart || !event.localEnd) {
      console.log(`Skipping ${event.slug}: missing localStart/localEnd in snapshot`)
      skippedMissingLocal++
      continue
    }

    let timezone = normalizeTimezone(event.timezone)

    if (!timezone) {
      const locationId = slugToLocationId.get(event.slug) || null
      if (locationId) {
        timezone = locationTimezoneById.get(locationId) || null
      }

      if (!timezone) {
        const location = locationId ? locationById.get(locationId) : null
        const fallbackName = stripYearSuffix(event.name)
        timezone = deriveTimezoneFromLocation({
          name: location?.name,
          country: location?.country,
          fallbackName,
        })
      }
    }

    if (!timezone) {
      console.log(`Skipping ${event.slug}: unable to derive timezone`)
      skippedMissingTimezone++
      continue
    }

    // Store local times as UTC timestamps using PostgreSQL timezone conversion
    // The timezone() function interprets the timestamp as being in the specified timezone
    // and converts it to UTC for storage
    // NOTE: This requires the server to run in UTC (TZ=UTC) for consistent behavior
    const count = await knex("events").where("document_id", documentId).update({
      start: knex.raw("timezone(?, ?::timestamp)", [timezone, event.localStart]),
      end: knex.raw("timezone(?, ?::timestamp)", [timezone, event.localEnd]),
      timezone,
      updated_at: now,
    })

    if (count > 0) {
      updatedDocuments++
      updatedRows += count
    }
  }

  console.log(
    `Migration complete: updated ${updatedDocuments} document(s) across ${updatedRows} row(s)`
  )
  console.log(
    `Skipped: ${skippedMissingDoc} missing doc, ${skippedMissingTimezone} missing timezone, ${skippedMissingLocal} missing local, ${skippedWithError} utc errors`
  )
}

export async function down() {
  console.log(
    "Rollback skipped: snapshot sync is non-destructive and not safely reversible"
  )
}
