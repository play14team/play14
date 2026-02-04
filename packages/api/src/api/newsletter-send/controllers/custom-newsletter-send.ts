/**
 * Custom controller for newsletter management
 * Allows founders to create, manage, and send newsletters to the #play14 community
 */

import type { Core } from "@strapi/strapi"
import { renderNewsletterEmail } from "../../../emails/newsletter-template"
import { generateDraft, improveContent, suggestSubjects } from "../../../services/gemini-content"
import { getSegmentCount, sendBroadcast, sendTestEmail } from "../../../services/resend-broadcast"

/**
 * Check if user is a founder
 */
async function requireFounder(strapi: Core.Strapi, ctx: any): Promise<boolean> {
  const user = ctx.state.user

  if (!user) {
    ctx.unauthorized("You must be logged in")
    return false
  }

  const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
    filters: { id: user.id },
    populate: { player: true },
  })

  if (!userWithPlayer?.player) {
    ctx.forbidden("You must have a linked player profile")
    return false
  }

  const position = userWithPlayer.player.position

  if (position !== "Founder") {
    ctx.forbidden("Only founders can manage newsletters")
    return false
  }

  return true
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * List all newsletters with pagination
   */
  async list(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { page = 1, pageSize = 25 } = ctx.query

    try {
      const allNewsletters = await strapi
        .documents("api::newsletter-send.newsletter-send")
        .findMany({
          sort: { createdAt: "desc" },
        })

      const total = allNewsletters.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedItems = allNewsletters.slice(startIndex, startIndex + Number(pageSize))

      const formattedItems = paginatedItems.map((item) => ({
        documentId: item.documentId,
        subject: item.subject,
        sendStatus: item.sendStatus,
        sentAt: item.sentAt,
        recipientCount: item.recipientCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))

      return ctx.send({
        data: formattedItems,
        meta: {
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            pageCount: Math.ceil(total / Number(pageSize)),
            total,
          },
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to list newsletters: ${error}`)
      return ctx.internalServerError("Failed to list newsletters")
    }
  },

  /**
   * Get a single newsletter for editing
   */
  async findOne(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      return ctx.send({
        data: {
          documentId: newsletter.documentId,
          subject: newsletter.subject,
          body: newsletter.body,
          sendStatus: newsletter.sendStatus,
          sentAt: newsletter.sentAt,
          recipientCount: newsletter.recipientCount,
          resendBroadcastId: newsletter.resendBroadcastId,
          errorMessage: newsletter.errorMessage,
          createdAt: newsletter.createdAt,
          updatedAt: newsletter.updatedAt,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to get newsletter: ${error}`)
      return ctx.internalServerError("Failed to get newsletter")
    }
  },

  /**
   * Create a new newsletter draft
   */
  async create(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const data = ctx.request.body?.data || {}

    if (!data.subject || data.subject.trim().length === 0) {
      return ctx.badRequest("Subject is required")
    }

    if (!data.body || data.body.trim().length === 0) {
      return ctx.badRequest("Body is required")
    }

    try {
      const newNewsletter = await strapi.documents("api::newsletter-send.newsletter-send").create({
        data: {
          subject: data.subject.trim(),
          body: data.body,
          sendStatus: "draft",
        },
      })

      strapi.log.info(
        `[Newsletter] Created newsletter: ${newNewsletter.subject} (${newNewsletter.documentId})`
      )

      return ctx.send({
        data: {
          documentId: newNewsletter.documentId,
          subject: newNewsletter.subject,
          body: newNewsletter.body,
          sendStatus: newNewsletter.sendStatus,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to create newsletter: ${error}`)
      return ctx.internalServerError("Failed to create newsletter")
    }
  },

  /**
   * Update a newsletter draft
   */
  async update(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params
    const data = ctx.request.body?.data || {}

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const existingNewsletter = await strapi
        .documents("api::newsletter-send.newsletter-send")
        .findOne({
          documentId: newsletterId,
        })

      if (!existingNewsletter) {
        return ctx.notFound("Newsletter not found")
      }

      if (existingNewsletter.sendStatus !== "draft") {
        return ctx.badRequest("Cannot edit a newsletter that has already been sent or is sending")
      }

      const updateData: Record<string, unknown> = {}

      if (data.subject !== undefined) {
        updateData.subject = data.subject.trim()
      }

      if (data.body !== undefined) {
        updateData.body = data.body
      }

      const updatedNewsletter = await strapi
        .documents("api::newsletter-send.newsletter-send")
        .update({
          documentId: newsletterId,
          data: updateData,
        })

      strapi.log.info(
        `[Newsletter] Updated newsletter: ${updatedNewsletter.subject} (${newsletterId})`
      )

      return ctx.send({
        data: {
          documentId: updatedNewsletter.documentId,
          subject: updatedNewsletter.subject,
          body: updatedNewsletter.body,
          sendStatus: updatedNewsletter.sendStatus,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to update newsletter: ${error}`)
      return ctx.internalServerError("Failed to update newsletter")
    }
  },

  /**
   * Delete a newsletter draft
   */
  async delete(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      if (newsletter.sendStatus !== "draft") {
        return ctx.badRequest("Cannot delete a newsletter that has already been sent or is sending")
      }

      await strapi.documents("api::newsletter-send.newsletter-send").delete({
        documentId: newsletterId,
      })

      strapi.log.info(`[Newsletter] Deleted newsletter: ${newsletter.subject} (${newsletterId})`)

      return ctx.send({
        data: {
          documentId: newsletterId,
          deleted: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to delete newsletter: ${error}`)
      return ctx.internalServerError("Failed to delete newsletter")
    }
  },

  /**
   * Reset a failed newsletter back to draft status for retry
   */
  async retry(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      if (newsletter.sendStatus !== "failed") {
        return ctx.badRequest("Only failed newsletters can be retried")
      }

      const updatedNewsletter = await strapi
        .documents("api::newsletter-send.newsletter-send")
        .update({
          documentId: newsletterId,
          data: {
            sendStatus: "draft",
            errorMessage: null,
          } as any,
        })

      strapi.log.info(
        `[Newsletter] Reset failed newsletter to draft: ${newsletter.subject} (${newsletterId})`
      )

      return ctx.send({
        data: {
          documentId: updatedNewsletter.documentId,
          subject: updatedNewsletter.subject,
          body: updatedNewsletter.body,
          sendStatus: updatedNewsletter.sendStatus,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to reset newsletter for retry: ${error}`)
      return ctx.internalServerError("Failed to reset newsletter")
    }
  },

  /**
   * Get subscriber count from the newsletter segment
   */
  async audienceCount(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    try {
      const result = await getSegmentCount()

      if (!result.success) {
        return ctx.badRequest(result.error || "Failed to get subscriber count")
      }

      return ctx.send({
        data: {
          count: result.count,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to get subscriber count: ${error}`)
      return ctx.internalServerError("Failed to get subscriber count")
    }
  },

  /**
   * Send a test email to the founder's email
   */
  async sendTest(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params
    const user = ctx.state.user

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      // Render the email HTML
      const htmlContent = await renderNewsletterEmail({
        subject: newsletter.subject,
        body: newsletter.body,
      })

      // Send test email to the founder's email
      const result = await sendTestEmail(user.email, newsletter.subject, htmlContent)

      if (!result.success) {
        return ctx.badRequest(result.error || "Failed to send test email")
      }

      strapi.log.info(
        `[Newsletter] Test email sent to ${user.email} for newsletter ${newsletterId}`
      )

      return ctx.send({
        data: {
          success: true,
          email: user.email,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to send test email: ${error}`)
      return ctx.internalServerError("Failed to send test email")
    }
  },

  /**
   * Send the newsletter to all subscribers
   */
  async send(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      if (newsletter.sendStatus !== "draft") {
        return ctx.badRequest("Newsletter has already been sent or is currently sending")
      }

      // Mark as sending
      await strapi.documents("api::newsletter-send.newsletter-send").update({
        documentId: newsletterId,
        data: {
          sendStatus: "sending",
        } as any,
      })

      // Get subscriber count from segment first
      const segmentResult = await getSegmentCount()
      const recipientCount = segmentResult.success ? segmentResult.count : 0

      // Render the email HTML
      const htmlContent = await renderNewsletterEmail({
        subject: newsletter.subject,
        body: newsletter.body,
      })

      // Send broadcast
      const result = await sendBroadcast(newsletter.subject, htmlContent)

      if (!result.success) {
        // Mark as failed
        await strapi.documents("api::newsletter-send.newsletter-send").update({
          documentId: newsletterId,
          data: {
            sendStatus: "failed",
            errorMessage: result.error,
          } as any,
        })

        return ctx.badRequest(result.error || "Failed to send newsletter")
      }

      // Mark as sent
      await strapi.documents("api::newsletter-send.newsletter-send").update({
        documentId: newsletterId,
        data: {
          sendStatus: "sent",
          sentAt: new Date().toISOString(),
          recipientCount,
          resendBroadcastId: result.broadcastId,
        } as any,
      })

      strapi.log.info(
        `[Newsletter] Newsletter sent: ${newsletter.subject} (${newsletterId}) to ${recipientCount} recipients`
      )

      return ctx.send({
        data: {
          success: true,
          broadcastId: result.broadcastId,
          recipientCount,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to send newsletter: ${error}`)

      // Mark as failed
      await strapi.documents("api::newsletter-send.newsletter-send").update({
        documentId: newsletterId,
        data: {
          sendStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        } as any,
      })

      return ctx.internalServerError("Failed to send newsletter")
    }
  },

  /**
   * Preview newsletter HTML
   */
  async preview(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: newsletterId } = ctx.params

    if (!newsletterId) {
      return ctx.badRequest("Newsletter ID is required")
    }

    try {
      const newsletter = await strapi.documents("api::newsletter-send.newsletter-send").findOne({
        documentId: newsletterId,
      })

      if (!newsletter) {
        return ctx.notFound("Newsletter not found")
      }

      // Render the email HTML
      const htmlContent = await renderNewsletterEmail({
        subject: newsletter.subject,
        body: newsletter.body,
      })

      return ctx.send({
        data: {
          html: htmlContent,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] Failed to generate preview: ${error}`)
      return ctx.internalServerError("Failed to generate preview")
    }
  },

  /**
   * Generate newsletter draft using AI
   */
  async aiGenerate(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { prompt } = ctx.request.body?.data || {}

    if (!prompt || prompt.trim().length === 0) {
      return ctx.badRequest("Prompt is required")
    }

    try {
      const result = await generateDraft(prompt)

      if (!result.success) {
        return ctx.badRequest(result.error || "Failed to generate content")
      }

      return ctx.send({
        data: {
          content: result.content,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] AI generation failed: ${error}`)
      return ctx.internalServerError("Failed to generate content")
    }
  },

  /**
   * Improve newsletter content using AI
   */
  async aiImprove(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { content, instructions } = ctx.request.body?.data || {}

    if (!content || content.trim().length === 0) {
      return ctx.badRequest("Content is required")
    }

    if (!instructions || instructions.trim().length === 0) {
      return ctx.badRequest("Instructions are required")
    }

    try {
      const result = await improveContent(content, instructions)

      if (!result.success) {
        return ctx.badRequest(result.error || "Failed to improve content")
      }

      return ctx.send({
        data: {
          content: result.content,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] AI improvement failed: ${error}`)
      return ctx.internalServerError("Failed to improve content")
    }
  },

  /**
   * Generate subject line suggestions using AI
   */
  async aiSuggestSubjects(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { content } = ctx.request.body?.data || {}

    if (!content || content.trim().length === 0) {
      return ctx.badRequest("Content is required")
    }

    try {
      const result = await suggestSubjects(content)

      if (!result.success) {
        return ctx.badRequest(result.error || "Failed to generate subject suggestions")
      }

      return ctx.send({
        data: {
          subjects: result.subjects,
        },
      })
    } catch (error) {
      strapi.log.error(`[Newsletter] AI subject suggestion failed: ${error}`)
      return ctx.internalServerError("Failed to generate subject suggestions")
    }
  },
})
