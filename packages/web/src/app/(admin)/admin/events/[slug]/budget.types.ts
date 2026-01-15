// Category type matching the API enum
export type BudgetCategory =
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

// Budget line item type
export interface BudgetLineItem {
  id?: number
  documentId?: string
  category: BudgetCategory
  name: string
  description?: string | null
  unitPrice: number
  quantity: number
  total: number
  sortOrder: number
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Category display info
export const BUDGET_CATEGORIES = {
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

export const INCOME_CATEGORIES: BudgetCategory[] = ["tickets", "sponsors", "other_income"]
export const EXPENSE_CATEGORIES: BudgetCategory[] = [
  "security",
  "insurance",
  "food",
  "goodies",
  "supplies",
  "venue",
  "organizer_expenses",
  "other_expense",
]

// Budget summary calculation result
export interface BudgetSummary {
  totalIncome: number
  totalExpenses: number
  margin: number
}

/**
 * Calculate budget summary from line items
 */
export function calculateBudgetSummary(items: BudgetLineItem[]): BudgetSummary {
  let totalIncome = 0
  let totalExpenses = 0

  for (const item of items) {
    if (INCOME_CATEGORIES.includes(item.category)) {
      totalIncome += item.total || 0
    } else if (EXPENSE_CATEGORIES.includes(item.category)) {
      totalExpenses += item.total || 0
    }
  }

  return {
    totalIncome,
    totalExpenses,
    margin: totalIncome - totalExpenses,
  }
}

/**
 * Group budget items by category
 */
export function groupBudgetItemsByCategory(
  items: BudgetLineItem[]
): Record<BudgetCategory, BudgetLineItem[]> {
  const grouped: Record<BudgetCategory, BudgetLineItem[]> = {} as Record<
    BudgetCategory,
    BudgetLineItem[]
  >
  for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
    grouped[cat] = items.filter((item) => item.category === cat)
  }
  return grouped
}

/**
 * Calculate category total from budget items
 */
export function calculateCategoryTotal(items: BudgetLineItem[], category: BudgetCategory): number {
  return items.filter((item) => item.category === category).reduce((sum, item) => sum + (item.total || 0), 0)
}
