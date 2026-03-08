/**
 * Cron task for LinkedIn auto-reminders
 * Posts reminders for upcoming events via hosts' personal LinkedIn accounts
 */

import type { Core } from "@strapi/strapi"
import { createLinkedInClient } from "../linkedin/linkedin-client"
import { getPlayerAccessToken } from "../linkedin/oauth"
import { composeEventReminder } from "../linkedin/post-composer"
import { reportSentryError } from "../observability/sentry-reporter"

/**
 * Process LinkedIn reminders for upcoming events
 * Called daily at 07:00 UTC
 */
export async function processLinkedInReminders(strapi: Core.Strapi): Promise<void> {
  if (process.env.LINKEDIN_ENABLED !== "true") return

  const now = new Date()
  strapi.log.info(`[LinkedIn Reminders] Starting check at ${now.toISOString()}`)

  // Process 30-day and 7-day reminders
  await processRemindersForDaysAhead(strapi, 30, "reminder30days")
  await processRemindersForDaysAhead(strapi, 7, "reminder7days")
}

async function processRemindersForDaysAhead(
  strapi: Core.Strapi,
  daysAhead: number,
  postType: string
): Promise<void> {
  const targetDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  const startOfDay = new Date(targetDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  // Find eligible events
  const events = await strapi.documents("api::event.event").findMany({
    filters: {
      eventStatus: { $in: ["Announced", "Open"] },
      start: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString(),
      },
    },
    populate: {
      location: true,
      hosts: {
        fields: ["id", "documentId", "name"],
        populate: {
          linkedinAccount: {
            fields: ["documentId", "accountStatus"],
          },
        },
      },
      defaultImage: true,
      images: true,
    },
    status: "published",
  })

  strapi.log.info(
    `[LinkedIn Reminders] Found ${events.length} events for ${postType} (${startOfDay.toISOString().split("T")[0]})`
  )

  let posted = 0
  let skipped = 0
  let failed = 0

  for (const event of events) {
    const hosts = (event.hosts || []) as any[]

    for (const host of hosts) {
      const linkedinAccount = host.linkedinAccount

      // Skip hosts without active LinkedIn accounts
      if (!linkedinAccount || linkedinAccount.accountStatus !== "active") {
        continue
      }

      // Check if post already exists for this event+player+postType
      const existingPost = await strapi.documents("api::linkedin-post.linkedin-post").findFirst({
        filters: {
          event: { documentId: event.documentId },
          player: { id: host.id },
          postType,
        },
      })

      if (existingPost) {
        skipped++
        continue
      }

      // Compose and post
      try {
        const post = await composeEventReminder(strapi, event, daysAhead)

        const { accessToken, linkedinUserId } = await getPlayerAccessToken(strapi, host.documentId)

        const linkedInClient = createLinkedInClient(accessToken, linkedinUserId)
        const linkedInPostId = await linkedInClient.createPost(post)

        // Save audit record
        await strapi.documents("api::linkedin-post.linkedin-post").create({
          data: {
            event: event.documentId,
            player: host.id,
            postType,
            content: post.text,
            linkedInPostId,
            imageUrl: post.imageUrl,
            postedAt: new Date().toISOString(),
            postStatus: "published",
          } as any,
        })

        posted++
        strapi.log.info(
          `[LinkedIn Reminders] Posted ${postType} for event ${event.slug} by ${host.name}`
        )
      } catch (error) {
        failed++
        strapi.log.error(
          `[LinkedIn Reminders] Failed ${postType} for event ${event.slug} by ${host.name}:`,
          error
        )

        // Save failed record
        try {
          await strapi.documents("api::linkedin-post.linkedin-post").create({
            data: {
              event: event.documentId,
              player: host.id,
              postType,
              content: (error as Error).message,
              postStatus: "failed",
              errorMessage: (error as Error).message,
            } as any,
          })
        } catch (saveError) {
          strapi.log.error("[LinkedIn Reminders] Failed to save error record:", saveError)
        }

        reportSentryError(strapi, error as Error, {
          tags: {
            module: "linkedin-reminders",
            event_slug: (event as any).slug,
            post_type: postType,
            host_name: host.name,
          },
        })
      }
    }
  }

  strapi.log.info(
    `[LinkedIn Reminders] ${postType} complete: posted=${posted}, skipped=${skipped}, failed=${failed}`
  )
}
