/**
 * Cron task for sending event results reminders
 *
 * Sends reminders to event contacts 15 days after the event ends,
 * prompting them to enter their results data. Repeats up to 3 times
 * with 15 days between each reminder.
 */

import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import EventResultsReminderEmail, { getSubject } from "../../emails/event-results-reminder"
import { sendEmail } from "../email-send"

interface EventForReminder {
  documentId: string
  name: string
  slug: string
  end: string
  contactEmail: string
  resultsReminderCount: number
  resultsReminderLastSentAt: string | null
  cancellationNotifiedAt: string | null
  hosts?: Array<{ name?: string }>
  resultItems?: Array<{ id: number }>
}

const REMINDER_INTERVAL_DAYS = 15
const MAX_REMINDERS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Feature launch date - only events ending AFTER this date will receive reminders.
 * This prevents sending reminders to all historical events when the feature is deployed.
 */
const FEATURE_LAUNCH_DATE = new Date("2025-01-20T00:00:00.000Z")

/**
 * Calculate when the next reminder should be sent for an event.
 * First reminder: 15 days after event end
 * Subsequent reminders: 15 days after the last reminder
 */
function getNextReminderDate(event: EventForReminder): Date {
  if (event.resultsReminderCount === 0) {
    // First reminder: 15 days after event end
    return new Date(new Date(event.end).getTime() + REMINDER_INTERVAL_DAYS * MS_PER_DAY)
  }
  // Subsequent reminders: 15 days after last reminder
  return new Date(
    new Date(event.resultsReminderLastSentAt!).getTime() + REMINDER_INTERVAL_DAYS * MS_PER_DAY
  )
}

/**
 * Check if an event is eligible for a results reminder
 */
function isEligibleForReminder(event: EventForReminder, now: Date): boolean {
  // Max 3 reminders
  if (event.resultsReminderCount >= MAX_REMINDERS) {
    return false
  }

  // Must have a contact email
  if (!event.contactEmail) {
    return false
  }

  // The event never happened — skip it. `cancellationNotifiedAt` is set by the
  // cancellation lifecycle hook, so it remains a reliable signal even if
  // `eventStatus` is later flipped back to "Over" (manually or by the
  // updateEventStatus cron on a post-end-date event that was cancelled).
  if (event.cancellationNotifiedAt) {
    return false
  }

  // Host already started entering financial results — no reason to nag.
  if (event.resultItems && event.resultItems.length > 0) {
    return false
  }

  // Check if it's time for the next reminder
  const nextReminderDate = getNextReminderDate(event)
  return now >= nextReminderDate
}

/**
 * Get the contact name from the event (first host's name if available)
 */
function getContactName(event: EventForReminder): string | undefined {
  if (event.hosts && event.hosts.length > 0 && event.hosts[0].name) {
    return event.hosts[0].name
  }
  return undefined
}

/**
 * Send a results reminder email for an event
 */
async function sendResultsReminderEmail(
  strapi: Core.Strapi,
  event: EventForReminder
): Promise<void> {
  const reminderNumber = event.resultsReminderCount + 1
  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
  const contactName = getContactName(event)

  const html = await render(
    EventResultsReminderEmail({
      eventName: event.name,
      eventSlug: event.slug,
      contactName,
      reminderNumber,
      frontendUrl,
    })
  )

  const text = await render(
    EventResultsReminderEmail({
      eventName: event.name,
      eventSlug: event.slug,
      contactName,
      reminderNumber,
      frontendUrl,
    }),
    { plainText: true }
  )

  const subject = `[#play14] ${getSubject(event.name, reminderNumber)}`

  await sendEmail(strapi, "event_results_reminder", {
    to: event.contactEmail,
    subject,
    html,
    text,
  })
}

/**
 * Process event results reminders
 *
 * This function:
 * 1. Finds all events with status "Over" that are eligible for reminders
 * 2. Sends reminder emails to the contact email
 * 3. Updates the reminder tracking fields on the event
 */
export async function processEventResultsReminders(strapi: Core.Strapi): Promise<void> {
  if (process.env.EVENT_RESULTS_REMINDERS_ENABLED === "false") {
    return
  }

  const now = new Date()

  // Calculate the cutoff date: events that ended at least 15 days ago
  const cutoffDate = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * MS_PER_DAY)

  console.log("[EventResultsReminders] Running event results reminder job")

  // Find events that:
  // - Have status "Over"
  // - Ended at least 15 days ago
  // - Ended AFTER the feature launch date (to exclude historical events)
  // - Have sent fewer than 3 reminders
  const events = (await strapi.documents("api::event.event").findMany({
    fields: [
      "documentId",
      "name",
      "slug",
      "end",
      "contactEmail",
      "resultsReminderCount",
      "resultsReminderLastSentAt",
      "cancellationNotifiedAt",
    ],
    filters: {
      eventStatus: "Over",
      cancellationNotifiedAt: { $null: true },
      end: {
        $lt: cutoffDate.toISOString(),
        $gt: FEATURE_LAUNCH_DATE.toISOString(),
      },
      $or: [
        { resultsReminderCount: { $null: true } },
        { resultsReminderCount: { $lt: MAX_REMINDERS } },
      ],
    },
    populate: {
      hosts: { fields: ["name"] },
      resultItems: { fields: ["id"] },
    },
    sort: [{ end: "asc" }, { name: "asc" }],
  })) as unknown as EventForReminder[]

  console.log(`[EventResultsReminders] Found ${events.length} potential events for reminders`)

  let sentCount = 0
  let skippedCount = 0

  for (const event of events) {
    // Initialize resultsReminderCount if null/undefined (for existing events)
    const normalizedEvent = {
      ...event,
      resultsReminderCount: event.resultsReminderCount ?? 0,
    }

    if (!isEligibleForReminder(normalizedEvent, now)) {
      skippedCount++
      continue
    }

    try {
      await sendResultsReminderEmail(strapi, normalizedEvent)

      // Update the event with reminder tracking
      await strapi.documents("api::event.event").update({
        documentId: event.documentId,
        data: {
          resultsReminderCount: normalizedEvent.resultsReminderCount + 1,
          resultsReminderLastSentAt: now.toISOString(),
        } as any,
      })

      console.log(
        `[EventResultsReminders] Sent reminder #${normalizedEvent.resultsReminderCount + 1} for "${event.name}" to ${event.contactEmail}`
      )
      sentCount++
    } catch (error) {
      console.error(`[EventResultsReminders] Failed to send reminder for "${event.name}":`, error)
      // Continue processing other events even if one fails
    }
  }

  console.log(
    `[EventResultsReminders] Completed: ${sentCount} reminders sent, ${skippedCount} skipped`
  )
}
