// Category type matching the API enum (same as budget)
export type ResultCategory =
  | "tickets"
  | "sponsors"
  | "other_income"
  | "security"
  | "insurance"
  | "food"
  | "goodies"
  | "supplies"
  | "venue"
  | "organizer_expenses"
  | "other_expense"

// Result line item type
export interface ResultLineItem {
  id?: number
  documentId?: string
  category: ResultCategory
  name: string
  description?: string | null
  amount: number
  sortOrder: number
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Category display info (reuse same as budget)
export const RESULT_CATEGORIES = {
  // Income categories
  tickets: { label: "Tickets", type: "income" as const, icon: "bx-ticket" },
  sponsors: { label: "Sponsors", type: "income" as const, icon: "bx-gift" },
  other_income: { label: "Other Income", type: "income" as const, icon: "bx-plus-circle" },
  // Expense categories
  security: { label: "Security", type: "expense" as const, icon: "bx-shield" },
  insurance: { label: "Insurance", type: "expense" as const, icon: "bx-check-shield" },
  food: { label: "Food & Drinks", type: "expense" as const, icon: "bx-restaurant" },
  goodies: { label: "Goodies", type: "expense" as const, icon: "bx-gift" },
  supplies: { label: "Supplies", type: "expense" as const, icon: "bx-box" },
  venue: { label: "Venue", type: "expense" as const, icon: "bx-building" },
  organizer_expenses: { label: "Organizer Expenses", type: "expense" as const, icon: "bx-user" },
  other_expense: { label: "Other Expenses", type: "expense" as const, icon: "bx-minus-circle" },
} as const

export const INCOME_CATEGORIES: ResultCategory[] = ["tickets", "sponsors", "other_income"]
export const EXPENSE_CATEGORIES: ResultCategory[] = [
  "security",
  "insurance",
  "food",
  "goodies",
  "supplies",
  "venue",
  "organizer_expenses",
  "other_expense",
]

// Results summary calculation result
export interface ResultsSummary {
  totalIncome: number
  totalExpenses: number
  result: number
}

// Results summary with budget comparison
export interface ResultsSummaryWithBudget extends ResultsSummary {
  budgetIncome: number
  budgetExpenses: number
  budgetResult: number
  incomeVariance: number
  expenseVariance: number
  resultVariance: number
}

/**
 * Calculate results summary from line items
 * @param items - Result line items
 * @param ticketRevenue - Revenue from ticket sales (calculated separately)
 */
export function calculateResultsSummary(
  items: ResultLineItem[],
  ticketRevenue = 0
): ResultsSummary {
  let manualIncome = 0
  let totalExpenses = 0

  for (const item of items) {
    if (INCOME_CATEGORIES.includes(item.category)) {
      manualIncome += item.amount || 0
    } else if (EXPENSE_CATEGORIES.includes(item.category)) {
      totalExpenses += item.amount || 0
    }
  }

  // Total income includes ticket revenue
  const totalIncome = ticketRevenue + manualIncome

  return {
    totalIncome,
    totalExpenses,
    result: totalIncome - totalExpenses,
  }
}

/**
 * Group result items by category
 */
export function groupResultItemsByCategory(
  items: ResultLineItem[]
): Record<ResultCategory, ResultLineItem[]> {
  const grouped: Record<ResultCategory, ResultLineItem[]> = {} as Record<
    ResultCategory,
    ResultLineItem[]
  >
  for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
    grouped[cat] = items.filter((item) => item.category === cat)
  }
  return grouped
}

/**
 * Calculate category total from result items
 * @param items - Result line items
 * @param category - Category to calculate total for
 * @param ticketRevenue - For tickets category, includes ticket revenue
 */
export function calculateResultCategoryTotal(
  items: ResultLineItem[],
  category: ResultCategory,
  ticketRevenue = 0
): number {
  const manualTotal = items
    .filter((item) => item.category === category)
    .reduce((sum, item) => sum + (item.amount || 0), 0)

  // For tickets category, include ticket revenue
  if (category === "tickets") {
    return ticketRevenue + manualTotal
  }

  return manualTotal
}
