/**
 * Permission synchronization logic
 *
 * Syncs permission definitions to the database on each Strapi startup.
 * Uses declarative mode: code is the source of truth.
 */

import type { Core } from "@strapi/strapi"
import { PERMISSION_DEFINITIONS } from "./definitions"
import { ROLE_HIERARCHY, ROLE_METADATA, type RoleType } from "./types"

interface DbRole {
  id: number
  documentId: string
  type: string
  name: string
  description: string
}

interface DbPermission {
  id: number
  action: string
  role: { id: number; type: string }
}

/**
 * Get all roles that should have a permission based on minimum role requirement.
 * Due to role hierarchy, higher roles inherit from lower roles.
 */
function getRolesWithPermission(minimumRole: RoleType): RoleType[] {
  const minIndex = ROLE_HIERARCHY.indexOf(minimumRole)
  if (minIndex === -1) {
    throw new Error(`Unknown role type: ${minimumRole}`)
  }
  return ROLE_HIERARCHY.slice(minIndex)
}

/**
 * Build the expected permissions map: { roleType: Set<action> }
 */
function buildExpectedPermissions(): Map<RoleType, Set<string>> {
  const rolePermissions = new Map<RoleType, Set<string>>()

  // Initialize empty sets for all roles
  for (const roleType of ROLE_HIERARCHY) {
    rolePermissions.set(roleType, new Set())
  }

  // Populate based on definitions
  for (const def of PERMISSION_DEFINITIONS) {
    const roles = getRolesWithPermission(def.minimumRole)
    for (const roleType of roles) {
      rolePermissions.get(roleType)!.add(def.action)
    }
  }

  return rolePermissions
}

/**
 * Get all managed actions (actions defined in PERMISSION_DEFINITIONS)
 */
function getManagedActions(): Set<string> {
  return new Set(PERMISSION_DEFINITIONS.map((def) => def.action))
}

/**
 * Ensure all required roles exist in the database
 */
async function ensureRolesExist(strapi: Core.Strapi): Promise<Map<RoleType, DbRole>> {
  const roleByType = new Map<RoleType, DbRole>()

  // Fetch existing roles
  const existingRoles = (await strapi.db
    .query("plugin::users-permissions.role")
    .findMany()) as DbRole[]

  for (const role of existingRoles) {
    roleByType.set(role.type as RoleType, role)
  }

  // Create missing roles
  for (const roleType of ROLE_HIERARCHY) {
    if (!roleByType.has(roleType)) {
      const metadata = ROLE_METADATA[roleType]
      strapi.log.info(`[Permission Bootstrap] Creating missing role: ${roleType}`)

      const newRole = (await strapi.db.query("plugin::users-permissions.role").create({
        data: {
          name: metadata.name,
          description: metadata.description,
          type: roleType,
        },
      })) as DbRole

      roleByType.set(roleType, newRole)
    }
  }

  return roleByType
}

/**
 * Sync permissions to database based on definitions.
 * This is declarative: permissions not in definitions will be removed (for managed actions).
 */
export async function syncPermissions(strapi: Core.Strapi): Promise<void> {
  const expectedPermissions = buildExpectedPermissions()
  const managedActions = getManagedActions()

  // Ensure all roles exist and get their database IDs
  const roleByType = await ensureRolesExist(strapi)

  // Fetch all current permissions with their roles
  const currentPermissions = (await strapi.db
    .query("plugin::users-permissions.permission")
    .findMany({
      populate: ["role"],
    })) as DbPermission[]

  // Build current state: key = "roleId:action"
  const currentByKey = new Map<string, DbPermission>()
  for (const perm of currentPermissions) {
    if (perm.role) {
      const key = `${perm.role.id}:${perm.action}`
      currentByKey.set(key, perm)
    }
  }

  const toCreate: { action: string; role: number }[] = []
  const toDelete: number[] = []

  // Process each role
  for (const roleType of ROLE_HIERARCHY) {
    const role = roleByType.get(roleType)
    if (!role) {
      strapi.log.warn(`[Permission Bootstrap] Role type '${roleType}' not found`)
      continue
    }

    const expectedActions = expectedPermissions.get(roleType)!

    // Check for missing permissions (need to create)
    for (const action of expectedActions) {
      const key = `${role.id}:${action}`
      if (!currentByKey.has(key)) {
        toCreate.push({ action, role: role.id })
      }
    }

    // Check for extra permissions (need to delete) - only for managed actions
    for (const perm of currentPermissions) {
      if (!perm.role || perm.role.id !== role.id) continue

      // Only manage actions that are defined in our definitions
      if (!managedActions.has(perm.action)) continue

      // If this managed action is not expected for this role, delete it
      if (!expectedActions.has(perm.action)) {
        toDelete.push(perm.id)
      }
    }
  }

  // Apply deletions first
  if (toDelete.length > 0) {
    strapi.log.info(`[Permission Bootstrap] Removing ${toDelete.length} obsolete permission(s)`)

    for (const id of toDelete) {
      try {
        await strapi.db.query("plugin::users-permissions.permission").delete({
          where: { id },
        })
      } catch (error) {
        strapi.log.error(`[Permission Bootstrap] Failed to delete permission ${id}: ${error}`)
      }
    }
  }

  // Apply creations
  if (toCreate.length > 0) {
    strapi.log.info(`[Permission Bootstrap] Creating ${toCreate.length} missing permission(s)`)

    for (const data of toCreate) {
      try {
        await strapi.db.query("plugin::users-permissions.permission").create({
          data,
        })
      } catch (error) {
        strapi.log.error(
          `[Permission Bootstrap] Failed to create permission ${data.action}: ${error}`
        )
      }
    }
  }

  // Log summary
  if (toCreate.length === 0 && toDelete.length === 0) {
    strapi.log.info("[Permission Bootstrap] All permissions are in sync")
  } else {
    strapi.log.info(
      `[Permission Bootstrap] Sync complete: ${toCreate.length} created, ${toDelete.length} removed`
    )
  }

  // Log permission counts per role for verification
  for (const roleType of ROLE_HIERARCHY) {
    const count = expectedPermissions.get(roleType)!.size
    strapi.log.debug(`[Permission Bootstrap] ${roleType}: ${count} permissions`)
  }
}
