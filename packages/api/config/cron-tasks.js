const { collectBusinessMetrics } = require("../src/services/observability/metrics-collector");

/**
 * Cron tasks migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 *
 * Note: Operations are executed in parallel using Promise.all() for better
 * performance with large datasets. This is safe because each update operation
 * is independent and doesn't depend on the order of execution.
 */
module.exports = {
  /**
   * Collect business metrics for Prometheus
   * Updates gauges with current counts from the database
   * Runs every 5 minutes to keep metrics fresh without expensive queries on each scrape
   */
  collectMetrics: {
    task: async ({ strapi }) => {
      if (process.env.METRICS_ENABLED === "false") {
        return;
      }
      await collectBusinessMetrics(strapi);
    },
    options: {
      // Every 5 minutes
      rule: "0 */5 * * * *",
    },
  },
  /**
   * Clean up expired pending ticket orders and release reservations
   * Stripe checkout sessions expire after 30 minutes by default
   * This job runs every 5 minutes to clean up abandoned orders and release ticket reservations
   */
  cleanExpiredTicketOrders: {
    task: async ({ strapi }) => {
      console.log("Running expired ticket orders cleanup job");
      const apiName = "api::ticket-order.ticket-order";
      const ticketTypeApi = "api::ticket-type.ticket-type";

      const now = new Date();
      // Fallback: Orders older than 30 minutes that are still pending
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find orders that are expired either by:
      // 1. reservationExpiresAt has passed (explicit Stripe session expiry)
      // 2. createdAt is older than 30 minutes (fallback for orders without explicit expiry)
      const expiredOrders = await strapi.documents(apiName).findMany({
        filters: {
          status: "pending",
          $or: [
            { reservationExpiresAt: { $lt: now.toISOString() } },
            {
              reservationExpiresAt: { $null: true },
              createdAt: { $lt: thirtyMinutesAgo.toISOString() },
            },
          ],
        },
      });

      console.log("Expired pending orders found:", expiredOrders.length);

      // Process each order sequentially to properly release reservations
      for (const order of expiredOrders) {
        console.log(`Processing expired order ${order.orderNumber}`);

        // Release reservations if order has them
        if (order.hasReservation) {
          const ticketDetails = order.ticketDetails || [];

          for (const detail of ticketDetails) {
            const ticketType = await strapi.documents(ticketTypeApi).findOne({
              documentId: detail.ticketTypeId,
            });

            if (ticketType) {
              const newReservedCount = Math.max(
                0,
                (ticketType.reservedCount || 0) - detail.quantity
              );

              await strapi.documents(ticketTypeApi).update({
                documentId: detail.ticketTypeId,
                data: { reservedCount: newReservedCount },
              });

              console.log(
                `Released ${detail.quantity} reservations for ticket type ${detail.ticketTypeId} (new reserved: ${newReservedCount})`
              );
            }
          }
        }

        // Mark order as expired and clear reservation flags
        await strapi.documents(apiName).update({
          documentId: order.documentId,
          data: {
            status: "expired",
            hasReservation: false,
            reservationCreatedAt: null,
            reservationExpiresAt: null,
          },
        });

        console.log(`Order ${order.orderNumber} marked as expired`);
      }
    },
    options: {
      // Every 5 minutes for faster reservation cleanup
      rule: "0 */5 * * * *",
    },
  },

  /**
   * Health check for reservation count drift
   * Detects if reservedCount on ticket types doesn't match actual pending reservations
   * This can happen if orders are manually modified or if there are bugs
   * Runs daily and logs warnings (does not auto-fix to avoid data loss)
   */
  /**
   * Clean up abandoned draft orders
   * Draft orders are created when users start filling attendee info but don't complete checkout
   * This job runs hourly to clean up drafts older than 24 hours and release any discount code reservations
   */
  cleanAbandonedDraftOrders: {
    task: async ({ strapi }) => {
      console.log("Running abandoned draft orders cleanup job");
      const apiName = "api::ticket-order.ticket-order";
      const discountCodeApi = "api::discount-code.discount-code";

      // Find draft orders older than 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const abandonedDrafts = await strapi.documents(apiName).findMany({
        filters: {
          status: "draft",
          createdAt: { $lt: twentyFourHoursAgo.toISOString() },
        },
        populate: {
          discountCode: { fields: ["documentId", "code", "reservedCount"] },
        },
      });

      console.log("Abandoned draft orders found:", abandonedDrafts.length);

      for (const order of abandonedDrafts) {
        console.log(`Processing abandoned draft order ${order.orderNumber}`);

        // Note: Draft orders don't have discount code reservations
        // (reservations are only made during finalizeCheckout when status changes to pending)
        // But we check just in case there's an edge case

        // Mark order as cancelled
        await strapi.documents(apiName).update({
          documentId: order.documentId,
          data: {
            status: "cancelled",
          },
        });

        console.log(`Draft order ${order.orderNumber} cancelled (abandoned)`);
      }
    },
    options: {
      // Every hour at minute 30
      rule: "0 30 * * * *",
    },
  },

  reservationHealthCheck: {
    task: async ({ strapi }) => {
      console.log("Running reservation health check");
      const orderApiName = "api::ticket-order.ticket-order";
      const ticketTypeApiName = "api::ticket-type.ticket-type";

      // Find all ticket types with non-zero reservedCount
      const ticketTypesWithReservations = await strapi
        .documents(ticketTypeApiName)
        .findMany({
          filters: {
            reservedCount: { $gt: 0 },
          },
        });

      if (ticketTypesWithReservations.length === 0) {
        console.log("No ticket types with reservations to check");
        return;
      }

      // For each ticket type, calculate expected reservations from pending orders
      for (const ticketType of ticketTypesWithReservations) {
        // Find all pending orders with reservations for this ticket type
        const ordersWithReservation = await strapi
          .documents(orderApiName)
          .findMany({
            filters: {
              status: "pending",
              hasReservation: true,
            },
          });

        // Sum up reserved quantities for this ticket type
        let expectedReserved = 0;
        for (const order of ordersWithReservation) {
          const ticketDetails = order.ticketDetails || [];
          for (const detail of ticketDetails) {
            if (detail.ticketTypeId === ticketType.documentId) {
              expectedReserved += detail.quantity;
            }
          }
        }

        const actualReserved = ticketType.reservedCount || 0;
        const drift = actualReserved - expectedReserved;

        if (drift !== 0) {
          console.warn(
            `[Reservation Drift] Ticket type ${ticketType.documentId} (${ticketType.name}): ` +
              `actual=${actualReserved}, expected=${expectedReserved}, drift=${drift}`
          );
        }
      }

      console.log("Reservation health check completed");
    },
    options: {
      // Daily at 01:00
      rule: "0 0 1 * * *",
    },
  },
  eventStatus: {
    task: async ({ strapi }) => {
      const now = new Date();

      console.log("Running event status job");
      const apiName = "api::event.event";
      const events = await strapi.documents(apiName).findMany({
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
      const players = await strapi.documents(apiName).findMany({
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

function isHost(player) {
  return player.position === "Host";
}

function isPlayer(player) {
  return player.position === "Player";
}

function hasHosted(player) {
  return player.hosted && notCancelled(player.hosted).length > 0;
}

function hasHosted4(player) {
  return (
    player.hosted &&
    player.hosted.filter((e) => e.eventStatus == "Over").length > 3
  );
}

function hasNeverHosted(player) {
  return !player.hosted || notCancelled(player.hosted).length == 0;
}

function hasMentored(player) {
  return player.mentored && notCancelled(player.mentored).length > 0;
}

function notCancelled(events) {
  return events.filter((e) => e.eventStatus != "Cancelled");
}

async function setPosition(apiName, player, position) {
  await strapi.documents(apiName).update({
    documentId: player.documentId,
    data: { position: position },
  });
}
