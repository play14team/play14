/**
 * Strapi Cron Tasks Configuration
 *
 * This file defines the cron task schedule. Task implementations are in:
 * - src/services/cron/          - Domain-specific cron tasks
 * - src/services/observability/ - Metrics collection
 * - src/services/webhook.ts     - Webhook cleanup
 * - src/services/user-invitations.ts - User invitation processing
 * - src/services/account-lockout.ts  - Account lockout cleanup
 *
 * DISTRIBUTED LOCKING:
 * All cron tasks use Redis-based distributed locking to ensure they only run
 * on one container at a time in multi-container deployments. Configure the
 * REDIS_URL environment variable to enable distributed locking.
 */

import type { Core } from "@strapi/strapi"
import { cleanupLockoutStore, getLockoutStoreSize } from "../src/services/account-lockout"
import {
  cleanAbandonedDraftOrders,
  cleanExpiredTicketOrders,
  processEventResultsReminders,
  reservationHealthCheck,
  updateEventStatus,
  updatePlayerPositions,
} from "../src/services/cron"
import { acquireLock, releaseLock } from "../src/services/cron/distributed-lock"
import { collectBusinessMetrics } from "../src/services/observability/metrics-collector"
import { reportSentryError } from "../src/services/observability/sentry-reporter"
import { processUserInvitations } from "../src/services/user-invitations"
import { cleanupOldWebhookRecords } from "../src/services/webhook"

type TaskContext = { strapi?: Core.Strapi }
type TaskFn = (context: TaskContext) => Promise<void> | void

/**
 * Wrapper that catches errors and reports them via structured logging
 */
const withErrorReporting = (taskName: string, taskFn: TaskFn) => async (context: TaskContext) => {
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
 * Wrapper that acquires a distributed lock before running the task.
 * If the lock cannot be acquired (another container holds it), the task is skipped.
 *
 * @param taskName - Unique name for the lock key
 * @param taskFn - The task function to execute
 * @param ttlMs - Lock TTL in milliseconds (default: 5 minutes)
 */
const withLock =
  (taskName: string, taskFn: TaskFn, ttlMs: number = 5 * 60 * 1000) =>
  async (context: TaskContext) => {
    const lockToken = await acquireLock(taskName, ttlMs)
    if (!lockToken) {
      // Lock held by another container, skip this execution
      return
    }

    try {
      return await taskFn(context)
    } finally {
      await releaseLock(taskName, lockToken)
    }
  }

/**
 * Cron task definitions
 * See: https://docs.strapi.io/dev-docs/configurations/cron
 *
 * All tasks are wrapped with:
 * - withLock: Distributed locking via Redis (prevents duplicate runs across containers)
 * - withErrorReporting: Error reporting via structured logging
 */
const cronTasks = {
  // Every 5 minutes - Collect business metrics for Prometheus
  collectMetrics: {
    task: withLock(
      "collectMetrics",
      withErrorReporting("collectMetrics", async ({ strapi }) => {
        if (process.env.METRICS_ENABLED === "false") return
        await collectBusinessMetrics(strapi)
      })
    ),
    options: { rule: "0 */5 * * * *" },
  },

  // Every 5 minutes - Clean up expired pending ticket orders
  cleanExpiredTicketOrders: {
    task: withLock(
      "cleanExpiredTicketOrders",
      withErrorReporting("cleanExpiredTicketOrders", async ({ strapi }) => {
        await cleanExpiredTicketOrders(strapi!)
      })
    ),
    options: { rule: "0 */5 * * * *" },
  },

  // Every 5 minutes - Process user invitations
  inviteNewUsers: {
    task: withLock(
      "inviteNewUsers",
      withErrorReporting("inviteNewUsers", async ({ strapi }) => {
        if (process.env.INVITATION_EMAILS_ENABLED === "false") {
          console.log("User invitation job skipped (INVITATION_EMAILS_ENABLED=false)")
          return
        }
        console.log("Running user invitation job")
        await processUserInvitations(strapi)
      })
    ),
    options: { rule: "0 */5 * * * *" },
  },

  // Every hour at :30 - Clean up abandoned draft orders
  cleanAbandonedDraftOrders: {
    task: withLock(
      "cleanAbandonedDraftOrders",
      withErrorReporting("cleanAbandonedDraftOrders", async ({ strapi }) => {
        await cleanAbandonedDraftOrders(strapi!)
      })
    ),
    options: { rule: "0 30 * * * *" },
  },

  // Daily at 01:00 - Check for reservation count drift
  reservationHealthCheck: {
    task: withLock(
      "reservationHealthCheck",
      withErrorReporting("reservationHealthCheck", async ({ strapi }) => {
        await reservationHealthCheck(strapi!)
      }),
      10 * 60 * 1000 // 10 minute TTL for longer-running health checks
    ),
    options: { rule: "0 0 1 * * *" },
  },

  // Daily at 00:00 - Update event status for past events
  eventStatus: {
    task: withLock(
      "eventStatus",
      withErrorReporting("eventStatus", async ({ strapi }) => {
        await updateEventStatus(strapi!)
      })
    ),
    options: { rule: "0 0 0 * * *" },
  },

  // Daily at 00:05 - Update player positions
  playerPosition: {
    task: withLock(
      "playerPosition",
      withErrorReporting("playerPosition", async ({ strapi }) => {
        await updatePlayerPositions(strapi!)
      })
    ),
    options: { rule: "0 5 0 * * *" },
  },

  // Daily at 02:00 - Clean up old webhook records
  cleanProcessedWebhooks: {
    task: withLock(
      "cleanProcessedWebhooks",
      withErrorReporting("cleanProcessedWebhooks", async ({ strapi }) => {
        console.log("Running processed webhooks cleanup job")
        const deletedCount = await cleanupOldWebhookRecords(strapi, 7)
        console.log(`Cleaned up ${deletedCount} old webhook records`)
      })
    ),
    options: { rule: "0 0 2 * * *" },
  },

  // Every 5 minutes - Clean up expired account lockout entries
  // Note: This task uses in-memory storage, so each container cleans its own store
  // The lock ensures only one container runs at a time to reduce log noise
  cleanAccountLockouts: {
    task: withLock(
      "cleanAccountLockouts",
      withErrorReporting("cleanAccountLockouts", async () => {
        const sizeBefore = getLockoutStoreSize()
        const cleanedCount = cleanupLockoutStore()
        if (cleanedCount > 0) {
          console.log(
            `[AccountLockout] Cleaned up ${cleanedCount} expired entries (${sizeBefore} -> ${getLockoutStoreSize()})`
          )
        }
      })
    ),
    options: { rule: "0 */5 * * * *" },
  },

  // Daily at 06:00 - Send event results reminders
  // Sends up to 3 reminders, 15 days apart, starting 15 days after event ends
  eventResultsReminders: {
    task: withLock(
      "eventResultsReminders",
      withErrorReporting("eventResultsReminders", async ({ strapi }) => {
        await processEventResultsReminders(strapi!)
      })
    ),
    options: { rule: "0 0 6 * * *" },
  },
}

export default cronTasks
