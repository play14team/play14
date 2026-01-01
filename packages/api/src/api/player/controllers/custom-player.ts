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

    // Position changes are not allowed via updateMe - use updatePlayerPosition instead
    if (sanitizedData.position) {
      const currentPosition = userWithPlayer.player.position
      const newPosition = sanitizedData.position as string

      if (newPosition !== currentPosition) {
        return ctx.forbidden(
          "You cannot change your own position. Position changes must be made by another organizer."
        )
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

  /**
   * Update another player's position with hierarchical permission rules:
   * - Player: cannot change any position
   * - Host: can upgrade Player → Host
   * - Mentor: can upgrade Player → Host, or Host → Mentor
   * - Founder: can do anything (upgrade or downgrade any position)
   */
  async updatePlayerPosition(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Players cannot change positions
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Players cannot change positions")
    }

    const { id: playerId } = ctx.params
    const { position: newPosition } = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    if (!newPosition) {
      return ctx.badRequest("New position is required")
    }

    const validPositions = ["Player", "Host", "Mentor", "Founder"]
    if (!validPositions.includes(newPosition)) {
      return ctx.badRequest("Invalid position value")
    }

    // Find the target player
    const targetPlayer = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
    })

    if (!targetPlayer) {
      return ctx.notFound("Player not found")
    }

    const targetCurrentPosition = targetPlayer.position

    // If position is not changing, just return success
    if (newPosition === targetCurrentPosition) {
      return ctx.send({
        data: targetPlayer,
      })
    }

    // Define position hierarchy (higher number = higher rank)
    const positionRank: Record<string, number> = {
      Player: 0,
      Host: 1,
      Mentor: 2,
      Founder: 3,
    }

    const targetCurrentRank = positionRank[targetCurrentPosition] || 0
    const targetNewRank = positionRank[newPosition] || 0

    // Apply permission rules based on current user's position
    if (currentUserPosition === "Host") {
      // Host can only upgrade Player → Host
      if (!(targetCurrentPosition === "Player" && newPosition === "Host")) {
        return ctx.forbidden("Hosts can only upgrade Players to Host")
      }
    } else if (currentUserPosition === "Mentor") {
      // Mentor can upgrade Player → Host, or Host → Mentor
      const allowedTransitions = [
        { from: "Player", to: "Host" },
        { from: "Host", to: "Mentor" },
      ]
      const isAllowed = allowedTransitions.some(
        (t) => t.from === targetCurrentPosition && t.to === newPosition
      )
      if (!isAllowed) {
        return ctx.forbidden(
          "Mentors can only upgrade Players to Host, or Hosts to Mentor"
        )
      }
    }
    // Founders can do anything - no restrictions

    try {
      // Update the player's position
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerId,
        data: { position: newPosition } as any,
      })

      strapi.log.info(
        `[Player] Position updated: ${targetPlayer.name} (${targetCurrentPosition} → ${newPosition}) by ${userWithPlayer.player.name} (${currentUserPosition})`
      )

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to update player position: ${error}`)
      return ctx.internalServerError("Failed to update player position")
    }
  },

  /**
   * List all players with optional filtering by letter or search query
   * Only accessible by hosts, mentors, and founders
   */
  async listPlayers(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can list players
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can view the players list")
    }

    const { letter, search, page = 1, pageSize = 50 } = ctx.query

    try {
      // Helper function to remove accents from a string
      const removeAccents = (str: string): string => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      }

      // Fetch all players (we'll filter and sort in JavaScript for proper locale handling)
      const allPlayers = await strapi.documents("api::player.player").findMany({
        populate: {
          avatar: true,
        },
      })

      // Apply search filter (accent-insensitive, case-insensitive)
      let filteredPlayers = allPlayers
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchNormalized = removeAccents(search.trim().toLowerCase())
        filteredPlayers = filteredPlayers.filter((player) => {
          const nameNormalized = removeAccents(player.name.toLowerCase())
          return nameNormalized.includes(searchNormalized)
        })
      }

      // Apply letter filter (accent-insensitive)
      if (letter && typeof letter === "string" && letter.length === 1) {
        const letterNormalized = removeAccents(letter.toUpperCase())
        filteredPlayers = filteredPlayers.filter((player) => {
          const firstChar = removeAccents(player.name.charAt(0).toUpperCase())
          return firstChar === letterNormalized
        })
      }

      // Sort using locale-aware comparison (handles accents properly)
      filteredPlayers.sort((a, b) => {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
      })

      // Calculate pagination
      const total = filteredPlayers.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + Number(pageSize))

      // Format response to match expected structure
      const formattedPlayers = paginatedPlayers.map((player) => ({
        documentId: player.documentId,
        name: player.name,
        position: player.position,
        company: player.company,
        avatar: player.avatar ? { url: player.avatar.url } : null,
      }))

      return ctx.send({
        data: formattedPlayers,
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
      strapi.log.error(`[Player] Failed to list players: ${error}`)
      return ctx.internalServerError("Failed to list players")
    }
  },

  /**
   * Get a player for editing by another organizer
   */
  async getPlayerForEdit(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can edit other players
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can edit player profiles")
    }

    const { id: playerId } = ctx.params

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    try {
      const player = await strapi.documents("api::player.player").findOne({
        documentId: playerId,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      if (!player) {
        return ctx.notFound("Player not found")
      }

      return ctx.send({
        data: player,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to get player for edit: ${error}`)
      return ctx.internalServerError("Failed to get player")
    }
  },

  /**
   * Update another player's profile (for organizers)
   * Position changes use updatePlayerPosition endpoint
   */
  async updatePlayer(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: user.id },
        populate: { player: true },
      })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can edit other players
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can edit player profiles")
    }

    const { id: playerId } = ctx.params
    const updateData: PlayerUpdateData = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    // Find the target player
    const targetPlayer = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
    })

    if (!targetPlayer) {
      return ctx.notFound("Player not found")
    }

    // Validate and sanitize allowed fields (excluding position - use updatePlayerPosition for that)
    const allowedFields = [
      "name",
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

    // Don't allow changing slug or documentId
    delete sanitizedData.slug
    delete sanitizedData.documentId

    strapi.log.info(
      `[Player] Organizer ${userWithPlayer.player.name} updating player ${playerId}`
    )

    try {
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerId,
        data: sanitizedData,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(`[Player] Successfully updated player ${playerId}`)

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to update player: ${error}`)
      return ctx.internalServerError("Failed to update player")
    }
  },
})
