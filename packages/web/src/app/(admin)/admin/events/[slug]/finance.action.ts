"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Types for finance management
export interface FinanceData {
  revenue: number
  expenses: number
  destination: string
}

export interface Finance {
  id?: number
  revenue: number
  expenses: number
  destination: string
  result: "Profit" | "Loss"
  resultAmount: number
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Update event finance data
 */
export async function updateEventFinance(
  slug: string,
  data: FinanceData
): Promise<ActionResult<Finance>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${slug}/finance`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to update finance data (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: responseData.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
