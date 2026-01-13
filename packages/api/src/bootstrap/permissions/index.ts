/**
 * Permission bootstrap module
 *
 * Syncs role permissions to the database on Strapi startup.
 * This replaces Config Sync for user role permissions.
 *
 * Usage:
 *   import { bootstrapPermissions } from "./bootstrap/permissions"
 *   await bootstrapPermissions(strapi)
 */

import type { Core } from "@strapi/strapi"
import { syncPermissions } from "./sync"
import { reportSentryError } from "../../services/observability/sentry-reporter"

export async function bootstrapPermissions(strapi: Core.Strapi): Promise<void> {
  strapi.log.info("[Permission Bootstrap] Starting permission synchronization...")

  try {
    await syncPermissions(strapi)
    strapi.log.info("[Permission Bootstrap] Permission synchronization complete")
  } catch (error) {
    strapi.log.error(`[Permission Bootstrap] Failed to sync permissions: ${error}`)
    reportSentryError(strapi, error, {
      tags: { phase: "bootstrap", module: "permission-bootstrap" },
      extra: { task: "syncPermissions" },
    })
    // Don't throw - allow Strapi to start even if permission sync fails
    // This prevents a broken permission config from blocking the entire app
  }
}

// Re-export types and constants for external use
export { ROLE_TYPES, ROLE_HIERARCHY, type RoleType } from "./types"
export { PERMISSION_DEFINITIONS } from "./definitions"
