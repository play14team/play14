/**
 * Custom controller for player profile management
 * Allows authenticated users to update only their own player profile
 */

import { randomBytes } from "node:crypto"
import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import UserInvitationEmail from "../../../emails/user-invitation"
import { sanitizeHtml, sanitizePlainText } from "../../../libs/sanitize"
import { nameToUsername } from "../../../libs/strings"
import { isValidEmail, isValidUrl } from "../../../libs/validation"
import { addSubscriberToGroup } from "../../../services/sender-subscribers"
import { syncUserRoleFromPlayer } from "../../../services/user-role-sync"

/**
 * Get or create a folder in the media library by name
 * @param strapi - Strapi instance
 * @param folderName - Name of the folder to find or create
 * @returns The folder ID
 */
async function getOrCreateMediaFolder(strapi: Core.Strapi, folderName: string): Promise<number> {
  // Try to find existing folder by name at root level
  const existingFolder = await strapi.db.query("plugin::upload.folder").findOne({
    where: {
      name: folderName,
      parent: null,
    },
  })

  if (existingFolder) {
    return existingFolder.id
  }

  // Create the folder if it doesn't exist
  // Get the next pathId
  const maxPathIdResult = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { pathId: "desc" },
    limit: 1,
  })

  const nextPathId = maxPathIdResult.length > 0 ? maxPathIdResult[0].pathId + 1 : 1

  const newFolder = await strapi.db.query("plugin::upload.folder").create({
    data: {
      name: folderName,
      pathId: nextPathId,
      path: `/${nextPathId}`,
      parent: null,
    },
  })

  strapi.log.info(`[Media] Created folder "${folderName}" with ID ${newFolder.id}`)

  return newFolder.id
}

interface PlayerUpdateData {
  name?: string
  position?: string
  company?: string | null
  tagline?: string | null
  bio?: string | null
  website?: string | null
  location?: Record<string, unknown> | string | null
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
      "location",
      "socialNetworks",
    ]

    const sanitizedData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updateData) {
        sanitizedData[field] = updateData[field as keyof PlayerUpdateData]
      }
    }

    // Sanitize HTML content in bio field to prevent XSS
    if (sanitizedData.bio !== undefined) {
      sanitizedData.bio = sanitizeHtml(sanitizedData.bio as string | null | undefined)
    }

    // Sanitize plain text fields (strip any HTML)
    if (sanitizedData.tagline !== undefined) {
      sanitizedData.tagline = sanitizePlainText(sanitizedData.tagline as string | null | undefined)
    }
    if (sanitizedData.company !== undefined) {
      sanitizedData.company = sanitizePlainText(sanitizedData.company as string | null | undefined)
    }

    // Validate website URL
    if (sanitizedData.website !== undefined && sanitizedData.website !== null) {
      const websiteStr = String(sanitizedData.website).trim()
      if (websiteStr !== "" && !isValidUrl(websiteStr)) {
        return ctx.badRequest("Invalid website URL format")
      }
      sanitizedData.website = websiteStr || null
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
    sanitizedData.slug = undefined
    sanitizedData.documentId = undefined

    strapi.log.info(`[Player] User ${user.id} updating player ${playerDocumentId}`)
    strapi.log.debug(`[Player] Update data: ${JSON.stringify(sanitizedData)}`)

    try {
      // Update the player using document service
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerDocumentId,
        data: sanitizedData,
        populate: {
          avatar: true,
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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

      // Get or create the "players" folder for avatar uploads
      const playersFolderId = await getOrCreateMediaFolder(strapi, "players")

      // Upload the file(s) and link to the player's avatar field
      await uploadService.upload({
        data: {
          refId: playerId,
          ref: "api::player.player",
          field: "avatar",
          fileInfo: {
            folder: playersFolderId,
          },
        },
        files: fileArray,
      })

      strapi.log.info(`[Player] Successfully uploaded avatar for player ${playerDocumentId}`)

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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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

      strapi.log.info(`[Player] Deleted avatar for player ${playerDocumentId}`)

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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
      return ctx.badRequest(
        "A player with this name already exists. Please claim that profile instead."
      )
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
      return ctx.forbidden(
        "Player name does not match your account name. Please use the claim process instead."
      )
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

      strapi.log.info(`[Player] Auto-linked player ${playerId} to user ${user.id} (${user.email})`)

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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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

    const _targetCurrentRank = positionRank[targetCurrentPosition] || 0
    const _targetNewRank = positionRank[newPosition] || 0

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
        return ctx.forbidden("Mentors can only upgrade Players to Host, or Hosts to Mentor")
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

      // Sync the user's role to match the new position
      try {
        const roleUpdated = await syncUserRoleFromPlayer(strapi, playerId)
        if (roleUpdated) {
          strapi.log.info(
            `[Player] Role synced for ${targetPlayer.name} after position change to ${newPosition}`
          )
        }
      } catch (syncError) {
        strapi.log.error(`[Player] Failed to sync role after position update: ${syncError}`)
        // Don't fail the position update if role sync fails
      }

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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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

    const { letter, search, position, page = 1, pageSize = 50 } = ctx.query

    try {
      // Helper function to remove accents from a string
      const removeAccents = (str: string): string => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      }

      const normalizeInviteStatus = (status?: string | null): "pending" | "accepted" | null => {
        if (!status || status === "none") return null
        if (status === "accepted") return "accepted"
        if (["pending", "sent", "reminded", "processing", "reminding"].includes(status)) {
          return "pending"
        }
        return null
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

      // Apply position filter
      if (position && typeof position === "string") {
        filteredPlayers = filteredPlayers.filter((player) => player.position === position)
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

      const playerDocumentIds = Array.from(
        new Set(paginatedPlayers.map((player) => player.documentId).filter(Boolean))
      )
      const inviteStatusByPlayerDocumentId = new Map<string, "pending" | "accepted">()

      if (playerDocumentIds.length > 0) {
        const users = await strapi.documents("plugin::users-permissions.user").findMany({
          filters: {
            player: {
              documentId: {
                $in: playerDocumentIds,
              },
            },
          },
          populate: {
            player: {
              fields: ["documentId"],
            },
          },
        })

        for (const user of users as Array<{
          invitationStatus?: string | null
          player?: { documentId?: string | null }
        }>) {
          const playerDocumentId = user.player?.documentId
          if (!playerDocumentId) continue
          const normalizedStatus = normalizeInviteStatus(user.invitationStatus)
          inviteStatusByPlayerDocumentId.set(playerDocumentId, normalizedStatus ?? "accepted")
        }
      }

      // Format response to match expected structure
      const formattedPlayers = paginatedPlayers.map((player) => ({
        documentId: player.documentId,
        name: player.name,
        position: player.position,
        company: player.company,
        avatar: player.avatar ? { url: player.avatar.url } : null,
        inviteStatus: inviteStatusByPlayerDocumentId.get(player.documentId) ?? null,
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
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
      "location",
      "socialNetworks",
    ]

    const sanitizedData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updateData) {
        sanitizedData[field] = updateData[field as keyof PlayerUpdateData]
      }
    }

    // Sanitize HTML content in bio field to prevent XSS
    if (sanitizedData.bio !== undefined) {
      sanitizedData.bio = sanitizeHtml(sanitizedData.bio as string | null | undefined)
    }

    // Sanitize plain text fields (strip any HTML)
    if (sanitizedData.tagline !== undefined) {
      sanitizedData.tagline = sanitizePlainText(sanitizedData.tagline as string | null | undefined)
    }
    if (sanitizedData.company !== undefined) {
      sanitizedData.company = sanitizePlainText(sanitizedData.company as string | null | undefined)
    }

    // Validate website URL
    if (sanitizedData.website !== undefined && sanitizedData.website !== null) {
      const websiteStr = String(sanitizedData.website).trim()
      if (websiteStr !== "" && !isValidUrl(websiteStr)) {
        return ctx.badRequest("Invalid website URL format")
      }
      sanitizedData.website = websiteStr || null
    }

    // Don't allow changing slug or documentId
    sanitizedData.slug = undefined
    sanitizedData.documentId = undefined

    strapi.log.info(`[Player] Organizer ${userWithPlayer.player.name} updating player ${playerId}`)

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

  /**
   * Set a player's avatar from an existing media library file (for organizers)
   */
  async setAvatarFromLibrary(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can set avatars from library
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can set player avatars from the media library")
    }

    const { id: playerId } = ctx.params
    const { fileId } = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    if (!fileId || typeof fileId !== "number") {
      return ctx.badRequest("fileId is required and must be a number")
    }

    // Find the target player
    const targetPlayer = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
    })

    if (!targetPlayer) {
      return ctx.notFound("Player not found")
    }

    // Verify file exists
    const file = await strapi.plugins.upload.services.upload.findOne(fileId)
    if (!file) {
      return ctx.badRequest("File not found in media library")
    }

    try {
      // Update the player's avatar field with the selected file
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerId,
        data: {
          avatar: fileId,
        } as any,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(
        `[Player] Organizer ${userWithPlayer.player.name} set avatar for player ${playerId} from library (file ${fileId})`
      )

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to set avatar from library: ${error}`)
      return ctx.internalServerError("Failed to set avatar from library")
    }
  },

  /**
   * Remove a player's avatar (for organizers)
   */
  async removeAvatar(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can remove avatars
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can remove player avatars")
    }

    const { id: playerId } = ctx.params

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    // Find the target player
    const targetPlayer = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
      populate: { avatar: true },
    })

    if (!targetPlayer) {
      return ctx.notFound("Player not found")
    }

    try {
      // Clear avatar (set to null)
      const updatedPlayer = await strapi.documents("api::player.player").update({
        documentId: playerId,
        data: {
          avatar: null,
        } as any,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(
        `[Player] Organizer ${userWithPlayer.player.name} removed avatar from player ${playerId}`
      )

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to remove avatar: ${error}`)
      return ctx.internalServerError("Failed to remove avatar")
    }
  },

  /**
   * Upload a picture for another player's profile (for organizers)
   */
  async uploadAvatarForPlayer(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to upload an avatar")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can upload avatars for other players
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can upload avatars for other players")
    }

    const { id: playerId } = ctx.params

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

      // Get or create the "players" folder for avatar uploads
      const playersFolderId = await getOrCreateMediaFolder(strapi, "players")

      // Upload the file(s) and link to the player's avatar field
      await uploadService.upload({
        data: {
          refId: targetPlayer.id,
          ref: "api::player.player",
          field: "avatar",
          fileInfo: {
            folder: playersFolderId,
          },
        },
        files: fileArray,
      })

      strapi.log.info(
        `[Player] Organizer ${userWithPlayer.player.name} uploaded avatar for player ${playerId}`
      )

      // Return the updated player with avatar
      const updatedPlayer = await strapi.documents("api::player.player").findOne({
        documentId: playerId,
        populate: {
          avatar: true,
          socialNetworks: true,
        },
      })

      return ctx.send({
        data: updatedPlayer,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to upload avatar for player: ${error}`)
      return ctx.internalServerError("Failed to upload avatar")
    }
  },

  /**
   * Get events the current user has attended (via tickets or approved claims)
   * Returns events from:
   * 1. Player's `attended` relation (from approved claims or direct additions)
   * 2. Paid ticket orders
   */
  async getMyAttendedEvents(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get user with player relation
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (!userWithPlayer?.player) {
      return ctx.notFound("No player profile linked to this user")
    }

    const player = userWithPlayer.player

    try {
      // Get events from player's attended relation
      const playerWithAttended = await strapi.documents("api::player.player").findOne({
        documentId: player.documentId,
        populate: {
          attended: {
            populate: {
              defaultImage: { fields: ["url", "width", "height", "formats"] },
              location: { fields: ["name", "country", "slug"] },
            },
          },
        },
      })

      // Get events from paid ticket orders
      const paidOrders = await strapi.documents("api::ticket-order.ticket-order").findMany({
        filters: {
          player: { documentId: player.documentId },
          status: "paid",
        },
        populate: {
          event: {
            populate: {
              defaultImage: { fields: ["url", "width", "height", "formats"] },
              location: { fields: ["name", "country", "slug"] },
            },
          },
        },
      })

      // Build a map to deduplicate events
      const attendedMap = new Map<
        string,
        {
          documentId: string
          slug: string
          name: string
          start: string
          end: string
          eventStatus: string
          defaultImage: any
          location: any
          attendanceSource: "ticket" | "claim" | "direct"
        }
      >()

      // Add events from attended relation (claim or direct)
      for (const event of playerWithAttended?.attended || []) {
        attendedMap.set(event.documentId, {
          documentId: event.documentId,
          slug: event.slug,
          name: event.name,
          start: event.start,
          end: event.end,
          eventStatus: event.eventStatus,
          defaultImage: event.defaultImage,
          location: event.location,
          attendanceSource: "claim",
        })
      }

      // Add events from tickets (ticket takes precedence for source)
      for (const order of paidOrders) {
        if (order.event) {
          const event = order.event
          attendedMap.set(event.documentId, {
            documentId: event.documentId,
            slug: event.slug,
            name: event.name,
            start: event.start,
            end: event.end,
            eventStatus: event.eventStatus,
            defaultImage: event.defaultImage,
            location: event.location,
            attendanceSource: "ticket",
          })
        }
      }

      // Convert to array and sort by start date (most recent first)
      const attendedEvents = Array.from(attendedMap.values()).sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      )

      strapi.log.info(
        `[Player] Retrieved ${attendedEvents.length} attended events for player ${player.documentId}`
      )

      return ctx.send({
        data: attendedEvents,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to get attended events: ${error}`)
      return ctx.internalServerError("Failed to get attended events")
    }
  },

  /**
   * Send invitation email to a player (organizers only)
   * POST /players/:id/send-invite
   * Body: { email: string, customMessage?: string }
   */
  async sendSingleInvite(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Get the current user's player to check their position
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (!userWithPlayer?.player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const currentUserPosition = userWithPlayer.player.position

    // Only organizers can send invites
    if (currentUserPosition === "Player") {
      return ctx.forbidden("Only organizers can send invitations")
    }

    const { id: playerId } = ctx.params
    const { email, customMessage, subscribeNewsletter } = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    if (!email) {
      return ctx.badRequest("Email is required")
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return ctx.badRequest("Please enter a valid email address")
    }

    // Find the target player with user relation
    const targetPlayer = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
      populate: { user: true },
    })

    if (!targetPlayer) {
      return ctx.notFound("Player not found")
    }

    try {
      let targetUser: any = targetPlayer.user
      let userStatus: "new" | "invited" | "accepted" = "new"

      // Check if player has a linked user
      if (targetUser) {
        // Get full user details
        const fullUser = await strapi.documents("plugin::users-permissions.user").findFirst({
          filters: { id: targetUser.id },
        })

        if (!fullUser) {
          return ctx.internalServerError("Failed to retrieve user data")
        }

        // Check if user is blocked
        if (fullUser.blocked) {
          return ctx.badRequest("This user is blocked and cannot receive invitations")
        }

        // Determine user status
        if (fullUser.invitationStatus === "accepted") {
          userStatus = "accepted"
        } else if (
          fullUser.invitationStatus === "sent" ||
          fullUser.invitationStatus === "reminded"
        ) {
          userStatus = "invited"
        }

        // Update email if different
        if (fullUser.email !== email.toLowerCase()) {
          await strapi.documents("plugin::users-permissions.user").update({
            documentId: fullUser.documentId,
            data: { email: email.toLowerCase() } as any,
          })
        }

        targetUser = fullUser
      } else {
        // Create a new user and link to player
        // Generate username from player name (firstname.lastname format)
        const username = nameToUsername(targetPlayer.name)

        // Map player position to role type
        const positionToRoleType: Record<string, string> = {
          Founder: "founder",
          Mentor: "mentor",
          Host: "host",
          Player: "player",
        }
        const roleType = positionToRoleType[targetPlayer.position] || "player"

        // Get the role matching the player's position
        const userRole = await strapi.db.query("plugin::users-permissions.role").findOne({
          where: { type: roleType },
        })

        if (!userRole) {
          strapi.log.error(
            `[Player] Role '${roleType}' not found for position '${targetPlayer.position}'`
          )
          return ctx.internalServerError("Failed to create user")
        }

        // Create user
        const newUser = await strapi.documents("plugin::users-permissions.user").create({
          data: {
            username,
            email: email.toLowerCase(),
            password: randomBytes(32).toString("hex"), // Random password, will be reset
            confirmed: true, // Pre-confirm since we're sending invite
            blocked: false,
            role: userRole.id,
            player: targetPlayer.id,
            invitationStatus: "pending",
          } as any,
        })

        targetUser = newUser
        strapi.log.info(
          `[Player] Created new user ${newUser.documentId} with role '${roleType}' for player ${targetPlayer.name}`
        )
      }

      // Generate reset token and send invite
      const resetToken = randomBytes(64).toString("hex")

      // Update user with reset token
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: targetUser.documentId,
        data: { resetPasswordToken: resetToken } as any,
      })

      // Build invite URL
      const frontendUrl = (process.env.FRONTEND_URL || "https://play14.org").replace(/\/$/, "")
      const callbackUrl = encodeURIComponent(process.env.INVITATION_CALLBACK_URL || "/admin")
      const code = encodeURIComponent(resetToken)
      const inviteUrl = `${frontendUrl}/auth/reset-password?code=${code}&callbackUrl=${callbackUrl}`

      // Build and send email
      const html = await render(
        UserInvitationEmail({
          name: targetPlayer.name,
          inviteUrl,
          reminder: false,
          customMessage: customMessage?.trim() || undefined,
        })
      )
      const text = await render(
        UserInvitationEmail({
          name: targetPlayer.name,
          inviteUrl,
          reminder: false,
          customMessage: customMessage?.trim() || undefined,
        }),
        { plainText: true }
      )

      await strapi.plugin("email").service("email").send({
        to: email.toLowerCase(),
        subject: "You're invited to #play14",
        html,
        text,
      })

      // Update invitation status to sent
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: targetUser.documentId,
        data: {
          invitationStatus: "sent",
          invitationSentAt: new Date().toISOString(),
        } as any,
      })

      strapi.log.info(
        `[Player] Organizer ${userWithPlayer.player.name} sent invite to ${email} for player ${targetPlayer.name}`
      )

      // Subscribe to newsletter if opted in - fire and forget
      if (subscribeNewsletter) {
        addSubscriberToGroup(email.toLowerCase(), targetPlayer.name, "invite").catch((err) => {
          strapi.log.warn(`[Player] Failed to subscribe ${email} to newsletter: ${err}`)
        })
      }

      return ctx.send({
        success: true,
        userStatus,
        message: `Invitation sent to ${email}`,
      })
    } catch (error) {
      strapi.log.error(`[Player] Failed to send invite: ${error}`)
      return ctx.internalServerError("Failed to send invitation. Please try again.")
    }
  },
})
