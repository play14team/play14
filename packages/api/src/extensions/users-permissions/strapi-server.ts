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

    // Resolve the OAuth profile email so we can look up an existing user
    // BEFORE calling `originalConnect`. We cache the result in `profileEmail`
    // and reuse it in the safety-net catch instead of fetching the profile a
    // second time there.
    //
    // Trade-off — there are still TWO profile fetches per first-time login
    // (one here, one inside `originalConnect`), because `originalConnect` is
    // a plugin black box that always re-fetches internally. We accept that
    // because every OAuth provider currently wired up in this project
    // (Google, GitHub, Microsoft, LinkedIn) issues access tokens that can be
    // re-presented to the user-info endpoint until they expire — they're not
    // single-use. If a future provider is added with single-use access tokens
    // (e.g. some PKCE-only flows), this assumption breaks and the second
    // fetch inside `originalConnect` will fail with a token error that this
    // catch does NOT swallow. In that case either drop the proactive fetch
    // for that provider or patch `originalConnect` directly.
    const resolveProfileEmail = async (
      provider: string,
      query: Record<string, unknown>
    ): Promise<string | null> => {
      try {
        const providersRegistry = strapi.plugin("users-permissions").service("providers-registry")
        const profile = await providersRegistry.run({
          provider,
          accessToken: query.access_token,
          query,
          providers: providersRegistry.getAll(),
        })
        return typeof profile?.email === "string" ? profile.email.toLowerCase() : null
      } catch (error) {
        const errName = error instanceof Error ? error.name : typeof error
        const errMsg = error instanceof Error ? error.message : String(error)
        strapi.log.warn(
          `[OAuth] Profile email resolution failed for provider=${provider}: ${errName}: ${errMsg}`
        )
        return null
      }
    }

    // Proactive dedupe: look up an existing user by the OAuth profile email
    // BEFORE delegating to the upstream `connect`. This guards against
    // duplicate user rows even when the users-permissions `unique_email`
    // setting is not enforced in the live core store (config drift), or when
    // a previous user was created by a non-OAuth code path (player auto-link,
    // CSV import, etc.).
    //
    // Security: only an `confirmed: true` user is merged. An unconfirmed local
    // row is never silently bound to an OAuth login — that would let an
    // attacker take over an account by registering its email at any IdP that
    // happens to issue it. If `originalConnect` then runs and Strapi's own
    // checks reject the unconfirmed row, the operator gets a meaningful error;
    // they don't get a silent merge.
    //
    // `findFirst` sorted by `createdAt` ascending picks the oldest matching
    // user — matches `pickCanonical()` in scripts/cleanup-duplicate-users.ts
    // so the OAuth wrapper and the cleanup never disagree on which row is
    // canonical.
    const lookupExistingByEmail = async (
      email: string,
      provider: string
    ): Promise<UserRecord | null> => {
      // Case-insensitive equality — the email is already lowercased by
      // resolveProfileEmail, so `$eqi` is effectively a no-op for matching,
      // but it documents intent and stays in sync with `findUserByEmail`
      // (the only other email-lookup helper in the codebase).
      const existing = (await strapi.documents("plugin::users-permissions.user").findFirst({
        filters: { email: { $eqi: email } } as any,
        populate: { role: true, player: true } as any,
        sort: { createdAt: "asc" },
      })) as (UserRecord & { confirmed?: boolean }) | null
      if (!existing) return null
      if (!existing.confirmed) {
        strapi.log.warn(
          `[OAuth] User ${email} via ${provider} matches an unconfirmed account (id=${existing.id}); refusing silent merge to prevent account-takeover-by-OAuth`
        )
        return null
      }
      strapi.log.info(
        `[OAuth] User ${email} logged in via ${provider}, reusing existing account (original provider: ${existing.provider})`
      )
      return existing
    }

    // Wrap the connect method
    service.connect = async (
      provider: string,
      query: Record<string, unknown>
    ): Promise<UserRecord> => {
      const profileEmail = await resolveProfileEmail(provider, query)
      let user: UserRecord | null = profileEmail
        ? await lookupExistingByEmail(profileEmail, provider)
        : null

      if (!user) {
        try {
          user = await originalConnect(provider, query)
        } catch (error: unknown) {
          const err = error as { message?: string }
          // Reactive safety net for the narrow race window where a duplicate
          // gets created between our lookup and `originalConnect`. We reuse
          // `profileEmail` rather than re-running the OAuth profile fetch
          // because many providers won't honour the same access_token twice.
          if (err.message?.includes("Email is already taken") && profileEmail) {
            const existing = await lookupExistingByEmail(profileEmail, provider)
            if (existing) {
              user = existing
            } else {
              throw error
            }
          } else {
            throw error
          }
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
