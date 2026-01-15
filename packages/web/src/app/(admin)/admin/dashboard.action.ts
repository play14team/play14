"use server"

import { requirePlayer } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"

export interface DashboardStats {
  eventsOrganized: number
  eventsAttended: number
  ticketsPurchased: number
  pendingClaims: number
  upcomingEvents: number
}

export interface RecentActivity {
  type: "event" | "ticket" | "claim"
  title: string
  date: string
  link?: string
  status?: string
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  upcomingEvents: Array<{
    documentId: string
    slug: string
    name: string
    start: string
    location?: { name: string; country: string }
  }>
}

/**
 * Get dashboard data for the current user
 */
export async function getDashboardData(): Promise<DashboardData> {
  const { player } = await requirePlayer("/admin")

  // Fetch stats from the API
  const result = await strapiFetch<{ data: DashboardData }>(
    "/players/me/dashboard",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) {
    // Return empty data if API call fails
    return {
      stats: {
        eventsOrganized: 0,
        eventsAttended: 0,
        ticketsPurchased: 0,
        pendingClaims: 0,
        upcomingEvents: 0,
      },
      recentActivity: [],
      upcomingEvents: [],
    }
  }

  return result.data.data
}
