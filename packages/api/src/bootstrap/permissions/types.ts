/**
 * Permission system type definitions
 *
 * Defines roles, hierarchy, and permission structure for the bootstrap system.
 */

export const ROLE_TYPES = {
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  PLAYER: "player",
  HOST: "host",
  MENTOR: "mentor",
  FOUNDER: "founder",
} as const

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES]

/**
 * Role hierarchy from least to most privileged.
 * Each role inherits all permissions from roles below it.
 */
export const ROLE_HIERARCHY: RoleType[] = [
  ROLE_TYPES.PUBLIC,
  ROLE_TYPES.AUTHENTICATED,
  ROLE_TYPES.PLAYER,
  ROLE_TYPES.HOST,
  ROLE_TYPES.MENTOR,
  ROLE_TYPES.FOUNDER,
]

/**
 * Role display names and descriptions for database creation
 */
export const ROLE_METADATA: Record<RoleType, { name: string; description: string }> = {
  [ROLE_TYPES.PUBLIC]: {
    name: "Public",
    description: "Default role given to unauthenticated user.",
  },
  [ROLE_TYPES.AUTHENTICATED]: {
    name: "Authenticated",
    description: "Default role given to authenticated user.",
  },
  [ROLE_TYPES.PLAYER]: {
    name: "Player",
    description: "Role for #play14 community members who attend events.",
  },
  [ROLE_TYPES.HOST]: {
    name: "Host",
    description: "Role for hosts who organize #play14 events.",
  },
  [ROLE_TYPES.MENTOR]: {
    name: "Mentor",
    description: "Role for mentors who guide and facilitate #play14 events.",
  },
  [ROLE_TYPES.FOUNDER]: {
    name: "Founder",
    description: "Role for founders of #play14 with full administrative permissions.",
  },
}

/**
 * Permission definition mapping an action to its minimum required role
 */
export interface PermissionDefinition {
  action: string
  minimumRole: RoleType
}
