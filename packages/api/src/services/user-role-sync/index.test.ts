/**
 * Unit tests for the user role sync service
 *
 * Tests cover:
 * - syncUserRoleFromPlayer: Sync role based on player's position
 * - syncUserRoleWithPlayerPosition: Sync role on OAuth login
 */

import type { Core } from "@strapi/strapi"
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest"
import { syncUserRoleFromPlayer, syncUserRoleWithPlayerPosition } from "./index"

// ============================================================================
// Test Fixtures
// ============================================================================

interface PlayerFixture {
  documentId: string
  name: string
  position: string
  user?: UserFixture | null
}

interface UserFixture {
  id: number
  documentId: string
  email: string
  role?: RoleFixture | null
  player?: Partial<PlayerFixture> | null
}

interface RoleFixture {
  id: number
  documentId: string
  type: string
  name: string
}

const createPlayer = (overrides: Partial<PlayerFixture> = {}): PlayerFixture => ({
  documentId: "player-123",
  name: "Test Player",
  position: "Player",
  user: null,
  ...overrides,
})

const createUser = (overrides: Partial<UserFixture> = {}): UserFixture => ({
  id: 1,
  documentId: "user-123",
  email: "test@example.com",
  role: null,
  player: null,
  ...overrides,
})

const createRole = (overrides: Partial<RoleFixture> = {}): RoleFixture => ({
  id: 1,
  documentId: "role-123",
  type: "player",
  name: "Player",
  ...overrides,
})

// ============================================================================
// Mock Strapi Factory
// ============================================================================

interface MockDatabase {
  players: Map<string, PlayerFixture>
  users: Map<string, UserFixture>
  roles: Map<string, RoleFixture>
}

interface MockDocumentService {
  findOne: Mock
  findFirst: Mock
  update: Mock
}

interface MockStrapi {
  documents: Mock<[string], MockDocumentService>
  log: {
    debug: Mock
    info: Mock
    warn: Mock
    error: Mock
  }
}

function createMockStrapi(db: MockDatabase): MockStrapi {
  const documentServices = new Map<string, MockDocumentService>()

  const getDocumentService = (collection: string): MockDocumentService => {
    if (!documentServices.has(collection)) {
      documentServices.set(collection, {
        findOne: vi.fn(async ({ documentId }) => {
          if (collection.includes("player")) {
            return db.players.get(documentId) || null
          }
          return null
        }),
        findFirst: vi.fn(async ({ filters }) => {
          if (collection.includes("role")) {
            for (const role of db.roles.values()) {
              if (filters.type && role.type === filters.type) {
                return role
              }
            }
          }
          if (collection.includes("user")) {
            for (const user of db.users.values()) {
              if (filters.id && user.id === filters.id) {
                return user
              }
            }
          }
          return null
        }),
        update: vi.fn(async ({ documentId, data }) => {
          if (collection.includes("user")) {
            const user = db.users.get(documentId)
            if (user && data.role) {
              // Find the role by ID
              for (const role of db.roles.values()) {
                if (role.id === data.role) {
                  user.role = role
                  break
                }
              }
              return user
            }
          }
          return null
        }),
      })
    }
    return documentServices.get(collection)!
  }

  return {
    documents: vi.fn((collection: string) => getDocumentService(collection)),
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }
}

// ============================================================================
// syncUserRoleFromPlayer() Tests
// ============================================================================

describe("syncUserRoleFromPlayer", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      players: new Map(),
      users: new Map(),
      roles: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("returns false when player not found", async () => {
    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "nonexistent")

    expect(result).toBe(false)
    expect(mockStrapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("Player not found"))
  })

  it("returns false when player has no linked user", async () => {
    const player = createPlayer({ documentId: "player-1", user: null })
    db.players.set("player-1", player)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(false)
    expect(mockStrapi.log.debug).toHaveBeenCalledWith(expect.stringContaining("has no linked user"))
  })

  it("returns false for unknown position", async () => {
    const user = createUser({ documentId: "user-1" })
    const player = createPlayer({
      documentId: "player-1",
      position: "Unknown",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(false)
    expect(mockStrapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown position "Unknown"')
    )
  })

  it("returns false when user already has correct role", async () => {
    const role = createRole({ id: 1, type: "player" })
    const user = createUser({ documentId: "user-1", role })
    const player = createPlayer({
      documentId: "player-1",
      position: "Player",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)
    db.roles.set("role-player", role)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(false)
    expect(mockStrapi.log.debug).toHaveBeenCalledWith(
      expect.stringContaining("already has correct role")
    )
  })

  it("returns false when target role not found", async () => {
    const wrongRole = createRole({ id: 2, type: "public" })
    const user = createUser({ documentId: "user-1", role: wrongRole })
    const player = createPlayer({
      documentId: "player-1",
      position: "Host",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)
    // No "host" role in database

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(false)
    expect(mockStrapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Role type "host" not found')
    )
  })

  it("updates user role from Player to Host", async () => {
    const playerRole = createRole({ id: 1, type: "player" })
    const hostRole = createRole({ id: 2, type: "host", name: "Host" })
    const user = createUser({ documentId: "user-1", role: playerRole })
    const player = createPlayer({
      documentId: "player-1",
      position: "Host",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)
    db.roles.set("role-host", hostRole)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(true)
    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining('from "player" to "host"')
    )
  })

  it("updates user role from Host to Mentor", async () => {
    const hostRole = createRole({ id: 2, type: "host" })
    const mentorRole = createRole({ id: 3, type: "mentor", name: "Mentor" })
    const user = createUser({ documentId: "user-1", role: hostRole })
    const player = createPlayer({
      documentId: "player-1",
      position: "Mentor",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)
    db.roles.set("role-host", hostRole)
    db.roles.set("role-mentor", mentorRole)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(true)
    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining('from "host" to "mentor"')
    )
  })

  it("updates user role to Founder", async () => {
    const playerRole = createRole({ id: 1, type: "player" })
    const founderRole = createRole({ id: 4, type: "founder", name: "Founder" })
    const user = createUser({ documentId: "user-1", role: playerRole })
    const player = createPlayer({
      documentId: "player-1",
      position: "Founder",
      user,
    })
    db.players.set("player-1", player)
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)
    db.roles.set("role-founder", founderRole)

    const result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")

    expect(result).toBe(true)
    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining('from "player" to "founder"')
    )
  })

  describe("position to role mapping", () => {
    const positionRolePairs = [
      { position: "Player", expectedRole: "player" },
      { position: "Host", expectedRole: "host" },
      { position: "Mentor", expectedRole: "mentor" },
      { position: "Founder", expectedRole: "founder" },
    ]

    positionRolePairs.forEach(({ position, expectedRole }) => {
      it(`maps ${position} position to ${expectedRole} role`, async () => {
        const wrongRole = createRole({ id: 99, type: "public" })
        const targetRole = createRole({ id: 1, type: expectedRole })
        const user = createUser({ documentId: "user-1", role: wrongRole })
        const player = createPlayer({
          documentId: "player-1",
          position,
          user,
        })
        db.players.set("player-1", player)
        db.users.set("user-1", user)
        db.roles.set(`role-${expectedRole}`, targetRole)

        const result = await syncUserRoleFromPlayer(
          mockStrapi as unknown as Core.Strapi,
          "player-1"
        )

        expect(result).toBe(true)
      })
    })
  })
})

// ============================================================================
// syncUserRoleWithPlayerPosition() Tests
// ============================================================================

describe("syncUserRoleWithPlayerPosition", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      players: new Map(),
      users: new Map(),
      roles: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("returns early when user has no player", async () => {
    const user = createUser({ id: 1, documentId: "user-1", player: null })
    db.users.set("user-1", user)

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    // Should not attempt to update anything
    const userService = mockStrapi.documents("plugin::users-permissions.user")
    expect(userService.update).not.toHaveBeenCalled()
  })

  it("returns early when player has no position", async () => {
    const user = createUser({
      id: 1,
      documentId: "user-1",
      player: { position: undefined } as any,
    })
    db.users.set("user-1", user)

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    const userService = mockStrapi.documents("plugin::users-permissions.user")
    expect(userService.update).not.toHaveBeenCalled()
  })

  it("returns early for unknown position", async () => {
    const user = createUser({
      id: 1,
      documentId: "user-1",
      player: { position: "Unknown" },
    })
    db.users.set("user-1", user)

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    const userService = mockStrapi.documents("plugin::users-permissions.user")
    expect(userService.update).not.toHaveBeenCalled()
  })

  it("returns early when user already has correct role", async () => {
    const playerRole = createRole({ id: 1, type: "player" })
    const user = createUser({
      id: 1,
      documentId: "user-1",
      role: playerRole,
      player: { position: "Player" },
    })
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    const userService = mockStrapi.documents("plugin::users-permissions.user")
    expect(userService.update).not.toHaveBeenCalled()
  })

  it("updates role when position changed", async () => {
    const playerRole = createRole({ id: 1, type: "player" })
    const hostRole = createRole({ id: 2, type: "host" })
    const user = createUser({
      id: 1,
      documentId: "user-1",
      role: playerRole,
      player: { position: "Host" },
    })
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)
    db.roles.set("role-host", hostRole)

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining('Updated user 1 role from "player" to "host"')
    )
  })

  it("logs warning when target role not found", async () => {
    const playerRole = createRole({ id: 1, type: "player" })
    const user = createUser({
      id: 1,
      documentId: "user-1",
      role: playerRole,
      player: { position: "Host" },
    })
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)
    // No host role in database

    await syncUserRoleWithPlayerPosition(mockStrapi as unknown as Core.Strapi, 1)

    expect(mockStrapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Role type "host" not found')
    )
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Role Sync Integration", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      players: new Map(),
      users: new Map(),
      roles: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("handles full player promotion flow", async () => {
    // Setup: Player with "Player" position and "player" role
    const playerRole = createRole({ id: 1, type: "player", name: "Player" })
    const hostRole = createRole({ id: 2, type: "host", name: "Host" })
    const mentorRole = createRole({ id: 3, type: "mentor", name: "Mentor" })

    const user = createUser({ documentId: "user-1", role: playerRole })
    const player = createPlayer({
      documentId: "player-1",
      position: "Player",
      user,
    })

    db.players.set("player-1", player)
    db.users.set("user-1", user)
    db.roles.set("role-player", playerRole)
    db.roles.set("role-host", hostRole)
    db.roles.set("role-mentor", mentorRole)

    // Initially: No change needed
    let result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")
    expect(result).toBe(false) // Already correct

    // Promote to Host
    player.position = "Host"
    result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")
    expect(result).toBe(true)
    expect(user.role?.type).toBe("host")

    // Promote to Mentor
    player.position = "Mentor"
    result = await syncUserRoleFromPlayer(mockStrapi as unknown as Core.Strapi, "player-1")
    expect(result).toBe(true)
    expect(user.role?.type).toBe("mentor")
  })
})
