/**
 * Cron task services - re-exports all cron task functions
 */

export {
  acquireLock,
  closeRedisConnection,
  getInstanceId,
  isRedisAvailable,
  releaseLock,
  withDistributedLock,
} from "./distributed-lock"
export { cleanOldEmailLogs } from "./email-logs"
export { processEventResultsReminders } from "./event-results-reminders"
export { updateEventStatus } from "./events"
export {
  decideFinding,
  linkedinUrlOf,
  markedAssetId,
  parsePhotoUrl,
  reportLinkedinAvatarCandidates,
} from "./linkedin-avatars"
export { decideReconciliation, reconcileNewsletterSends } from "./newsletter-reconciliation"

export { updatePlayerPositions } from "./players"
export {
  cleanAbandonedDraftOrders,
  cleanExpiredTicketOrders,
  reservationHealthCheck,
} from "./ticket-orders"
