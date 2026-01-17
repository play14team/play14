/**
 * Custom controller for Stripe Connect account management
 * Allows hosts to connect their Stripe accounts for receiving payments
 */

import type { Core } from "@strapi/strapi"
import Stripe from "stripe"
import { STRIPE_DEFAULTS } from "../../../services/ticketing"
import { reportSentryError } from "../../../services/observability/sentry-reporter"

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // Initialize Stripe client
  const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    return new Stripe(secretKey)
  }

  /**
   * Extract detailed error information from Stripe errors
   */
  const getStripeErrorDetails = (error: unknown) => {
    if (error instanceof Stripe.errors.StripeError) {
      return {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
        statusCode: error.statusCode,
        requestId: error.requestId,
        docUrl: error.doc_url,
        raw: error.raw,
      }
    }
    return {
      type: "unknown",
      message: error instanceof Error ? error.message : String(error),
    }
  }

  /**
   * Log and report Stripe errors to Sentry with full context
   */
  const handleStripeError = (
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {}
  ) => {
    const errorDetails = getStripeErrorDetails(error)

    strapi.log.error(
      `[Stripe Connect] ${operation} failed: ${JSON.stringify(errorDetails, null, 2)}`
    )

    reportSentryError(strapi, error, {
      tags: {
        service: "stripe-connect",
        operation,
        errorType: errorDetails.type,
        errorCode: errorDetails.code || "unknown",
      },
      extra: {
        ...errorDetails,
        ...context,
      },
    })

    return errorDetails
  }

  return {
    /**
     * Get the current user's linked player
     */
    async getLinkedPlayer(userId: number) {
      const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
        filters: { id: userId },
        populate: { player: true },
      })
      return userWithPlayer?.player || null
    },

    /**
     * Check if player is a host, mentor, or founder for an event
     */
    async isEventOrganizer(playerId: number, eventDocumentId: string): Promise<boolean> {
      // Check if player is a founder (has full access)
      const player = await strapi.documents("api::player.player").findFirst({
        filters: { id: playerId },
      })

      if (player?.position === "Founder") {
        return true
      }

      // Check if player is host or mentor of the event
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
    },

    /**
     * Get current user's Stripe account
     */
    async getUserStripeAccount(playerId: number) {
      return await strapi.documents("api::stripe-account.stripe-account").findFirst({
        filters: {
          player: { id: playerId },
        },
      })
    },

    /**
     * Create a Stripe Express connected account
     */
    async createAccount(ctx) {
      const user = ctx.state.user
      const { country, businessType } = ctx.request.body || {}

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      // Check if player already has a Stripe account
      const existingAccount = await this.getUserStripeAccount(player.id)
      if (existingAccount) {
        return ctx.badRequest("You already have a connected Stripe account")
      }

      try {
        const stripe = getStripe()

        // Create Express connected account
        // Default country can be configured via STRIPE_DEFAULT_COUNTRY env var
        const accountCountry = country || STRIPE_DEFAULTS.DEFAULT_COUNTRY
        const account = await stripe.accounts.create({
          type: "express",
          country: accountCountry,
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: businessType || "individual",
          metadata: {
            playerId: player.id.toString(),
            playerDocumentId: player.documentId,
            platform: "play14",
          },
        })

        // Store the account in our database
        const stripeAccount = await strapi.documents("api::stripe-account.stripe-account").create({
          data: {
            stripeAccountId: account.id,
            player: player.id,
            accountStatus: "pending",
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            country: account.country || accountCountry,
            defaultCurrency: account.default_currency || "eur",
          } as any,
        })

        strapi.log.info(`[Stripe Connect] Account ${account.id} created for player ${player.name}`)

        return ctx.send({
          data: {
            documentId: stripeAccount.documentId,
            stripeAccountId: account.id,
            accountStatus: stripeAccount.accountStatus,
          },
        })
      } catch (error: unknown) {
        const errorDetails = handleStripeError("createAccount", error, {
          userId: user.id,
          userEmail: user.email,
          playerId: player.id,
          playerDocumentId: player.documentId,
          requestedCountry: country || STRIPE_DEFAULTS.DEFAULT_COUNTRY,
          requestedBusinessType: businessType || "individual",
        })
        return ctx.badRequest(`Failed to create Stripe account: ${errorDetails.message}`)
      }
    },

    /**
     * Get onboarding link for incomplete accounts
     */
    async getOnboardingLink(ctx) {
      const user = ctx.state.user
      const { returnUrl, refreshUrl } = ctx.query

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      const stripeAccount = await this.getUserStripeAccount(player.id)
      if (!stripeAccount) {
        return ctx.notFound("You don't have a connected Stripe account. Create one first.")
      }

      if (!returnUrl || !refreshUrl) {
        return ctx.badRequest("returnUrl and refreshUrl query parameters are required")
      }

      try {
        const stripe = getStripe()

        const accountLink = await stripe.accountLinks.create({
          account: stripeAccount.stripeAccountId,
          refresh_url: refreshUrl as string,
          return_url: returnUrl as string,
          type: "account_onboarding",
        })

        return ctx.send({
          data: {
            url: accountLink.url,
            expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
          },
        })
      } catch (error: unknown) {
        const errorDetails = handleStripeError("getOnboardingLink", error, {
          userId: user.id,
          playerId: player.id,
          stripeAccountId: stripeAccount.stripeAccountId,
        })
        return ctx.badRequest(`Failed to create onboarding link: ${errorDetails.message}`)
      }
    },

    /**
     * Get Stripe Express dashboard link
     */
    async getDashboardLink(ctx) {
      const user = ctx.state.user

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      const stripeAccount = await this.getUserStripeAccount(player.id)
      if (!stripeAccount) {
        return ctx.notFound("You don't have a connected Stripe account")
      }

      if (stripeAccount.accountStatus !== "active") {
        return ctx.badRequest("Your Stripe account setup is not complete")
      }

      try {
        const stripe = getStripe()

        const loginLink = await stripe.accounts.createLoginLink(stripeAccount.stripeAccountId)

        return ctx.send({
          data: {
            url: loginLink.url,
          },
        })
      } catch (error: unknown) {
        const errorDetails = handleStripeError("getDashboardLink", error, {
          userId: user.id,
          playerId: player.id,
          stripeAccountId: stripeAccount.stripeAccountId,
        })
        return ctx.badRequest(`Failed to create dashboard link: ${errorDetails.message}`)
      }
    },

    /**
     * Get current account status
     */
    async getAccountStatus(ctx) {
      const user = ctx.state.user

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      const stripeAccount = await this.getUserStripeAccount(player.id)
      if (!stripeAccount) {
        return ctx.send({
          data: null,
        })
      }

      // Optionally refresh status from Stripe
      try {
        const stripe = getStripe()
        const account = await stripe.accounts.retrieve(stripeAccount.stripeAccountId)

        // Update local status if changed
        let accountStatus = stripeAccount.accountStatus
        if (account.charges_enabled && account.payouts_enabled) {
          accountStatus = "active"
        } else if (account.details_submitted) {
          accountStatus = "restricted"
        } else {
          accountStatus = "pending"
        }

        if (
          accountStatus !== stripeAccount.accountStatus ||
          account.charges_enabled !== stripeAccount.chargesEnabled ||
          account.payouts_enabled !== stripeAccount.payoutsEnabled ||
          account.details_submitted !== stripeAccount.detailsSubmitted
        ) {
          // Note: Using 'any' type cast until Strapi types are regenerated after schema creation
          const updateData: any = {
            accountStatus,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            onboardingCompletedAt:
              account.details_submitted && !stripeAccount.onboardingCompletedAt
                ? new Date().toISOString()
                : stripeAccount.onboardingCompletedAt,
          }
          await strapi.documents("api::stripe-account.stripe-account").update({
            documentId: stripeAccount.documentId,
            data: updateData,
          })
        }

        return ctx.send({
          data: {
            documentId: stripeAccount.documentId,
            stripeAccountId: stripeAccount.stripeAccountId,
            accountStatus,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            country: stripeAccount.country,
            defaultCurrency: stripeAccount.defaultCurrency,
            businessName: stripeAccount.businessName,
            onboardingCompletedAt: stripeAccount.onboardingCompletedAt,
          },
        })
      } catch (error: unknown) {
        // Log and report to Sentry, but don't fail - return cached status
        handleStripeError("getAccountStatus", error, {
          userId: user.id,
          playerId: player.id,
          stripeAccountId: stripeAccount.stripeAccountId,
        })
        // Return cached status if Stripe API fails
        return ctx.send({
          data: {
            documentId: stripeAccount.documentId,
            stripeAccountId: stripeAccount.stripeAccountId,
            accountStatus: stripeAccount.accountStatus,
            chargesEnabled: stripeAccount.chargesEnabled,
            payoutsEnabled: stripeAccount.payoutsEnabled,
            detailsSubmitted: stripeAccount.detailsSubmitted,
            country: stripeAccount.country,
            defaultCurrency: stripeAccount.defaultCurrency,
            businessName: stripeAccount.businessName,
            onboardingCompletedAt: stripeAccount.onboardingCompletedAt,
          },
        })
      }
    },

    /**
     * Get all Stripe accounts for hosts/mentors of an event
     */
    async getEventHostAccounts(ctx) {
      const user = ctx.state.user
      const { eventId } = ctx.params

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      // Verify event exists and get hosts/mentors
      const event = await strapi.documents("api::event.event").findOne({
        documentId: eventId,
        populate: {
          hosts: {
            fields: ["id", "documentId", "name"],
            populate: {
              stripeAccount: true,
            },
          },
          mentors: {
            fields: ["id", "documentId", "name"],
            populate: {
              stripeAccount: true,
            },
          },
        },
      })

      if (!event) {
        return ctx.notFound("Event not found")
      }

      // Check authorization
      const isOrganizer = await this.isEventOrganizer(player.id, eventId)
      if (!isOrganizer) {
        return ctx.forbidden("Only hosts, mentors, or founders can view event payment settings")
      }

      // Collect all Stripe accounts from hosts and mentors
      const accounts: any[] = []
      const seenIds = new Set<string>()

      const processOrganizer = (organizer: any, role: string) => {
        if (organizer.stripeAccount && !seenIds.has(organizer.stripeAccount.documentId)) {
          seenIds.add(organizer.stripeAccount.documentId)
          accounts.push({
            documentId: organizer.stripeAccount.documentId,
            stripeAccountId: organizer.stripeAccount.stripeAccountId,
            accountStatus: organizer.stripeAccount.accountStatus,
            chargesEnabled: organizer.stripeAccount.chargesEnabled,
            payoutsEnabled: organizer.stripeAccount.payoutsEnabled,
            ownerName: organizer.name,
            ownerDocumentId: organizer.documentId,
            ownerRole: role,
          })
        }
      }

      event.hosts?.forEach((h: any) => processOrganizer(h, "host"))
      event.mentors?.forEach((m: any) => processOrganizer(m, "mentor"))

      return ctx.send({
        data: accounts,
      })
    },

    /**
     * Link Stripe account to an event (with explicit account selection)
     */
    async linkAccountToEvent(ctx) {
      const user = ctx.state.user
      const { eventId } = ctx.params
      const { stripeAccountId } = ctx.request.body || {}

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      // Verify event exists
      const event = await strapi.documents("api::event.event").findOne({
        documentId: eventId,
        populate: {
          hosts: { fields: ["id"] },
          mentors: { fields: ["id"] },
        },
      })

      if (!event) {
        return ctx.notFound("Event not found")
      }

      // Check authorization
      const isOrganizer = await this.isEventOrganizer(player.id, eventId)
      if (!isOrganizer) {
        return ctx.forbidden("Only hosts, mentors, or founders can manage event payments")
      }

      // If stripeAccountId provided, verify it belongs to a host/mentor of this event
      let stripeAccount: any = null

      if (stripeAccountId) {
        // Find the account by Stripe account ID (e.g., acct_xxx)
        stripeAccount = await strapi.documents("api::stripe-account.stripe-account").findFirst({
          filters: { stripeAccountId },
          populate: { player: { fields: ["id"] } },
        })

        if (!stripeAccount) {
          return ctx.badRequest("Stripe account not found")
        }

        // Verify the account owner is a host or mentor of this event (or user is Founder)
        const accountOwnerId = stripeAccount.player?.id
        const isOwnerHost = event.hosts?.some((h: any) => h.id === accountOwnerId)
        const isOwnerMentor = event.mentors?.some((m: any) => m.id === accountOwnerId)
        const isFounder = player.position === "Founder"

        if (!isOwnerHost && !isOwnerMentor && !isFounder) {
          return ctx.forbidden("The selected Stripe account does not belong to an organizer of this event")
        }
      } else {
        // Fallback: use current user's account (backwards compatibility)
        stripeAccount = await this.getUserStripeAccount(player.id)
        if (!stripeAccount) {
          return ctx.badRequest("You don't have a connected Stripe account. Create one first.")
        }
      }

      if (stripeAccount.accountStatus !== "active") {
        return ctx.badRequest("The selected Stripe account setup is not complete")
      }

      // Link account to event
      await strapi.documents("api::event.event").update({
        documentId: eventId,
        data: {
          stripeAccount: stripeAccount.id,
          ticketingMode: "internal",
        } as any,
      })

      strapi.log.info(
        `[Stripe Connect] Account ${stripeAccount.stripeAccountId} linked to event ${event.name}`
      )

      return ctx.send({
        data: {
          success: true,
          stripeAccountId: stripeAccount.stripeAccountId,
        },
      })
    },

    /**
     * Unlink Stripe account from an event
     */
    async unlinkAccountFromEvent(ctx) {
      const user = ctx.state.user
      const { eventId } = ctx.params

      if (!user) {
        return ctx.unauthorized("You must be logged in")
      }

      const player = await this.getLinkedPlayer(user.id)
      if (!player) {
        return ctx.forbidden("You must have a linked player profile")
      }

      // Verify event exists
      const event = await strapi.documents("api::event.event").findOne({
        documentId: eventId,
      })

      if (!event) {
        return ctx.notFound("Event not found")
      }

      // Check authorization
      const isOrganizer = await this.isEventOrganizer(player.id, eventId)
      if (!isOrganizer) {
        return ctx.forbidden("Only hosts, mentors, or founders can manage event payments")
      }

      // Unlink account from event
      await strapi.documents("api::event.event").update({
        documentId: eventId,
        data: {
          stripeAccount: null,
          ticketingMode: "none",
        } as any,
      })

      strapi.log.info(`[Stripe Connect] Stripe account unlinked from event ${event.name}`)

      return ctx.send({
        data: {
          success: true,
        },
      })
    },
  }
}
