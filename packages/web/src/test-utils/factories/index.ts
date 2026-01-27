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

// Article factories
export {
  type ArticleAuthor,
  type ArticleFixture,
  type ArticleImage,
  type ArticleTag,
  createArticle,
  createArticleWithoutAuthor,
  createArticleWithoutImage,
  createMinimalArticle,
  resetArticleCounter,
} from "./article"
// Event factories
export {
  createEvent,
  createEventWithoutImage,
  createPastEvent,
  type EventFixture,
  type EventImage,
  type EventLocation,
  resetEventCounter,
} from "./event"
// Player factories
export {
  createMinimalPlayer,
  createPlayer,
  createPlayerWithoutAvatar,
  type PlayerFixture,
  type PlayerImage,
  resetPlayerCounter,
  type SocialNetwork,
} from "./player"

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
