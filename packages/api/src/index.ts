import type { Core } from "@strapi/strapi"
import { bootstrapPermissions } from "./bootstrap/permissions"
import { initSentry } from "./services/observability/sentry"

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Initialize Sentry early for error tracking and APM
    initSentry()
    // Override LinkedIn provider to use OpenID Connect (OIDC) instead of deprecated scopes
    // LinkedIn deprecated r_liteprofile and r_emailaddress scopes in favor of OpenID Connect
    // See: https://github.com/strapi/strapi/issues/19641
    const providersRegistry = strapi.plugin("users-permissions").service("providers-registry")
    const baseURL = `${strapi.config.server.url}/api/connect`

    providersRegistry.add("linkedin", {
      icon: "linkedin",
      enabled: false,
      grantConfig: {
        key: "",
        secret: "",
        callback: `${baseURL}/linkedin/callback`,
        scope: ["openid", "profile", "email"],
        authorize_url: "https://www.linkedin.com/oauth/v2/authorization",
        access_url: "https://www.linkedin.com/oauth/v2/accessToken",
        oauth: 2,
      },
      async authCallback({
        accessToken,
        purest,
      }: {
        accessToken: string
        purest: (config: { provider: string; config?: Record<string, unknown> }) => {
          get: (path: string) => {
            auth: (token: string) => {
              request: () => Promise<{ body: Record<string, unknown> }>
            }
          }
        }
      }) {
        // Use LinkedIn's OpenID Connect userinfo endpoint
        const linkedin = purest({
          provider: "linkedin",
          config: {
            linkedin: {
              default: {
                origin: "https://api.linkedin.com",
                path: "{path}",
                headers: {
                  Authorization: "Bearer {auth}",
                },
              },
            },
          },
        })

        const { body } = await linkedin.get("v2/userinfo").auth(accessToken).request()

        // OpenID Connect userinfo returns: sub, name, given_name, family_name, picture, email, email_verified
        const email = body.email as string
        const name = body.name as string
        const givenName = body.given_name as string

        return {
          username: givenName || name || email.split("@")[0],
          email,
        }
      },
    })

    // Register Document Service Middleware for player-claim
    strapi.documents.use(async (context, next) => {
      // Only intercept player-claim updates
      if (context.uid !== "api::player-claim.player-claim") {
        return next()
      }

      // Only handle update actions
      if (context.action !== "update") {
        return next()
      }

      const data = context.params?.data as Record<string, any> | undefined
      const newStatus = data?.claimStatus
      if (!newStatus) {
        return next()
      }

      // Get the current claim to check if status is changing
      const documentId = context.params?.documentId
      if (!documentId) {
        return next()
      }

      const currentClaim = await strapi.documents("api::player-claim.player-claim").findOne({
        documentId,
        populate: {
          user: true,
          player: {
            populate: {
              user: true,
            },
          },
        },
      })

      if (!currentClaim) {
        return next()
      }

      const oldStatus = currentClaim.claimStatus

      // If status is not changing, just proceed
      if (oldStatus === newStatus) {
        return next()
      }

      strapi.log.info(
        `[PlayerClaim Middleware] Status changing from ${oldStatus} to ${newStatus} for claim ${documentId}`
      )

      // Set processedAt if changing to approved or rejected and not already set
      if ((newStatus === "approved" || newStatus === "rejected") && !data?.processedAt) {
        ;(context.params.data as Record<string, any>).processedAt = new Date().toISOString()
        strapi.log.info(`[PlayerClaim Middleware] Setting processedAt to ${(context.params.data as Record<string, any>).processedAt}`)
      }

      // Execute the update
      const result = await next()

      // After update: handle approved status
      if (newStatus === "approved" && currentClaim.user && currentClaim.player) {
        // Check if player is not already linked to a user
        if (!currentClaim.player.user) {
          try {
            // Get the player's internal ID
            const player = await strapi.documents("api::player.player").findOne({
              documentId: currentClaim.player.documentId,
            })

            if (player) {
              // Get user documentId for Document Service update
              const claimUser = await strapi.documents("plugin::users-permissions.user").findFirst({
                filters: { id: currentClaim.user.id },
              })
              if (claimUser) {
                await strapi.documents("plugin::users-permissions.user").update({
                  documentId: claimUser.documentId,
                  data: { player: player.id } as any,
                })
                strapi.log.info(
                  `[PlayerClaim Middleware] Linked user ${currentClaim.user.id} to player ${player.id}`
                )
              }
            }
          } catch (error) {
            strapi.log.error(`[PlayerClaim Middleware] Failed to link user to player: ${error}`)
          }
        } else {
          strapi.log.info(
            `[PlayerClaim Middleware] Player ${currentClaim.player.documentId} already linked to a user, skipping`
          )
        }
      }

      return result
    })
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Update LinkedIn OAuth scopes in the grant store to use OpenID Connect
    // The grant configuration is stored in the database and used by the OAuth flow
    const grantStore = strapi.store({
      type: "plugin",
      name: "users-permissions",
      key: "grant",
    })

    const grantConfig = (await grantStore.get()) as Record<string, Record<string, unknown>> | null

    strapi.log.info(`[LinkedIn OAuth] Current grant config: ${JSON.stringify(grantConfig?.linkedin)}`)

    if (grantConfig?.linkedin) {
      const currentScopes = grantConfig.linkedin.scope as string[] | undefined
      const hasDeprecatedScopes =
        currentScopes?.includes("r_liteprofile") || currentScopes?.includes("r_emailaddress")

      strapi.log.info(`[LinkedIn OAuth] Current scopes: ${JSON.stringify(currentScopes)}, hasDeprecatedScopes: ${hasDeprecatedScopes}`)

      if (hasDeprecatedScopes || !currentScopes) {
        // Update to OpenID Connect scopes
        grantConfig.linkedin.scope = ["openid", "profile", "email"]

        await grantStore.set({ value: grantConfig })

        strapi.log.info(
          "[LinkedIn OAuth] Updated scopes from deprecated r_liteprofile/r_emailaddress to OpenID Connect (openid, profile, email)"
        )
      } else {
        strapi.log.info(`[LinkedIn OAuth] Scopes already correct: ${JSON.stringify(currentScopes)}`)
      }
    } else {
      strapi.log.info("[LinkedIn OAuth] No LinkedIn configuration found in grant store")
    }

    // Bootstrap user role permissions
    await bootstrapPermissions(strapi)
  },
}
