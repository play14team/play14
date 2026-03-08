/**
 * LinkedIn post controller for admin endpoints
 */

import type { Core } from "@strapi/strapi"
import { createLinkedInClient } from "../../../services/linkedin/linkedin-client"
import { composeEventAnnouncement } from "../../../services/linkedin/post-composer"
import { reportSentryError } from "../../../services/observability/sentry-reporter"

export default {
  /**
   * Preview LinkedIn post content without posting
   */
  async previewPost(ctx: any) {
    const { slug } = ctx.params
    const strapi = ctx.state.strapi as Core.Strapi

    try {
      const event = await strapi.documents("api::event.event").findFirst({
        filters: { slug },
        populate: {
          location: true,
          hosts: { fields: ["firstName", "lastName"] },
          defaultImage: true,
          gallery: true,
        },
      })

      if (!event) {
        return ctx.notFound("Event not found")
      }

      const post = await composeEventAnnouncement(strapi, event)

      return {
        text: post.text,
        imageUrl: post.imageUrl,
        link: post.link,
        hashtags: post.hashtags,
      }
    } catch (error) {
      console.error("Failed to preview LinkedIn post:", error)
      reportSentryError(strapi, error as Error, {
        tags: { module: "linkedin", action: "preview" },
      })
      return ctx.badRequest("Failed to generate post preview", { error: (error as Error).message })
    }
  },

  /**
   * Manually post to LinkedIn (admin override)
   */
  async postManually(ctx: any) {
    const { slug } = ctx.params
    const strapi = ctx.state.strapi as Core.Strapi

    try {
      const event = await strapi.documents("api::event.event").findFirst({
        filters: { slug },
        populate: {
          location: true,
          hosts: { fields: ["firstName", "lastName"] },
          defaultImage: true,
          gallery: true,
        },
      })

      if (!event) {
        return ctx.notFound("Event not found")
      }

      // Compose post
      const post = await composeEventAnnouncement(strapi, event)

      // Post to LinkedIn
      const linkedInClient = createLinkedInClient(strapi)
      const linkedInPostId = await linkedInClient.createPost(post)

      // Save audit record
      const record = await strapi.documents("api::linkedin-post.linkedin-post").create({
        data: {
          event: event.documentId,
          postType: "manual",
          content: post.text,
          linkedInPostId,
          imageUrl: post.imageUrl,
          postedAt: new Date().toISOString(),
          postStatus: "published",
        } as any,
      })

      return {
        success: true,
        post: {
          id: record.documentId,
          linkedInPostId,
          content: post.text,
        },
      }
    } catch (error) {
      console.error("Failed to post to LinkedIn:", error)
      reportSentryError(strapi, error as Error, {
        tags: { module: "linkedin", action: "manual_post", event_slug: slug },
      })

      // Save failed record
      try {
        const event = await strapi.documents("api::event.event").findFirst({
          filters: { slug },
          fields: ["documentId"],
        })

        if (event) {
          await strapi.documents("api::linkedin-post.linkedin-post").create({
            data: {
              event: event.documentId,
              postType: "manual",
              content: (error as Error).message,
              postStatus: "failed",
              errorMessage: (error as Error).message,
            } as any,
          })
        }
      } catch (saveError) {
        console.error("Failed to save error record:", saveError)
      }

      return ctx.badRequest("Failed to post to LinkedIn", { error: (error as Error).message })
    }
  },
}
