/**
 * Utility functions for ticket management
 */

import { randomBytes } from "crypto"

/**
 * Generate a unique order number
 * Format: P14-YYYYMMDD-XXXXXX (e.g., P14-20250101-A1B2C3)
 */
export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "")
  const randomPart = randomBytes(3).toString("hex").toUpperCase()
  return `P14-${dateStr}-${randomPart}`
}

/**
 * Generate a unique ticket code
 * Format: TKT-XXXXXXXXXXXX (12 random hex characters)
 */
export function generateTicketCode(): string {
  const randomPart = randomBytes(6).toString("hex").toUpperCase()
  return `TKT-${randomPart}`
}
