/**
 * Unit tests for budget calculation utilities
 */

import { describe, expect, it } from "vitest"
import {
  type BudgetCategory,
  type BudgetLineItem,
  calculateBudgetSummary,
  calculateCategoryTotal,
  EXPENSE_CATEGORIES,
  groupBudgetItemsByCategory,
  INCOME_CATEGORIES,
} from "./budget.types"

// Helper to create a budget line item
function createBudgetItem(
  category: BudgetCategory,
  total: number,
  name = "Test Item"
): BudgetLineItem {
  return {
    id: Math.random(),
    documentId: `doc-${Math.random()}`,
    category,
    name,
    description: null,
    unitPrice: total,
    quantity: 1,
    total,
    sortOrder: 0,
  }
}

describe("INCOME_CATEGORIES", () => {
  it("contains correct income categories", () => {
    expect(INCOME_CATEGORIES).toContain("tickets")
    expect(INCOME_CATEGORIES).toContain("sponsors")
    expect(INCOME_CATEGORIES).toContain("other_income")
    expect(INCOME_CATEGORIES).toHaveLength(3)
  })
})

describe("EXPENSE_CATEGORIES", () => {
  it("contains correct expense categories", () => {
    expect(EXPENSE_CATEGORIES).toContain("security")
    expect(EXPENSE_CATEGORIES).toContain("insurance")
    expect(EXPENSE_CATEGORIES).toContain("food")
    expect(EXPENSE_CATEGORIES).toContain("goodies")
    expect(EXPENSE_CATEGORIES).toContain("supplies")
    expect(EXPENSE_CATEGORIES).toContain("venue")
    expect(EXPENSE_CATEGORIES).toContain("organizer_expenses")
    expect(EXPENSE_CATEGORIES).toContain("other_expense")
    expect(EXPENSE_CATEGORIES).toHaveLength(8)
  })
})

describe("calculateBudgetSummary", () => {
  it("returns zeros for empty items", () => {
    const summary = calculateBudgetSummary([])

    expect(summary.totalIncome).toBe(0)
    expect(summary.totalExpenses).toBe(0)
    expect(summary.margin).toBe(0)
  })

  it("calculates total income from income categories", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("tickets", 1000),
      createBudgetItem("sponsors", 500),
      createBudgetItem("other_income", 200),
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalIncome).toBe(1700)
    expect(summary.totalExpenses).toBe(0)
    expect(summary.margin).toBe(1700)
  })

  it("calculates total expenses from expense categories", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("security", 300),
      createBudgetItem("food", 500),
      createBudgetItem("venue", 800),
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalIncome).toBe(0)
    expect(summary.totalExpenses).toBe(1600)
    expect(summary.margin).toBe(-1600)
  })

  it("calculates positive margin when income exceeds expenses", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("tickets", 2000),
      createBudgetItem("sponsors", 1000),
      createBudgetItem("food", 800),
      createBudgetItem("venue", 500),
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalIncome).toBe(3000)
    expect(summary.totalExpenses).toBe(1300)
    expect(summary.margin).toBe(1700)
  })

  it("calculates negative margin when expenses exceed income", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("tickets", 500),
      createBudgetItem("food", 800),
      createBudgetItem("venue", 600),
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalIncome).toBe(500)
    expect(summary.totalExpenses).toBe(1400)
    expect(summary.margin).toBe(-900)
  })

  it("handles items with undefined/null totals", () => {
    const items: BudgetLineItem[] = [
      { ...createBudgetItem("tickets", 100), total: undefined as any },
      createBudgetItem("sponsors", 200),
      { ...createBudgetItem("food", 50), total: null as any },
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalIncome).toBe(200)
    expect(summary.totalExpenses).toBe(0)
  })

  it("handles all expense categories", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("security", 100),
      createBudgetItem("insurance", 100),
      createBudgetItem("food", 100),
      createBudgetItem("goodies", 100),
      createBudgetItem("supplies", 100),
      createBudgetItem("venue", 100),
      createBudgetItem("organizer_expenses", 100),
      createBudgetItem("other_expense", 100),
    ]

    const summary = calculateBudgetSummary(items)

    expect(summary.totalExpenses).toBe(800)
  })
})

describe("groupBudgetItemsByCategory", () => {
  it("returns empty arrays for all categories when no items", () => {
    const grouped = groupBudgetItemsByCategory([])

    for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      expect(grouped[cat]).toEqual([])
    }
  })

  it("groups items by their category", () => {
    const ticketItem1 = createBudgetItem("tickets", 100, "Ticket 1")
    const ticketItem2 = createBudgetItem("tickets", 200, "Ticket 2")
    const foodItem = createBudgetItem("food", 300, "Food")

    const grouped = groupBudgetItemsByCategory([ticketItem1, ticketItem2, foodItem])

    expect(grouped.tickets).toHaveLength(2)
    expect(grouped.tickets).toContain(ticketItem1)
    expect(grouped.tickets).toContain(ticketItem2)
    expect(grouped.food).toHaveLength(1)
    expect(grouped.food).toContain(foodItem)
    expect(grouped.sponsors).toHaveLength(0)
  })

  it("preserves all item properties", () => {
    const item: BudgetLineItem = {
      id: 123,
      documentId: "doc-123",
      category: "venue",
      name: "Conference Room",
      description: "Main venue rental",
      unitPrice: 500,
      quantity: 2,
      total: 1000,
      sortOrder: 1,
    }

    const grouped = groupBudgetItemsByCategory([item])

    expect(grouped.venue[0]).toEqual(item)
  })
})

describe("calculateCategoryTotal", () => {
  it("returns 0 for empty items", () => {
    const total = calculateCategoryTotal([], "tickets")

    expect(total).toBe(0)
  })

  it("sums totals for matching category only", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("tickets", 100),
      createBudgetItem("tickets", 200),
      createBudgetItem("sponsors", 500),
    ]

    const ticketTotal = calculateCategoryTotal(items, "tickets")
    const sponsorTotal = calculateCategoryTotal(items, "sponsors")

    expect(ticketTotal).toBe(300)
    expect(sponsorTotal).toBe(500)
  })

  it("returns 0 when no items match category", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("tickets", 100),
      createBudgetItem("food", 200),
    ]

    const total = calculateCategoryTotal(items, "sponsors")

    expect(total).toBe(0)
  })

  it("handles undefined/null totals", () => {
    const items: BudgetLineItem[] = [
      createBudgetItem("food", 100),
      { ...createBudgetItem("food", 50), total: undefined as any },
      { ...createBudgetItem("food", 30), total: null as any },
    ]

    const total = calculateCategoryTotal(items, "food")

    expect(total).toBe(100)
  })
})
