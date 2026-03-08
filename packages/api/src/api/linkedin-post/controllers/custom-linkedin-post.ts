/**
 * LinkedIn post controller for admin endpoints
 * Handles post preview, manual posting, history, and content regeneration
 */

import type { Core } from "@strapi/strapi"
import { createLinkedInClient } from "../../../services/linkedin/linkedin-client"
import { getPlayerAccessToken } from "../../../services/linkedin/oauth"
import {
  composeEventAnnouncement,
  composeEventReminder,
} from "../../../services/linkedin/post-composer"
import { reportSentryError } from "../../../services/observability/sentry-reporter"

const POPULATE_EVENT = {
  location: true,
  hosts: { fields: ["id", "documentId", "name"] },
  defaultImage: true,
  images: true,
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * Get the current user's linked player
   */
  async function getLinkedPlayer(userId: number) {
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: userId },
      populate: { player: true },
    })
    return userWithPlayer?.player || null
  }

  /**
   * Verify player is a host/mentor/founder of the event
   */
  async function verifyEventOrganizer(playerId: number, eventDocumentId: string): Promise<boolean> {
    const player = await strapi.documents("api::player.player").findFirst({
      filters: { id: playerId },
    })

    if (player?.position === "Founder") return true

    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventDocumentId,
      populate: {
        hosts: { fields: ["id"] },
        mentors: { fields: ["id"] },
      },
    })

    if (!event) return false

    const isHost = event.hosts?.some((h: any) => h.id === playerId)
    const isMentor = event.mentors?.some((m: any) => m.id === playerId)

    return isHost || isMentor
  }

  /**
   * Compose content based on post type
   */
  async function composeContent(event: any, postType: string, customContent?: string) {
    switch (postType) {
      case "reminder30days":
        return composeEventReminder(strapi, event, 30, customContent)
      case "reminder7days":
        return composeEventReminder(strapi, event, 7, customContent)
      case "announcement":
      default:
        return composeEventAnnouncement(strapi, event, customContent)
    }
  }

  return {
    /**
     * Preview LinkedIn post content without posting
     */
    async previewPost(ctx: any) {
      const { slug } = ctx.params
      const postType = (ctx.query.postType as string) || "announcement"

      try {
        const event = await strapi.documents("api::event.event").findFirst({
          filters: { slug },
          populate: POPULATE_EVENT,
        })

        if (!event) return ctx.notFound("Event not found")

        const post = await composeContent(event, postType)

        return ctx.send({
          data: {
            text: post.text,
            imageUrl: post.imageUrl,
            link: post.link,
            hashtags: post.hashtags,
            postType,
          },
        })
      } catch (error) {
        reportSentryError(strapi, error as Error, {
          tags: { module: "linkedin", action: "preview" },
        })
        return ctx.badRequest("Failed to generate post preview", {
          error: (error as Error).message,
        })
      }
    },

    /**
     * Post to LinkedIn using the host's personal account
     */
    async postManually(ctx: any) {
      const { slug } = ctx.params
      const { content: customContent, postType: requestPostType } = ctx.request.body || {}
      const postType = requestPostType || "manual"
      const user = ctx.state.user

      if (!user) return ctx.unauthorized("You must be logged in")

      const player = await getLinkedPlayer(user.id)
      if (!player) return ctx.forbidden("You must have a linked player profile")

      try {
        const event = await strapi.documents("api::event.event").findFirst({
          filters: { slug },
          populate: POPULATE_EVENT,
        })

        if (!event) return ctx.notFound("Event not found")

        // Verify organizer
        const isOrganizer = await verifyEventOrganizer(player.id, event.documentId)
        if (!isOrganizer) {
          return ctx.forbidden("Only event organizers can post to LinkedIn")
        }

        // Get player's LinkedIn credentials
        const { accessToken, linkedinUserId } = await getPlayerAccessToken(
          strapi,
          player.documentId
        )

        // Compose post content
        const post = await composeContent(event, postType, customContent)

        // Post to LinkedIn
        const linkedInClient = createLinkedInClient(accessToken, linkedinUserId)
        const linkedInPostId = await linkedInClient.createPost(post)

        // Save audit record
        const record = await strapi.documents("api::linkedin-post.linkedin-post").create({
          data: {
            event: event.documentId,
            player: player.id,
            postType,
            content: post.text,
            linkedInPostId,
            imageUrl: post.imageUrl,
            postedAt: new Date().toISOString(),
            postStatus: "published",
          } as any,
        })

        return ctx.send({
          data: {
            success: true,
            post: {
              documentId: record.documentId,
              linkedInPostId,
              content: post.text,
            },
          },
        })
      } catch (error) {
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
                player: player.id,
                postType,
                content: customContent || (error as Error).message,
                postStatus: "failed",
                errorMessage: (error as Error).message,
              } as any,
            })
          }
        } catch (saveError) {
          strapi.log.error("[LinkedIn] Failed to save error record:", saveError)
        }

        return ctx.badRequest("Failed to post to LinkedIn", {
          error: (error as Error).message,
        })
      }
    },

    /**
     * Get post history for an event
     */
    async getPostHistory(ctx: any) {
      const { slug } = ctx.params

      try {
        const event = await strapi.documents("api::event.event").findFirst({
          filters: { slug },
          fields: ["documentId"],
        })

        if (!event) return ctx.notFound("Event not found")

        const posts = await strapi.documents("api::linkedin-post.linkedin-post").findMany({
          filters: { event: { documentId: event.documentId } },
          populate: { player: { fields: ["name"] } },
          sort: { createdAt: "desc" },
        })

        return ctx.send({
          data: posts.map((post: any) => ({
            documentId: post.documentId,
            postType: post.postType,
            content: post.content,
            linkedInPostId: post.linkedInPostId,
            postStatus: post.postStatus,
            postedAt: post.postedAt,
            errorMessage: post.errorMessage,
            playerName: post.player?.name,
            createdAt: post.createdAt,
          })),
        })
      } catch (error) {
        reportSentryError(strapi, error as Error, {
          tags: { module: "linkedin", action: "history" },
        })
        return ctx.badRequest("Failed to get post history", {
          error: (error as Error).message,
        })
      }
    },

    /**
     * Regenerate AI content without posting
     */
    async regenerateContent(ctx: any) {
      const { slug } = ctx.params
      const postType = (ctx.query.postType as string) || "announcement"

      try {
        const event = await strapi.documents("api::event.event").findFirst({
          filters: { slug },
          populate: POPULATE_EVENT,
        })

        if (!event) return ctx.notFound("Event not found")

        // Generate fresh content (no customContent = AI generation)
        const post = await composeContent(event, postType)

        return ctx.send({
          data: {
            text: post.text,
            imageUrl: post.imageUrl,
            link: post.link,
            hashtags: post.hashtags,
            postType,
          },
        })
      } catch (error) {
        reportSentryError(strapi, error as Error, {
          tags: { module: "linkedin", action: "regenerate" },
        })
        return ctx.badRequest("Failed to regenerate content", {
          error: (error as Error).message,
        })
      }
    },
  }
}
