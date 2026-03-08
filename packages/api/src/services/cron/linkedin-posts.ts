/**
 * Cron tasks for LinkedIn post automation
 * Posts reminders for upcoming events
 */

import type { Core } from "@strapi/strapi"
import { createLinkedInClient } from "../linkedin/linkedin-client"
import { composeEventReminder } from "../linkedin/post-composer"
import { reportSentryError } from "../observability/sentry-reporter"

/**
 * Post LinkedIn reminders for upcoming events
 * Runs daily at 07:00 UTC
 */
export async function postEventReminders(strapi: Core.Strapi): Promise<void> {
  const now = new Date()

  // Calculate target dates (30 days and 7 days from now)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  console.log(`Checking for events needing LinkedIn reminders on ${now.toISOString()}`)

  // Find events needing 30-day reminder
  await postRemindersForDate(strapi, in30Days, 30, "reminder30days")

  // Find events needing 7-day reminder
  await postRemindersForDate(strapi, in7Days, 7, "reminder7days")
}

/**
 * Post reminders for events starting on a specific date
 */
async function postRemindersForDate(
  strapi: Core.Strapi,
  targetDate: Date,
  daysUntil: number,
  postType: string
): Promise<void> {
  // Calculate date range for target date (whole day)
  const startOfDay = new Date(targetDate)
  startOfDay.setUTCHours(0, 0, 0, 0)

  const endOfDay = new Date(targetDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  console.log(`Looking for events starting on ${startOfDay.toISOString().split("T")[0]}`)

  // Find published events starting on target date
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
      hosts: { fields: ["firstName", "lastName"] },
      defaultImage: true,
      gallery: true,
    },
    status: "published",
  })

  console.log(`Found ${events.length} events needing ${postType} LinkedIn post`)

  for (const event of events) {
    // Check if reminder already posted
    const existingPost = await strapi.documents("api::linkedin-post.linkedin-post").findFirst({
      filters: {
        event: event.documentId,
        postType,
      },
    })

    if (existingPost) {
      console.log(`LinkedIn ${postType} already posted for event ${event.slug}`)
      continue
    }

    // Compose and post
    try {
      console.log(`Creating LinkedIn ${postType} for event ${event.slug}`)
      const post = await composeEventReminder(strapi, event, daysUntil)
      const linkedInClient = createLinkedInClient(strapi)
      const linkedInPostId = await linkedInClient.createPost(post)

      await strapi.documents("api::linkedin-post.linkedin-post").create({
        data: {
          event: event.documentId,
          postType,
          content: post.text,
          linkedInPostId,
          imageUrl: post.imageUrl,
          postedAt: new Date().toISOString(),
          postStatus: "published",
        } as any,
      })

      console.log(`LinkedIn ${postType} posted for event ${event.slug}`)
    } catch (error) {
      console.error(`Failed to post LinkedIn ${postType} for ${event.slug}:`, error)

      // Save failed record
      try {
        await strapi.documents("api::linkedin-post.linkedin-post").create({
          data: {
            event: event.documentId,
            postType,
            content: (error as Error).message,
            postStatus: "failed",
            errorMessage: (error as Error).message,
          } as any,
        })
      } catch (saveError) {
        console.error("Failed to save error record:", saveError)
      }

      reportSentryError(strapi, error as Error, {
        tags: { module: "linkedin", event_slug: event.slug, post_type: postType },
      })
    }
  }
}
