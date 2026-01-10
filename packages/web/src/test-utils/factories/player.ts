/**
 * Player test data factory for web package
 *
 * Creates mock player data matching Strapi API responses
 */

export interface PlayerImage {
  name: string
  url: string
  width: number
  height: number
}

export interface SocialNetwork {
  id: number
  type: string
  url: string
}

export interface PlayerFixture {
  documentId: string
  name: string
  slug: string
  tagline: string | null
  position: string | null
  company: string | null
  bio: string | null
  avatar: PlayerImage | null
  socialNetworks: SocialNetwork[]
}

let playerCounter = 0

/**
 * Create a player fixture with sensible defaults
 */
export function createPlayer(overrides: Partial<PlayerFixture> = {}): PlayerFixture {
  playerCounter++

  return {
    documentId: `player-${playerCounter}`,
    name: `Test Player ${playerCounter}`,
    slug: `test-player-${playerCounter}`,
    tagline: `Passionate about agile games`,
    position: "Software Developer",
    company: "Test Company",
    bio: `<p>Bio for test player ${playerCounter}</p>`,
    avatar: {
      name: `player-${playerCounter}.jpg`,
      url: `https://example.com/avatars/player-${playerCounter}.jpg`,
      width: 400,
      height: 400,
    },
    socialNetworks: [
      {
        id: playerCounter * 10 + 1,
        type: "linkedin",
        url: `https://linkedin.com/in/test-player-${playerCounter}`,
      },
      {
        id: playerCounter * 10 + 2,
        type: "twitter",
        url: `https://twitter.com/testplayer${playerCounter}`,
      },
    ],
    ...overrides,
  }
}

/**
 * Create a minimal player (no optional fields)
 */
export function createMinimalPlayer(
  overrides: Partial<PlayerFixture> = {}
): PlayerFixture {
  return createPlayer({
    tagline: null,
    position: null,
    company: null,
    bio: null,
    avatar: null,
    socialNetworks: [],
    ...overrides,
  })
}

/**
 * Create a player without avatar
 */
export function createPlayerWithoutAvatar(
  overrides: Partial<PlayerFixture> = {}
): PlayerFixture {
  return createPlayer({
    avatar: null,
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetPlayerCounter(): void {
  playerCounter = 0
}
