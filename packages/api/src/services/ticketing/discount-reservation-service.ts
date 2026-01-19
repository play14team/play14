/**
 * Discount Code Reservation Service
 *
 * Handles atomic reservation operations to prevent discount code overuse.
 * Similar to ticket reservations, this prevents TOCTOU (Time-of-Check-Time-of-Use)
 * vulnerabilities where two users could simultaneously validate a discount code
 * near its usage limit, both pass the check, then both use it.
 *
 * Flow:
 * 1. User starts checkout -> reserveDiscountCode() atomically increments reservedCount
 * 2a. Payment succeeds -> confirmDiscountCode() atomically moves from reserved to used
 * 2b. Session expires -> releaseDiscountCode() atomically decrements reservedCount
 */

import type { Core } from "@strapi/strapi"

// Database connection type
type DatabaseConnection = any

export interface DiscountCodeInfo {
  id: number
  documentId: string
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  maxUses: number | null
  usedCount: number
  reservedCount: number
  maxDiscountAmount: number | null
  minOrderAmount: number | null
}

export interface ReserveDiscountResult {
  success: boolean
  error?: string
  discountCode?: DiscountCodeInfo
  discountAmount?: number
}

/**
 * Atomically reserve a discount code usage.
 * This prevents race conditions by checking availability and updating in a single SQL statement.
 *
 * The UPDATE only succeeds if:
 * 1. The discount code exists with the given document_id
 * 2. There's capacity: max_uses IS NULL OR (used_count + reserved_count < max_uses)
 * 3. The code is active and within validity period
 *
 * @param knex - Knex connection
 * @param discountCodeDocumentId - Document ID of the discount code
 * @returns Object with success flag and discount code data if successful
 */
async function atomicReserveDiscountCode(
  knex: DatabaseConnection,
  discountCodeDocumentId: string
): Promise<{ success: boolean; discountCode?: DiscountCodeInfo; error?: string }> {
  const now = new Date().toISOString()

  // Use a raw SQL UPDATE with WHERE clause that enforces availability
  // This is atomic - the database guarantees no race condition
  const result = await knex.raw(
    `
    UPDATE discount_codes
    SET reserved_count = COALESCE(reserved_count, 0) + 1
    WHERE document_id = ?
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= ?)
      AND (valid_until IS NULL OR valid_until >= ?)
      AND (max_uses IS NULL OR COALESCE(used_count, 0) + COALESCE(reserved_count, 0) < max_uses)
    RETURNING id, document_id, code, discount_type, discount_value, max_uses,
              used_count, reserved_count, max_discount_amount, min_order_amount
    `,
    [discountCodeDocumentId, now, now]
  )

  const updatedRows = result.rows || result
  if (updatedRows.length === 0) {
    // Check why the update failed
    const discountCode = await knex("discount_codes")
      .where("document_id", discountCodeDocumentId)
      .first()

    if (!discountCode) {
      return { success: false, error: "Invalid discount code" }
    }

    if (!discountCode.is_active) {
      return { success: false, error: "This discount code is no longer active" }
    }

    const currentTime = new Date()
    if (discountCode.valid_from && new Date(discountCode.valid_from) > currentTime) {
      return { success: false, error: "This discount code is not yet active" }
    }
    if (discountCode.valid_until && new Date(discountCode.valid_until) < currentTime) {
      return { success: false, error: "This discount code has expired" }
    }

    // Must be usage limit
    return { success: false, error: "This discount code has reached its usage limit" }
  }

  const row = updatedRows[0]
  return {
    success: true,
    discountCode: {
      id: row.id,
      documentId: row.document_id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: Number.parseFloat(row.discount_value),
      maxUses: row.max_uses,
      usedCount: row.used_count || 0,
      reservedCount: row.reserved_count || 0,
      maxDiscountAmount: row.max_discount_amount
        ? Number.parseFloat(row.max_discount_amount)
        : null,
      minOrderAmount: row.min_order_amount ? Number.parseFloat(row.min_order_amount) : null,
    },
  }
}

/**
 * Atomically release a reserved discount code usage.
 * Decrements reserved_count, ensuring it doesn't go below 0.
 *
 * @param knex - Knex connection
 * @param discountCodeDocumentId - Document ID of the discount code
 */
async function atomicReleaseDiscountCode(
  knex: DatabaseConnection,
  discountCodeDocumentId: string
): Promise<void> {
  await knex.raw(
    `
    UPDATE discount_codes
    SET reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - 1)
    WHERE document_id = ?
    `,
    [discountCodeDocumentId]
  )
}

/**
 * Atomically confirm a discount code usage (move from reserved to used).
 * Increments used_count and decrements reserved_count in a single statement.
 *
 * @param knex - Knex connection
 * @param discountCodeDocumentId - Document ID of the discount code
 * @param hadReservation - Whether the order had a reservation
 */
async function atomicConfirmDiscountCode(
  knex: DatabaseConnection,
  discountCodeDocumentId: string,
  hadReservation: boolean
): Promise<void> {
  if (hadReservation) {
    // Move from reserved to used
    await knex.raw(
      `
      UPDATE discount_codes
      SET used_count = COALESCE(used_count, 0) + 1,
          reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - 1)
      WHERE document_id = ?
      `,
      [discountCodeDocumentId]
    )
  } else {
    // No reservation - just increment used (legacy or free orders)
    await knex.raw(
      `
      UPDATE discount_codes
      SET used_count = COALESCE(used_count, 0) + 1
      WHERE document_id = ?
      `,
      [discountCodeDocumentId]
    )
  }
}

/**
 * Reserve a discount code for an order.
 * Validates the code and atomically reserves one usage slot.
 *
 * @param strapi - Strapi instance
 * @param eventDocumentId - Document ID of the event
 * @param code - Discount code string
 * @param orderAmount - Total order amount for discount calculation
 * @returns Object with success flag, discount info, and calculated discount amount
 */
export async function reserveDiscountCode(
  strapi: Core.Strapi,
  eventDocumentId: string,
  code: string,
  orderAmount: number
): Promise<ReserveDiscountResult> {
  const knex = strapi.db.connection as DatabaseConnection

  // First find the discount code for this event (non-atomic, just for lookup)
  const discountCodeRecord = await knex("discount_codes")
    .join(
      "discount_codes_event_lnk",
      "discount_codes.id",
      "discount_codes_event_lnk.discount_code_id"
    )
    .join("events", "discount_codes_event_lnk.event_id", "events.id")
    .where(knex.raw("LOWER(discount_codes.code) = LOWER(?)", [code.trim()]))
    .where("events.document_id", eventDocumentId)
    .select("discount_codes.document_id")
    .first()

  if (!discountCodeRecord) {
    return { success: false, error: "Invalid discount code" }
  }

  // Atomically reserve the discount code
  const result = await atomicReserveDiscountCode(knex, discountCodeRecord.document_id)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const discountCode = result.discountCode!

  // Check minimum order amount
  if (discountCode.minOrderAmount && orderAmount < discountCode.minOrderAmount) {
    // Release the reservation since the order doesn't qualify
    await atomicReleaseDiscountCode(knex, discountCode.documentId)
    return {
      success: false,
      error: `Minimum order amount of ${discountCode.minOrderAmount} required for this code`,
    }
  }

  // Calculate discount amount
  let discountAmount: number
  if (discountCode.discountType === "percentage") {
    discountAmount = orderAmount * (discountCode.discountValue / 100)
    // Apply max discount cap if set
    if (discountCode.maxDiscountAmount && discountAmount > discountCode.maxDiscountAmount) {
      discountAmount = discountCode.maxDiscountAmount
    }
  } else {
    // Fixed amount - cannot exceed order amount
    discountAmount = Math.min(discountCode.discountValue, orderAmount)
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100

  strapi.log.info(
    `[Discount] Reserved discount code ${discountCode.code} ` +
      `(${discountCode.usedCount + discountCode.reservedCount}/${discountCode.maxUses || "unlimited"} uses)`
  )

  return {
    success: true,
    discountCode,
    discountAmount,
  }
}

/**
 * Confirm a discount code usage (called on payment success).
 * Moves the usage from reserved to used.
 *
 * @param strapi - Strapi instance
 * @param discountCodeDocumentId - Document ID of the discount code
 * @param hadReservation - Whether the order had an active reservation
 */
export async function confirmDiscountCode(
  strapi: Core.Strapi,
  discountCodeDocumentId: string,
  hadReservation: boolean
): Promise<void> {
  const knex = strapi.db.connection as DatabaseConnection
  await atomicConfirmDiscountCode(knex, discountCodeDocumentId, hadReservation)
  strapi.log.info(`[Discount] Confirmed discount code usage for ${discountCodeDocumentId}`)
}

/**
 * Release a reserved discount code usage (called on cancellation, expiry, or failure).
 *
 * @param strapi - Strapi instance
 * @param discountCodeDocumentId - Document ID of the discount code
 */
export async function releaseDiscountCode(
  strapi: Core.Strapi,
  discountCodeDocumentId: string
): Promise<void> {
  const knex = strapi.db.connection as DatabaseConnection
  await atomicReleaseDiscountCode(knex, discountCodeDocumentId)
  strapi.log.info(`[Discount] Released discount code reservation for ${discountCodeDocumentId}`)
}

/**
 * Atomically use a discount code for free orders (no reservation needed).
 * This is a single atomic operation that validates and increments used_count.
 *
 * @param strapi - Strapi instance
 * @param eventDocumentId - Document ID of the event
 * @param code - Discount code string
 * @param orderAmount - Total order amount for discount calculation
 * @returns Object with success flag, discount info, and calculated discount amount
 */
export async function useDiscountCodeAtomic(
  strapi: Core.Strapi,
  eventDocumentId: string,
  code: string,
  orderAmount: number
): Promise<ReserveDiscountResult> {
  const knex = strapi.db.connection as DatabaseConnection
  const now = new Date().toISOString()

  // First find the discount code for this event
  const discountCodeRecord = await knex("discount_codes")
    .join(
      "discount_codes_event_lnk",
      "discount_codes.id",
      "discount_codes_event_lnk.discount_code_id"
    )
    .join("events", "discount_codes_event_lnk.event_id", "events.id")
    .where(knex.raw("LOWER(discount_codes.code) = LOWER(?)", [code.trim()]))
    .where("events.document_id", eventDocumentId)
    .select("discount_codes.*")
    .first()

  if (!discountCodeRecord) {
    return { success: false, error: "Invalid discount code" }
  }

  // Check minimum order amount before attempting atomic use
  if (discountCodeRecord.min_order_amount && orderAmount < discountCodeRecord.min_order_amount) {
    return {
      success: false,
      error: `Minimum order amount of ${discountCodeRecord.min_order_amount} required for this code`,
    }
  }

  // Atomically increment used_count with validation
  const result = await knex.raw(
    `
    UPDATE discount_codes
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE document_id = ?
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= ?)
      AND (valid_until IS NULL OR valid_until >= ?)
      AND (max_uses IS NULL OR COALESCE(used_count, 0) + COALESCE(reserved_count, 0) < max_uses)
    RETURNING id, document_id, code, discount_type, discount_value, max_uses,
              used_count, reserved_count, max_discount_amount, min_order_amount
    `,
    [discountCodeRecord.document_id, now, now]
  )

  const updatedRows = result.rows || result
  if (updatedRows.length === 0) {
    // Validation failed - check reason
    if (!discountCodeRecord.is_active) {
      return { success: false, error: "This discount code is no longer active" }
    }

    const currentTime = new Date()
    if (discountCodeRecord.valid_from && new Date(discountCodeRecord.valid_from) > currentTime) {
      return { success: false, error: "This discount code is not yet active" }
    }
    if (discountCodeRecord.valid_until && new Date(discountCodeRecord.valid_until) < currentTime) {
      return { success: false, error: "This discount code has expired" }
    }

    return { success: false, error: "This discount code has reached its usage limit" }
  }

  const row = updatedRows[0]
  const discountCode: DiscountCodeInfo = {
    id: row.id,
    documentId: row.document_id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number.parseFloat(row.discount_value),
    maxUses: row.max_uses,
    usedCount: row.used_count || 0,
    reservedCount: row.reserved_count || 0,
    maxDiscountAmount: row.max_discount_amount ? Number.parseFloat(row.max_discount_amount) : null,
    minOrderAmount: row.min_order_amount ? Number.parseFloat(row.min_order_amount) : null,
  }

  // Calculate discount amount
  let discountAmount: number
  if (discountCode.discountType === "percentage") {
    discountAmount = orderAmount * (discountCode.discountValue / 100)
    if (discountCode.maxDiscountAmount && discountAmount > discountCode.maxDiscountAmount) {
      discountAmount = discountCode.maxDiscountAmount
    }
  } else {
    discountAmount = Math.min(discountCode.discountValue, orderAmount)
  }

  discountAmount = Math.round(discountAmount * 100) / 100

  strapi.log.info(
    `[Discount] Used discount code ${discountCode.code} ` +
      `(${discountCode.usedCount}/${discountCode.maxUses || "unlimited"} uses)`
  )

  return {
    success: true,
    discountCode,
    discountAmount,
  }
}
