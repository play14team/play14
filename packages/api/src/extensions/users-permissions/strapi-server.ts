/**
 * Extension to customize the users-permissions plugin
 * - Adds population of player relation to /users/me endpoint
 * - Merges OAuth logins by email (allows multiple providers for same user)
 * - Assigns roles based on linked player position at first login
 */

interface StrapiContext {
  state: {
    user?: {
      id: number
    }
  }
  body: unknown
  unauthorized: () => void
  notFound: () => void
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

// Map player positions to role types
const POSITION_TO_ROLE: Record<string, string> = {
  Player: "player",
  Host: "host",
  Mentor: "mentor",
  Founder: "founder",
}

/**
 * Sync user role based on their linked player's position
 */
async function syncUserRoleWithPlayerPosition(userId: number): Promise<void> {
  // Get user with player relation
  const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
    filters: { id: userId },
    populate: { role: true, player: true },
  })

  if (!userWithPlayer?.player?.position) {
    return // No player linked or no position set
  }

  const position = userWithPlayer.player.position as string
  const expectedRoleType = POSITION_TO_ROLE[position]

  if (!expectedRoleType) {
    return // Unknown position
  }

  // Check if user already has the correct role
  const currentRoleType = userWithPlayer.role?.type
  if (currentRoleType === expectedRoleType) {
    return // Role already correct
  }

  // Find the role matching the player's position
  const targetRole = await strapi.documents("plugin::users-permissions.role").findFirst({
    filters: { type: expectedRoleType },
  })

  if (!targetRole) {
    strapi.log.warn(`[OAuth] Role type "${expectedRoleType}" not found for position "${position}"`)
    return
  }

  // Update user's role
  await strapi.documents("plugin::users-permissions.user").update({
    documentId: userWithPlayer.documentId,
    data: { role: targetRole.id } as any,
  })

  strapi.log.info(
    `[OAuth] Updated user ${userId} role from "${currentRoleType}" to "${expectedRoleType}" based on player position "${position}"`
  )
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
      const userWithPlayer = await strapi
        .documents("plugin::users-permissions.user")
        .findFirst({
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

  // Wrap providers service connect method to merge users by email
  const originalProvidersFactory = plugin.services.providers as () => {
    connect: (provider: string, query: Record<string, unknown>) => Promise<UserRecord>
  }

  plugin.services.providers = function (this: unknown, ...args: unknown[]) {
    // Call original factory to get the service instance with proper context
    const service = originalProvidersFactory.apply(this, args as [])
    const originalConnect = service.connect.bind(service)

    // Wrap the connect method
    service.connect = async function (
      provider: string,
      query: Record<string, unknown>
    ): Promise<UserRecord> {
      let user: UserRecord

      try {
        // Try the original connect
        user = await originalConnect(provider, query)
      } catch (error: unknown) {
        const err = error as { message?: string }
        // Check if error is "Email is already taken"
        if (err.message?.includes("Email is already taken")) {
          // Get user profile from the OAuth provider to find the email
          const providersRegistry = strapi
            .plugin("users-permissions")
            .service("providers-registry")

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
        await syncUserRoleWithPlayerPosition(user.id)
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
