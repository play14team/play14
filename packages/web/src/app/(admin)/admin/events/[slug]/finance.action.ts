"use server"

import { strapiFetch } from "@/libs/strapi-client"

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

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Update event finance data
 */
export async function updateEventFinance(
  slug: string,
  data: FinanceData
): Promise<ActionResult<Finance>> {
  const result = await strapiFetch<StrapiDataResponse<Finance>>(
    "/admin/events/:slug/finance",
    { slug },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update finance data",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
