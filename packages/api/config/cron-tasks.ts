/**
 * Cron tasks migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 *
 * Note: Operations are executed in parallel using Promise.all() for better
 * performance with large datasets. This is safe because each update operation
 * is independent and doesn't depend on the order of execution.
 */

interface Player {
  documentId: string;
  name: string;
  position: string;
  hosted?: Array<{ eventStatus: string }>;
  mentored?: Array<{ eventStatus: string }>;
}

interface Event {
  documentId: string;
  name: string;
  end: string;
}

function isHost(player: Player): boolean {
  return player.position === "Host";
}

function isPlayer(player: Player): boolean {
  return player.position === "Player";
}

function hasHosted(player: Player): boolean {
  return !!player.hosted && notCancelled(player.hosted).length > 0;
}

function hasHosted4(player: Player): boolean {
  return (
    !!player.hosted &&
    player.hosted.filter((e) => e.eventStatus == "Over").length > 3
  );
}

function hasNeverHosted(player: Player): boolean {
  return !player.hosted || notCancelled(player.hosted).length == 0;
}

function hasMentored(player: Player): boolean {
  return !!player.mentored && notCancelled(player.mentored).length > 0;
}

function notCancelled(events: Array<{ eventStatus: string }>): Array<{ eventStatus: string }> {
  return events.filter((e) => e.eventStatus != "Cancelled");
}

async function setPosition(apiName: string, player: Player, position: string): Promise<void> {
  await strapi.documents(apiName).update({
    documentId: player.documentId,
    data: { position: position },
  });
}

export default {
  eventStatus: {
    task: async ({ strapi }) => {
      const now = new Date();

      console.log("Running event status job");
      const apiName = "api::event.event";
      const events: Event[] = await strapi.documents(apiName).findMany({
        fields: ["id", "name", "end"],
        filters: {
          $and: [
            {
              $or: [
                {
                  eventStatus: "Open",
                },
                {
                  eventStatus: "Announced",
                },
              ],
            },
            {
              end: { $lt: now.toISOString() },
            },
          ],
        },
      });

      console.log(
        "'Open' or 'Announced' events in the past found:",
        events.length,
      );

      await Promise.all(
        events.map(async (event) => {
          console.log("Changing eventStatus of event to 'Over'", event);
          await strapi.documents(apiName).update({
            documentId: event.documentId,
            data: { eventStatus: "Over" },
          });
        }),
      );
    },
    options: {
      // everyday at 00:00
      rule: "0 0 0 * * *",
    },
  },
  playerPosition: {
    task: async ({ strapi }) => {
      const now = new Date();

      console.log("Running player position job");
      const apiName = "api::player.player";
      const players: Player[] = await strapi.documents(apiName).findMany({
        fields: ["id", "name", "position"],
        populate: ["hosted", "mentored"],
        filters: {
          position: { $nei: "Founder" },
        },
      });

      console.log("Players found:", players.length);

      await Promise.all(
        players.map(async (player) => {
          if (isPlayer(player) && hasHosted(player)) {
            console.log(
              `Changing postion of ${player.name} from "Player" to "Host"`,
            );
            await setPosition(apiName, player, "Host");
          }
          if (isHost(player) && hasNeverHosted(player)) {
            console.log(
              `Changing postion of ${player.name} from "Host" to "Player"`,
            );
            await setPosition(apiName, player, "Player");
          }
          if (isHost(player) && hasMentored(player)) {
            console.log(
              `Changing postion of ${player.name} from "Host" to "Mentor"`,
            );
            await setPosition(apiName, player, "Mentor");
          }
        }),
      );
    },
    options: {
      // everyday at 00:05
      rule: "0 5 0 * * *",
    },
  },
};
