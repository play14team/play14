/**
 * Cron tasks for event management
 */

import type { Core } from "@strapi/strapi"

/**
 * Update event status to 'Over' for past events
 */
export async function updateEventStatus(strapi: Core.Strapi): Promise<void> {
  const now = new Date()

  console.log("Running event status job")
  const apiName = "api::event.event"
  const events = await strapi.documents(apiName).findMany({
    fields: ["id", "name", "end"],
    filters: {
      $and: [
        {
          $or: [
            {
              eventStatus: "Open",
            },
            {
              eventStatus: "Announced",
            },
          ],
        },
        {
          end: { $lt: now.toISOString() },
        },
      ],
    },
    status: "published",
  })

  console.log("'Open' or 'Announced' events in the past found:", events.length)

  await Promise.all(
    events.map(async (event) => {
      console.log("Changing eventStatus of event to 'Over'", event)
      // Strapi 5: update() targets the draft unless status: "published" is passed,
      // so without this the public API would keep serving the old eventStatus.
      await strapi.documents(apiName).update({
        documentId: event.documentId,
        data: { eventStatus: "Over" } as any,
        status: "published",
      })
    })
  )
}
