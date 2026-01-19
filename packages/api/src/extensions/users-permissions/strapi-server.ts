/**
 * Extension to customize the users-permissions plugin
 * - Adds population of player relation to /users/me endpoint
 * - Merges OAuth logins by email (allows multiple providers for same user)
 * - Assigns roles based on linked player position at first login
 * - Implements account lockout after failed login attempts
 */

import {
  checkAccountLockout,
  clearFailedAttempts,
  recordFailedAttempt,
} from "../../services/account-lockout"
import { syncUserRoleWithPlayerPosition } from "../../services/user-role-sync"

interface StrapiContext {
  state: {
    user?: {
      id: number
    }
  }
  request: {
    body?: {
      identifier?: string
      password?: string
    }
  }
  body: unknown
  unauthorized: () => void
  notFound: () => void
  badRequest: (message: string) => void
}

interface UserRecord {
  id: number
  documentId: string
  username: string
  email: string
  provider: string
  confirmed: boolean
  blocked: boolean
  createdAt: string
  updatedAt: string
  role?: { id: number; type?: string }
  player?: { position?: string }
}

interface StrapiPlugin {
  controllers: Record<string, unknown>
  services: Record<string, unknown>
}

export default (plugin: StrapiPlugin) => {
  const originalUserController = plugin.controllers.user as Record<
    string,
    (ctx: StrapiContext) => Promise<void>
  >

  // Extend the me action to populate player relation
  plugin.controllers.user = {
    ...originalUserController,

    async me(ctx: StrapiContext) {
      const user = ctx.state.user

      if (!user) {
        return ctx.unauthorized()
      }

      // Fetch user with player relation populated
      const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
        filters: { id: user.id },
        populate: {
          role: true,
          player: {
            populate: {
              avatar: true,
            },
          },
        },
      })

      if (!userWithPlayer) {
        return ctx.notFound()
      }

      const invitationStatus = userWithPlayer.invitationStatus
      if (["pending", "sent", "reminded"].includes(invitationStatus)) {
        await strapi.documents("plugin::users-permissions.user").update({
          documentId: userWithPlayer.documentId,
          data: {
            invitationStatus: "accepted",
            invitationAcceptedAt: new Date().toISOString(),
          } as any,
        })
      }

      // Remove sensitive fields
      const sanitizedUser = {
        id: userWithPlayer.id,
        documentId: userWithPlayer.documentId,
        username: userWithPlayer.username,
        email: userWithPlayer.email,
        provider: userWithPlayer.provider,
        confirmed: userWithPlayer.confirmed,
        blocked: userWithPlayer.blocked,
        createdAt: userWithPlayer.createdAt,
        updatedAt: userWithPlayer.updatedAt,
        player: userWithPlayer.player,
      }

      ctx.body = sanitizedUser
    },
  }

  // Extend auth controller to add account lockout
  // The controller is a factory function ({ strapi }) => controller, so we wrap it
  const originalAuthControllerFactory = plugin.controllers.auth as (context: {
    strapi: typeof globalThis.strapi
  }) => Record<string, (ctx: StrapiContext, next?: () => Promise<void>) => Promise<void>>

  plugin.controllers.auth = (context: { strapi: typeof globalThis.strapi }) => {
    // Call original factory to get all controller methods
    const originalController = originalAuthControllerFactory(context)

    return {
      ...originalController,

      /**
       * Local login with account lockout protection
       * Wraps the original callback method for local provider
       */
      async callback(ctx: StrapiContext) {
        const { identifier } = ctx.request.body || {}

        // Only apply lockout to local authentication (username/password)
        // OAuth providers handle their own security
        const provider = (ctx as any).params?.provider || "local"

        if (provider === "local" && identifier) {
          // Check if account is locked
          const lockStatus = checkAccountLockout(identifier)
          if (lockStatus.isLocked) {
            const remainingMinutes = Math.ceil((lockStatus.remainingMs || 0) / 60000)
            strapi.log.warn(`[Auth] Login blocked for locked account: ${identifier}`)
            ctx.body = {
              error: {
                status: 429,
                name: "TooManyRequestsError",
                message: `Account temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`,
              },
            }
            ;(ctx as any).status = 429
            return
          }
        }

        // Call original callback
        try {
          await originalController.callback.call(this, ctx)

          // Check if login was successful (jwt present in response)
          const response = ctx.body as { jwt?: string; user?: { email?: string } } | undefined
          if (response?.jwt && identifier) {
            // Clear failed attempts on successful login
            clearFailedAttempts(identifier)
            strapi.log.info(`[Auth] Successful login for: ${identifier}`)
          }
        } catch (error) {
          // Login failed - record the attempt
          if (provider === "local" && identifier) {
            const result = recordFailedAttempt(identifier)

            if (result.isNowLocked) {
              strapi.log.warn(`[Auth] Account locked after failed attempts: ${identifier}`)
            } else {
              strapi.log.info(
                `[Auth] Failed login for ${identifier} (${result.attemptsRemaining} attempts remaining)`
              )
            }
          }
          throw error
        }

        // Also check response body for error (Strapi sometimes returns errors in body, not exception)
        const response = ctx.body as { error?: unknown } | undefined
        if (response?.error && provider === "local" && identifier) {
          const result = recordFailedAttempt(identifier)

          if (result.isNowLocked) {
            strapi.log.warn(`[Auth] Account locked after failed attempts: ${identifier}`)
            // Update response to show lockout message
            ctx.body = {
              error: {
                status: 429,
                name: "TooManyRequestsError",
                message:
                  "Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.",
              },
            }
            ;(ctx as any).status = 429
          } else {
            strapi.log.info(
              `[Auth] Failed login for ${identifier} (${result.attemptsRemaining} attempts remaining)`
            )
          }
        }
      },
    }
  }

  // Wrap providers service connect method to merge users by email
  const originalProvidersFactory = plugin.services.providers as () => {
    connect: (provider: string, query: Record<string, unknown>) => Promise<UserRecord>
  }

  plugin.services.providers = function (this: unknown, ...args: unknown[]) {
    // Call original factory to get the service instance with proper context
    const service = originalProvidersFactory.apply(this, args as [])
    const originalConnect = service.connect.bind(service)

    // Wrap the connect method
    service.connect = async (
      provider: string,
      query: Record<string, unknown>
    ): Promise<UserRecord> => {
      let user: UserRecord

      try {
        // Try the original connect
        user = await originalConnect(provider, query)
      } catch (error: unknown) {
        const err = error as { message?: string }
        // Check if error is "Email is already taken"
        if (err.message?.includes("Email is already taken")) {
          // Get user profile from the OAuth provider to find the email
          const providersRegistry = strapi.plugin("users-permissions").service("providers-registry")

          const profile = await providersRegistry.run({
            provider,
            accessToken: query.access_token,
            query,
            providers: providersRegistry.getAll(),
          })

          if (profile?.email) {
            const email = profile.email.toLowerCase()
            const existingUser = (await strapi
              .documents("plugin::users-permissions.user")
              .findFirst({
                filters: { email },
                populate: { role: true },
              })) as UserRecord | null

            if (existingUser) {
              strapi.log.info(
                `[OAuth] User ${email} logged in via ${provider}, using existing account (original provider: ${existingUser.provider})`
              )
              user = existingUser
            } else {
              throw error
            }
          } else {
            throw error
          }
        } else {
          throw error
        }
      }

      // Sync user role with their linked player's position
      try {
        await syncUserRoleWithPlayerPosition(strapi, user.id)
      } catch (syncError) {
        strapi.log.error(`[OAuth] Failed to sync user role: ${syncError}`)
        // Don't fail login if role sync fails
      }

      return user
    }

    return service
  }

  return plugin
}
