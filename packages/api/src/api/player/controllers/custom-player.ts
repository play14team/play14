/**
 * Custom controller for player profile management
 * Allows authenticated users to update only their own player profile
 */

import type { Core } from "@strapi/strapi"
import slugify from "slugify"

interface PlayerUpdateData {
  name?: string
  position?: string
  company?: string | null
  tagline?: string | null
  bio?: string | null
  website?: string | null
  socialNetworks?: Array<{
    id?: string
    type: string
    url: string
  }>
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get the current user's player profile
   */
  async findMe(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to access your profile")
    }

    // Get user with player relation
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: {
          player: {
            populate: {
              avatar: true,
              socialNetworks: true,
            },
          },
        },
      })

    if (!userWithPlayer?.player) {
      return ctx.notFound("No player profile linked to this user")
    }

    return ctx.send({
      data: userWithPlayer.player,
    })
  },

  /**
   * Update the current user's player profile
   */
  async updateMe(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to update your profile")
    }

    // Get user with player relation to get the player documentId
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.notFound("No player profile linked to this user")
    }

    const playerDocumentId = userWithPlayer.player.documentId

    // Get the update data from request body
    const updateData: PlayerUpdateData = ctx.request.body?.data || {}

    // Validate and sanitize allowed fields
    const allowedFields = [
      "name",
      "position",
      "company",
      "tagline",
      "bio",
      "website",
      "socialNetworks",
    ]

    const sanitizedData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updateData) {
        sanitizedData[field] = updateData[field as keyof PlayerUpdateData]
      }
    }

    // Validate position enum and restrict changes to Founders only
    if (sanitizedData.position) {
      const validPositions = ["Player", "Host", "Mentor", "Founder"]
      if (!validPositions.includes(sanitizedData.position as string)) {
        return ctx.badRequest("Invalid position value")
      }

      // Only Founders can change position
      const currentPosition = userWithPlayer.player.position
      if (currentPosition !== "Founder" && sanitizedData.position !== currentPosition) {
        return ctx.forbidden("Only Founders can change player position")
      }
    }

    // Don't allow changing slug or other protected fields
    delete sanitizedData.slug
    delete sanitizedData.documentId

    strapi.log.info(
      `[Player] User ${user.id} updating player ${playerDocumentId}`,
    )
    strapi.log.debug(`[Player] Update data: ${JSON.stringify(sanitizedData)}`)

    try {
      // Update the player using document service
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerDocumentId,
        data: sanitizedData,
        populate: {
          avatar: true,
          picture: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(`[Player] Successfully updated player ${playerDocumentId}`)

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to update player: ${error}`)
      return ctx.internalServerError("Failed to update player profile")
    }
  },

  /**
   * Upload a picture for the current user's player profile
   */
  async uploadPicture(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to upload a picture")
    }

    // Get user with player relation
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.notFound("No player profile linked to this user")
    }

    const player = userWithPlayer.player
    const playerDocumentId = player.documentId
    const playerId = player.id

    // Validate that files were provided
    const files = ctx.request.files

    if (!files || !files.files) {
      return ctx.badRequest("No file provided")
    }

    try {
      // Get the upload plugin service
      const uploadService = strapi.plugin("upload").service("upload")

      // Prepare file(s)
      const fileArray = Array.isArray(files.files) ? files.files : [files.files]

      // Upload the file(s) and link to the player's avatar field
      // Note: Files will be placed in "API Uploads" folder as folder assignment
      // is an admin panel-only feature in Strapi
      await uploadService.upload({
        data: {
          refId: playerId,
          ref: "api::player.player",
          field: "avatar",
        },
        files: fileArray,
      })

      strapi.log.info(
        `[Player] Successfully uploaded avatar for player ${playerDocumentId}`,
      )

      // Return the updated player with avatar
      const updatedPlayer = await strapi.documents("api::player.player").findOne({
        documentId: playerDocumentId,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to upload avatar: ${error}`)
      return ctx.internalServerError("Failed to upload avatar")
    }
  },

  /**
   * Delete the avatar for the current user's player profile
   */
  async deletePicture(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to delete your avatar")
    }

    // Get user with player relation and avatar
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: {
          player: {
            populate: { avatar: true },
          },
        },
      })

    if (!userWithPlayer?.player) {
      return ctx.notFound("No player profile linked to this user")
    }

    const player = userWithPlayer.player
    const playerDocumentId = player.documentId

    if (!player.avatar) {
      return ctx.notFound("No avatar to delete")
    }

    try {
      // Delete the file using upload plugin service
      const uploadService = strapi.plugin("upload").service("upload")
      await uploadService.remove(player.avatar)

      strapi.log.info(
        `[Player] Deleted avatar for player ${playerDocumentId}`,
      )

      // Return the updated player without avatar
      const updatedPlayer = await strapi.documents("api::player.player").findOne({
        documentId: playerDocumentId,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to delete avatar: ${error}`)
      return ctx.internalServerError("Failed to delete avatar")
    }
  },

  /**
   * Create a new player and link it to the current user
   * Used when no matching player exists
   */
  async createForUser(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to create a player profile")
    }

    // Check if user already has a player linked
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (userWithPlayer?.player) {
      return ctx.badRequest("You already have a player profile linked")
    }

    const { name, company } = ctx.request.body?.data || {}

    if (!name || name.length < 2) {
      return ctx.badRequest("Name is required and must be at least 2 characters")
    }

    // Check if a player with this name already exists
    const existingPlayer = await strapi.documents("api::player.player").findMany({
      filters: {
        name: { $eqi: name },
      },
    })

    if (existingPlayer.length > 0) {
      return ctx.badRequest("A player with this name already exists. Please claim that profile instead.")
    }

    try {
      // Generate slug from name
      const slug = slugify(name, { lower: true, strict: true })

      // Create the new player
      const newPlayer = await strapi.documents("api::player.player").create({
        data: {
          name,
          slug,
          company: company || null,
          position: "Player", // Default position for new players
        },
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      // Link the user to the player (User owns the relation via 'player' field)
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: userWithPlayer.documentId,
        data: { player: newPlayer.id } as any,
      })

      strapi.log.info(
        `[Player] Created new player ${newPlayer.documentId} for user ${user.id} (${user.email})`
      )

      return ctx.send({
        data: {
          ...newPlayer,
          linked: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to create player: ${error}`)
      return ctx.internalServerError("Failed to create player profile")
    }
  },

  /**
   * Auto-link an unlinked player to the current user
   * Used for exact name matches
   */
  async autoLink(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Check if user already has a player linked
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (userWithPlayer?.player) {
      return ctx.badRequest("You already have a player profile linked")
    }

    const { playerId } = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    // Find the player
    const player = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
      populate: { user: true },
    })

    if (!player) {
      return ctx.notFound("Player not found")
    }

    if (player.user) {
      return ctx.badRequest("This player is already linked to another user")
    }

    // Verify the name matches (case-insensitive)
    const userName = user.username || ""
    if (player.name.toLowerCase() !== userName.toLowerCase()) {
      return ctx.forbidden("Player name does not match your account name. Please use the claim process instead.")
    }

    try {
      // Link the user to the player (User owns the relation via 'player' field)
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: userWithPlayer.documentId,
        data: { player: player.id } as any,
      })

      // Fetch the updated player with relations
      const updatedPlayer = await strapi.documents("api::player.player").findOne({
        documentId: playerId,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(
        `[Player] Auto-linked player ${playerId} to user ${user.id} (${user.email})`
      )

      return ctx.send({
        data: {
          ...updatedPlayer,
          linked: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to auto-link player: ${error}`)
      return ctx.internalServerError("Failed to link player profile")
    }
  },
})
