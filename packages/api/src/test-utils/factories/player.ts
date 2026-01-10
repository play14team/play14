/**
 * Player test data factory
 */

export interface PlayerFixture {
  documentId: string
  name: string
  slug: string
  email: string | null
  tagline: string | null
  position: string | null
  company: string | null
  bio: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

let playerCounter = 0

/**
 * Create a player fixture with sensible defaults
 */
export function createPlayer(overrides: Partial<PlayerFixture> = {}): PlayerFixture {
  playerCounter++
  const now = new Date().toISOString()

  return {
    documentId: `player-${playerCounter}`,
    name: `Test Player ${playerCounter}`,
    slug: `test-player-${playerCounter}`,
    email: `player${playerCounter}@example.com`,
    tagline: `Tagline for player ${playerCounter}`,
    position: "Software Developer",
    company: "Test Company",
    bio: `Bio for test player ${playerCounter}`,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create a private player (not publicly visible)
 */
export function createPrivatePlayer(
  overrides: Partial<PlayerFixture> = {}
): PlayerFixture {
  return createPlayer({
    isPublic: false,
    ...overrides,
  })
}

/**
 * Create a minimal player (only required fields)
 */
export function createMinimalPlayer(
  overrides: Partial<PlayerFixture> = {}
): PlayerFixture {
  return createPlayer({
    tagline: null,
    position: null,
    company: null,
    bio: null,
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetPlayerCounter(): void {
  playerCounter = 0
}
