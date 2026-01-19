/**
 * Ticketing Configuration Constants
 *
 * Centralized configuration for ticketing-related limits and settings.
 * These values can be overridden via environment variables.
 */

/**
 * Order rate limiting configuration
 */
export const ORDER_LIMITS = {
  /** Maximum number of pending draft orders per user */
  MAX_PENDING_DRAFTS: Number.parseInt(process.env.TICKETING_MAX_PENDING_DRAFTS || "5", 10),

  /** Maximum number of orders a user can create per hour */
  MAX_DRAFTS_PER_HOUR: Number.parseInt(process.env.TICKETING_MAX_DRAFTS_PER_HOUR || "10", 10),
} as const

/**
 * Player creation configuration
 */
export const PLAYER_CREATION = {
  /** Maximum attempts to generate a unique slug */
  MAX_SLUG_ATTEMPTS: 10,

  /** Default position for newly created players */
  DEFAULT_POSITION: "Player" as const,
} as const

/**
 * Country defaults for Stripe
 */
export const STRIPE_DEFAULTS = {
  /** Default country code for Stripe accounts when not specified */
  DEFAULT_COUNTRY: process.env.STRIPE_DEFAULT_COUNTRY || "FR",
} as const

/**
 * All ticketing configuration
 */
export const TICKETING_CONFIG = {
  ORDER_LIMITS,
  PLAYER_CREATION,
  STRIPE_DEFAULTS,
} as const

export default TICKETING_CONFIG
