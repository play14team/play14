/**
 * Custom controller for LinkedIn account management
 * Allows hosts to connect their personal LinkedIn accounts for posting
 */

import type { Core } from "@strapi/strapi"
import {
  exchangeCodeForTokens,
  generateAuthorizationUrl,
  revokePlayerToken,
} from "../../../services/linkedin/oauth"
import { reportSentryError } from "../../../services/observability/sentry-reporter"

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

  return {
    /**
     * Get LinkedIn OAuth authorization URL
     */
    async getAuthorizationUrl(ctx: any) {
      const user = ctx.state.user
      if (!user) return ctx.unauthorized("You must be logged in")

      const player = await getLinkedPlayer(user.id)
      if (!player) return ctx.forbidden("You must have a linked player profile")

      try {
        const url = await generateAuthorizationUrl(strapi, player.documentId)
        return ctx.send({ data: { url } })
      } catch (error) {
        reportSentryError(strapi, error, {
          tags: { service: "linkedin-oauth", operation: "getAuthorizationUrl" },
        })
        return ctx.badRequest(`Failed to generate authorization URL: ${(error as Error).message}`)
      }
    },

    /**
     * Handle OAuth callback from LinkedIn
     */
    async handleCallback(ctx: any) {
      const { code, state, error: oauthError, error_description } = ctx.query
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const callbackRedirect = `${frontendUrl}/admin/linkedin/callback`

      if (oauthError) {
        strapi.log.warn(
          `[LinkedIn OAuth] Authorization denied: ${oauthError} - ${error_description}`
        )
        return ctx.redirect(
          `${callbackRedirect}?error=${encodeURIComponent(error_description || oauthError)}`
        )
      }

      if (!code || !state) {
        return ctx.redirect(
          `${callbackRedirect}?error=${encodeURIComponent("Missing authorization code or state")}`
        )
      }

      try {
        const { playerDocumentId } = await exchangeCodeForTokens(
          strapi,
          code as string,
          state as string
        )
        return ctx.redirect(`${callbackRedirect}?success=true&player=${playerDocumentId}`)
      } catch (error) {
        reportSentryError(strapi, error, {
          tags: { service: "linkedin-oauth", operation: "handleCallback" },
        })
        return ctx.redirect(
          `${callbackRedirect}?error=${encodeURIComponent((error as Error).message)}`
        )
      }
    },

    /**
     * Get LinkedIn account connection status for current player
     */
    async getAccountStatus(ctx: any) {
      const user = ctx.state.user
      if (!user) return ctx.unauthorized("You must be logged in")

      const player = await getLinkedPlayer(user.id)
      if (!player) return ctx.forbidden("You must have a linked player profile")

      const account = await strapi.documents("api::linkedin-account.linkedin-account").findFirst({
        filters: { player: { documentId: player.documentId } },
        fields: [
          "documentId",
          "linkedinUserId",
          "accountStatus",
          "displayName",
          "profileUrl",
          "connectedAt",
          "tokenExpiresAt",
        ],
      })

      if (!account) {
        return ctx.send({ data: null })
      }

      return ctx.send({
        data: {
          documentId: account.documentId,
          linkedinUserId: account.linkedinUserId,
          accountStatus: account.accountStatus,
          displayName: account.displayName,
          profileUrl: account.profileUrl,
          connectedAt: account.connectedAt,
          tokenExpiresAt: account.tokenExpiresAt,
        },
      })
    },

    /**
     * Disconnect LinkedIn account
     */
    async disconnectAccount(ctx: any) {
      const user = ctx.state.user
      if (!user) return ctx.unauthorized("You must be logged in")

      const player = await getLinkedPlayer(user.id)
      if (!player) return ctx.forbidden("You must have a linked player profile")

      try {
        await revokePlayerToken(strapi, player.documentId)
        return ctx.send({ data: { success: true } })
      } catch (error) {
        reportSentryError(strapi, error, {
          tags: { service: "linkedin-oauth", operation: "disconnectAccount" },
        })
        return ctx.badRequest(`Failed to disconnect: ${(error as Error).message}`)
      }
    },
  }
}
