"use server"

import { strapiFetch } from "@/libs/strapi-client"

// ============================================================================
// TYPES
// ============================================================================

export interface RevenueSummary {
  totalRevenue: number
  totalRefunded: number
  netRevenue: number
  totalOrders: number
  totalTickets: number
  averageOrderValue: number
  currency: string
}

export interface StatusBreakdown {
  pending: { count: number; amount: number }
  paid: { count: number; amount: number }
  cancelled: { count: number; amount: number }
  refunded: { count: number; amount: number }
  expired: { count: number; amount: number }
}

export interface TicketTypeRevenue {
  ticketTypeId: string
  ticketTypeName: string
  price: number
  quantity: number
  revenue: number
}

export interface TimelineDataPoint {
  date: string
  orders: number
  revenue: number
}

export interface DiscountUsage {
  totalDiscounted: number
  codesUsed: number
}

export interface RevenueAnalytics {
  summary: RevenueSummary
  byStatus: StatusBreakdown
  byTicketType: TicketTypeRevenue[]
  timeline: TimelineDataPoint[]
  discountUsage: DiscountUsage
}

// ============================================================================
// SERVER ACTION
// ============================================================================

/**
 * Get revenue analytics for an event
 * @param eventId - The event document ID
 */
export async function getRevenueAnalytics(eventId: string): Promise<RevenueAnalytics | null> {
  const result = await strapiFetch<{ data: RevenueAnalytics }>(
    "/admin/events/:eventId/revenue-analytics",
    { eventId },
    { cache: "no-store" }
  )

  if (!result.ok) {
    if (result.status !== 0) {
      console.error("[Revenue] Failed to fetch analytics:", result.status)
    } else {
      console.error("[Revenue] Error fetching analytics:", result.error)
    }
    return null
  }

  return result.data?.data || null
}
