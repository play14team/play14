/**
 * Player Service for Ticketing
 *
 * Handles player lookup and creation for ticket attendees.
 * This is shared between the webhook handler and direct checkout flow
 * to ensure consistent behavior.
 */

import crypto from "crypto"
import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import { validateEmail, validateName } from "../../libs/validation"
import { PLAYER_CREATION } from "./config"

export interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize?: string
  foodPreferences?: string
  photoConsent?: boolean
  photoConsentTimestamp?: string
}

export interface FindOrCreatePlayerResult {
  player: any
  isNew: boolean
}

/**
 * Find or create a player profile for an attendee.
 *
 * This function handles the complex logic of:
 * 1. Validating attendee input
 * 2. Matching to purchaser's player if emails match
 * 3. Finding existing player by email (via user link)
 * 4. Finding existing unlinked player by name
 * 5. Creating a new player profile if none found
 *
 * SECURITY: Only matches unlinked players by name to prevent
 * assigning tickets to the wrong user's profile.
 *
 * @param strapi - Strapi instance
 * @param attendee - Attendee information
 * @param purchaserPlayer - The purchaser's player profile (optional)
 * @param logPrefix - Prefix for log messages (e.g., "[Webhook]" or "[Ticketing]")
 * @returns Object with player and isNew flag
 */
export async function findOrCreatePlayerForAttendee(
  strapi: Core.Strapi,
  attendee: AttendeeInfo,
  purchaserPlayer: any,
  logPrefix: string = "[Ticketing]"
): Promise<FindOrCreatePlayerResult> {
  // Validate first name using the validation library
  const firstNameResult = validateName(attendee.firstName, {
    minLength: 1,
    maxLength: 50,
    field: "First name",
  })
  if (!firstNameResult.valid) {
    throw new Error(firstNameResult.error || "Invalid first name")
  }

  // Validate last name using the validation library
  const lastNameResult = validateName(attendee.lastName, {
    minLength: 1,
    maxLength: 50,
    field: "Last name",
  })
  if (!lastNameResult.valid) {
    throw new Error(lastNameResult.error || "Invalid last name")
  }

  // Validate email using the validation library (handles RFC 5322, IDN, plus addressing, etc.)
  const emailResult = validateEmail(attendee.email)
  if (!emailResult.valid) {
    throw new Error(emailResult.error || `Invalid attendee email: ${attendee.email}`)
  }

  const firstName = firstNameResult.name!
  const lastName = lastNameResult.name!
  const attendeeName = `${firstName} ${lastName}`
  const attendeeEmail = emailResult.email!

  // 1. If attendee email matches purchaser's player, use their player
  if (purchaserPlayer) {
    // Find the user linked to purchaser player to get their email
    const purchaserPlayerDoc = await strapi.documents("api::player.player").findOne({
      documentId: purchaserPlayer.documentId,
      populate: { user: { fields: ["email"] } },
    })

    if (purchaserPlayerDoc?.user?.email?.toLowerCase() === attendeeEmail) {
      strapi.log.info(`${logPrefix} Attendee ${attendeeName} matched to purchaser player`)
      return { player: purchaserPlayer, isNew: false }
    }
  }

  // 2. Look for a user with this email and get their player
  const existingUser = await strapi.documents("plugin::users-permissions.user").findFirst({
    filters: { email: { $eqi: attendeeEmail } },
    populate: { player: true },
  })

  if (existingUser?.player) {
    strapi.log.info(`${logPrefix} Found existing player via user email: ${attendeeName}`)

    // Update player's default preferences if they don't have them set
    if (attendee.tshirtSize || attendee.foodPreferences) {
      const playerDoc = await strapi.documents("api::player.player").findOne({
        documentId: existingUser.player.documentId,
      })

      if (playerDoc) {
        const updateData: any = {}
        if (
          attendee.tshirtSize &&
          (!playerDoc.defaultTshirtSize || playerDoc.defaultTshirtSize === "none")
        ) {
          updateData.defaultTshirtSize = attendee.tshirtSize
        }
        if (attendee.foodPreferences && !playerDoc.defaultFoodPreferences) {
          updateData.defaultFoodPreferences = attendee.foodPreferences
        }
        if (Object.keys(updateData).length > 0) {
          await strapi.documents("api::player.player").update({
            documentId: existingUser.player.documentId,
            data: updateData,
          })
        }
      }
    }

    return { player: existingUser.player, isNew: false }
  }

  // 3. Look for an existing player by exact name match (only if NOT linked to a user)
  // SECURITY: Only match unlinked players to prevent assigning tickets to wrong user's profile
  const existingPlayerByName = await strapi.documents("api::player.player").findFirst({
    filters: {
      name: { $eqi: attendeeName },
    },
    populate: { user: true },
  })

  if (existingPlayerByName && !existingPlayerByName.user) {
    // Player exists and is not linked to any user - safe to use
    strapi.log.info(`${logPrefix} Found existing unlinked player by name: ${attendeeName}`)

    // Update player's default preferences if they don't have them set
    const updateData: any = {}
    if (
      attendee.tshirtSize &&
      (!existingPlayerByName.defaultTshirtSize || existingPlayerByName.defaultTshirtSize === "none")
    ) {
      updateData.defaultTshirtSize = attendee.tshirtSize
    }
    if (attendee.foodPreferences && !existingPlayerByName.defaultFoodPreferences) {
      updateData.defaultFoodPreferences = attendee.foodPreferences
    }
    if (Object.keys(updateData).length > 0) {
      await strapi.documents("api::player.player").update({
        documentId: existingPlayerByName.documentId,
        data: updateData,
      })
    }

    return { player: existingPlayerByName, isNew: false }
  }

  // 4. Create a new player profile (unlinked to any user)
  // If a player with same name exists but IS linked, we create a new one with unique slug/name
  const baseSlug = slugify(attendeeName, { lower: true, strict: true })

  // Ensure unique slug with retry loop (more robust than single random suffix)
  let slug = baseSlug
  let slugAttempts = 0

  while (slugAttempts < PLAYER_CREATION.MAX_SLUG_ATTEMPTS) {
    const existingSlug = await strapi.documents("api::player.player").findFirst({
      filters: { slug },
    })

    if (!existingSlug) {
      break // Slug is unique
    }

    // Generate a more unique suffix using timestamp + random
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(2).toString("hex")
    slug = `${baseSlug}-${timestamp.slice(-4)}${random}`
    slugAttempts++
  }

  if (slugAttempts >= PLAYER_CREATION.MAX_SLUG_ATTEMPTS) {
    throw new Error(`Failed to generate unique slug for player: ${attendeeName}`)
  }

  // For name uniqueness, append a suffix if needed
  let playerName = attendeeName
  if (existingPlayerByName) {
    // Player with same name exists but is linked to a user - create with unique name
    const timestamp = Date.now().toString(36).slice(-4)
    playerName = `${attendeeName} (${timestamp})`
    strapi.log.info(`${logPrefix} Creating player with unique name: ${playerName} (original name taken)`)
  }

  const newPlayer = await strapi.documents("api::player.player").create({
    data: {
      name: playerName,
      slug,
      position: PLAYER_CREATION.DEFAULT_POSITION,
      defaultTshirtSize: attendee.tshirtSize || "none",
      defaultFoodPreferences: attendee.foodPreferences || null,
    } as any,
  })

  strapi.log.info(
    `${logPrefix} Created new player profile for attendee: ${playerName} (${newPlayer.documentId})`
  )

  return { player: newPlayer, isNew: true }
}

/**
 * Add a player to an event's attendees list.
 *
 * IMPORTANT: This function adds the player to BOTH draft and published versions
 * of the event. This is necessary because:
 * 1. Strapi 5 draft-and-publish creates separate records for draft and published
 * 2. If we only add to published, the relation would be lost when draft is published
 * 3. Adding to both ensures the player appears immediately AND survives future publishes
 *
 * @param strapi - Strapi instance
 * @param playerDocumentId - Document ID of the player
 * @param event - Event object with documentId and id
 * @param logPrefix - Prefix for log messages
 */
export async function addPlayerToEventAttendees(
  strapi: Core.Strapi,
  playerDocumentId: string,
  event: { documentId: string; id: number },
  logPrefix: string = "[Ticketing]"
): Promise<void> {
  // Fetch BOTH draft and published versions of the event
  // We need to add the player to both to ensure:
  // 1. Player appears immediately on the public site (published)
  // 2. Player relation survives when draft is published later (draft)
  const [draftEvent, publishedEvent] = await Promise.all([
    strapi.documents("api::event.event").findOne({
      documentId: event.documentId,
      status: "draft",
      fields: ["id"],
    }),
    strapi.documents("api::event.event").findOne({
      documentId: event.documentId,
      status: "published",
      fields: ["id"],
    }),
  ])

  if (!publishedEvent && !draftEvent) {
    strapi.log.warn(
      `${logPrefix} Cannot add player to event attendees - event ${event.documentId} not found`
    )
    return
  }

  const playerDoc = await strapi.documents("api::player.player").findOne({
    documentId: playerDocumentId,
    populate: { attended: { fields: ["id", "documentId"] } },
  })

  if (!playerDoc) return

  const currentAttendedIds = playerDoc.attended?.map((e: any) => e.id) || []
  const alreadyAttending = playerDoc.attended?.some(
    (e: any) => e.documentId === event.documentId
  )

  if (!alreadyAttending) {
    // Build array with all existing event versions (draft and/or published)
    // This ensures the player relation survives when draft is published
    const newAttendedIds = [...currentAttendedIds]

    if (publishedEvent) {
      newAttendedIds.push(publishedEvent.id)
    }
    if (draftEvent && draftEvent.id !== publishedEvent?.id) {
      newAttendedIds.push(draftEvent.id)
    }

    await strapi.documents("api::player.player").update({
      documentId: playerDocumentId,
      data: {
        attended: newAttendedIds,
      } as any,
    })

    const versionInfo = publishedEvent
      ? draftEvent && draftEvent.id !== publishedEvent.id
        ? "draft + published"
        : "published"
      : "draft"
    strapi.log.info(
      `${logPrefix} Added player ${playerDocumentId} to event ${event.documentId} attendees (${versionInfo})`
    )
  }
}
