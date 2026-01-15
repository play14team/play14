/**
 * Cron tasks for player management
 */

import type { Core } from "@strapi/strapi"

interface PlayerWithRelations {
  documentId: string
  name: string
  position: string
  hosted?: Array<{ eventStatus: string }>
  mentored?: Array<{ eventStatus: string }>
}

/**
 * Update player positions based on their hosting/mentoring history
 */
export async function updatePlayerPositions(strapi: Core.Strapi): Promise<void> {
  console.log("Running player position job")
  const apiName = "api::player.player"
  const players = (await strapi.documents(apiName).findMany({
    fields: ["id", "name", "position"],
    populate: ["hosted", "mentored"],
    filters: {
      position: { $nei: "Founder" },
    },
  })) as unknown as PlayerWithRelations[]

  console.log("Players found:", players.length)

  await Promise.all(
    players.map(async (player) => {
      if (isPlayer(player) && hasHosted(player)) {
        console.log(`Changing position of ${player.name} from "Player" to "Host"`)
        await setPosition(strapi, apiName, player, "Host")
      }
      if (isHost(player) && hasNeverHosted(player)) {
        console.log(`Changing position of ${player.name} from "Host" to "Player"`)
        await setPosition(strapi, apiName, player, "Player")
      }
      if (isHost(player) && hasMentored(player)) {
        console.log(`Changing position of ${player.name} from "Host" to "Mentor"`)
        await setPosition(strapi, apiName, player, "Mentor")
      }
    })
  )
}

function isHost(player: PlayerWithRelations): boolean {
  return player.position === "Host"
}

function isPlayer(player: PlayerWithRelations): boolean {
  return player.position === "Player"
}

function hasHosted(player: PlayerWithRelations): boolean {
  return player.hosted != null && notCancelled(player.hosted).length > 0
}

function hasNeverHosted(player: PlayerWithRelations): boolean {
  return player.hosted == null || notCancelled(player.hosted).length === 0
}

function hasMentored(player: PlayerWithRelations): boolean {
  return player.mentored != null && notCancelled(player.mentored).length > 0
}

function notCancelled(events: Array<{ eventStatus: string }>): Array<{ eventStatus: string }> {
  return events.filter((e) => e.eventStatus !== "Cancelled")
}

async function setPosition(
  strapi: Core.Strapi,
  apiName: string,
  player: PlayerWithRelations,
  position: string
): Promise<void> {
  await strapi.documents(apiName as any).update({
    documentId: player.documentId,
    data: { position } as any,
  })
}
