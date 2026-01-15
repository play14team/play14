/**
 * Strapi Cron Tasks Configuration
 *
 * This file defines the cron task schedule. Task implementations are in:
 * - src/services/cron/          - Domain-specific cron tasks
 * - src/services/observability/ - Metrics collection
 * - src/services/webhook.ts     - Webhook cleanup
 * - src/services/user-invitations.ts - User invitation processing
 * - src/services/account-lockout.ts  - Account lockout cleanup
 */

import type { Core } from "@strapi/strapi"
import { collectBusinessMetrics } from "../src/services/observability/metrics-collector"
import { cleanupOldWebhookRecords } from "../src/services/webhook"
import { processUserInvitations } from "../src/services/user-invitations"
import { reportSentryError } from "../src/services/observability/sentry-reporter"
import { cleanupLockoutStore, getLockoutStoreSize } from "../src/services/account-lockout"
import {
  cleanExpiredTicketOrders,
  cleanAbandonedDraftOrders,
  reservationHealthCheck,
  updateEventStatus,
  updatePlayerPositions,
} from "../src/services/cron"

type TaskContext = { strapi?: Core.Strapi }
type TaskFn = (context: TaskContext) => Promise<void> | void

/**
 * Wrapper that catches errors and reports them to Sentry
 */
const withSentry = (taskName: string, taskFn: TaskFn) => async (context: TaskContext) => {
  try {
    return await taskFn(context)
  } catch (error) {
    const strapi = context?.strapi
    if (strapi) {
      reportSentryError(strapi, error, {
        tags: { cron_task: taskName },
        extra: { task: taskName },
      })
    }
    throw error
  }
}

/**
 * Cron task definitions
 * See: https://docs.strapi.io/dev-docs/configurations/cron
 */
const cronTasks = {
  // Every 5 minutes - Collect business metrics for Prometheus
  collectMetrics: {
    task: withSentry("collectMetrics", async ({ strapi }) => {
      if (process.env.METRICS_ENABLED === "false") return
      await collectBusinessMetrics(strapi)
    }),
    options: { rule: "0 */5 * * * *" },
  },

  // Every 5 minutes - Clean up expired pending ticket orders
  cleanExpiredTicketOrders: {
    task: withSentry("cleanExpiredTicketOrders", async ({ strapi }) => {
      await cleanExpiredTicketOrders(strapi!)
    }),
    options: { rule: "0 */5 * * * *" },
  },

  // Every hour at :30 - Clean up abandoned draft orders
  cleanAbandonedDraftOrders: {
    task: withSentry("cleanAbandonedDraftOrders", async ({ strapi }) => {
      await cleanAbandonedDraftOrders(strapi!)
    }),
    options: { rule: "0 30 * * * *" },
  },

  // Every hour at :00 - Process user invitations
  inviteNewUsers: {
    task: withSentry("inviteNewUsers", async ({ strapi }) => {
      if (process.env.INVITATION_EMAILS_ENABLED === "false") {
        console.log("User invitation job skipped (INVITATION_EMAILS_ENABLED=false)")
        return
      }
      console.log("Running user invitation job")
      await processUserInvitations(strapi)
    }),
    options: { rule: "0 * * * *" },
  },

  // Daily at 01:00 - Check for reservation count drift
  reservationHealthCheck: {
    task: withSentry("reservationHealthCheck", async ({ strapi }) => {
      await reservationHealthCheck(strapi!)
    }),
    options: { rule: "0 0 1 * * *" },
  },

  // Daily at 00:00 - Update event status for past events
  eventStatus: {
    task: withSentry("eventStatus", async ({ strapi }) => {
      await updateEventStatus(strapi!)
    }),
    options: { rule: "0 0 0 * * *" },
  },

  // Daily at 00:05 - Update player positions
  playerPosition: {
    task: withSentry("playerPosition", async ({ strapi }) => {
      await updatePlayerPositions(strapi!)
    }),
    options: { rule: "0 5 0 * * *" },
  },

  // Daily at 02:00 - Clean up old webhook records
  cleanProcessedWebhooks: {
    task: withSentry("cleanProcessedWebhooks", async ({ strapi }) => {
      console.log("Running processed webhooks cleanup job")
      const deletedCount = await cleanupOldWebhookRecords(strapi, 7)
      console.log(`Cleaned up ${deletedCount} old webhook records`)
    }),
    options: { rule: "0 0 2 * * *" },
  },

  // Every 5 minutes - Clean up expired account lockout entries
  cleanAccountLockouts: {
    task: withSentry("cleanAccountLockouts", async () => {
      const sizeBefore = getLockoutStoreSize()
      const cleanedCount = cleanupLockoutStore()
      if (cleanedCount > 0) {
        console.log(
          `[AccountLockout] Cleaned up ${cleanedCount} expired entries (${sizeBefore} -> ${getLockoutStoreSize()})`
        )
      }
    }),
    options: { rule: "0 */5 * * * *" },
  },
}

export default cronTasks
