/**
 * Test data factories for web package unit tests
 *
 * Re-exports all factory functions for convenient imports:
 *
 * @example
 * ```ts
 * import { createEvent, createPlayer, createArticle } from "@/test-utils/factories"
 * ```
 */

// Event factories
export {
  createEvent,
  createPastEvent,
  createEventWithoutImage,
  resetEventCounter,
  type EventFixture,
  type EventImage,
  type EventLocation,
} from "./event"

// Player factories
export {
  createPlayer,
  createMinimalPlayer,
  createPlayerWithoutAvatar,
  resetPlayerCounter,
  type PlayerFixture,
  type PlayerImage,
  type SocialNetwork,
} from "./player"

// Article factories
export {
  createArticle,
  createArticleWithoutAuthor,
  createArticleWithoutImage,
  createMinimalArticle,
  resetArticleCounter,
  type ArticleFixture,
  type ArticleImage,
  type ArticleAuthor,
  type ArticleTag,
} from "./article"

/**
 * Reset all factory counters
 * Useful in beforeEach to ensure consistent test data
 */
export function resetAllCounters(): void {
  const { resetEventCounter } = require("./event")
  const { resetPlayerCounter } = require("./player")
  const { resetArticleCounter } = require("./article")

  resetEventCounter()
  resetPlayerCounter()
  resetArticleCounter()
}
