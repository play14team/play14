/**
 * Unit tests for results calculation utilities
 */

import { describe, expect, it } from "vitest"
import {
  calculateResultCategoryTotal,
  calculateResultsSummary,
  EXPENSE_CATEGORIES,
  groupResultItemsByCategory,
  INCOME_CATEGORIES,
  type ResultCategory,
  type ResultLineItem,
} from "./results.types"

// Helper to create a result line item
function createResultItem(
  category: ResultCategory,
  amount: number,
  name = "Test Item"
): ResultLineItem {
  return {
    id: Math.random(),
    documentId: `doc-${Math.random()}`,
    category,
    name,
    description: null,
    amount,
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

describe("calculateResultsSummary", () => {
  it("returns zeros for empty items and no ticket revenue", () => {
    const summary = calculateResultsSummary([])

    expect(summary.totalIncome).toBe(0)
    expect(summary.totalExpenses).toBe(0)
    expect(summary.result).toBe(0)
  })

  it("includes ticket revenue in total income", () => {
    const summary = calculateResultsSummary([], 1500)

    expect(summary.totalIncome).toBe(1500)
    expect(summary.totalExpenses).toBe(0)
    expect(summary.result).toBe(1500)
  })

  it("calculates total income from manual income items", () => {
    const items: ResultLineItem[] = [
      createResultItem("sponsors", 500),
      createResultItem("other_income", 200),
    ]

    const summary = calculateResultsSummary(items)

    expect(summary.totalIncome).toBe(700)
    expect(summary.totalExpenses).toBe(0)
    expect(summary.result).toBe(700)
  })

  it("combines ticket revenue with manual income", () => {
    const items: ResultLineItem[] = [
      createResultItem("tickets", 100), // Manual ticket adjustment
      createResultItem("sponsors", 500),
    ]

    const summary = calculateResultsSummary(items, 2000)

    // Total income = ticket revenue (2000) + manual income (100 + 500)
    expect(summary.totalIncome).toBe(2600)
    expect(summary.result).toBe(2600)
  })

  it("calculates total expenses from expense categories", () => {
    const items: ResultLineItem[] = [
      createResultItem("security", 300),
      createResultItem("food", 500),
      createResultItem("venue", 800),
    ]

    const summary = calculateResultsSummary(items)

    expect(summary.totalIncome).toBe(0)
    expect(summary.totalExpenses).toBe(1600)
    expect(summary.result).toBe(-1600)
  })

  it("calculates positive result (profit) when income exceeds expenses", () => {
    const items: ResultLineItem[] = [
      createResultItem("sponsors", 1000),
      createResultItem("food", 800),
      createResultItem("venue", 500),
    ]

    const summary = calculateResultsSummary(items, 2000)

    expect(summary.totalIncome).toBe(3000) // 2000 ticket + 1000 sponsors
    expect(summary.totalExpenses).toBe(1300)
    expect(summary.result).toBe(1700)
  })

  it("calculates negative result (loss) when expenses exceed income", () => {
    const items: ResultLineItem[] = [
      createResultItem("food", 800),
      createResultItem("venue", 600),
      createResultItem("goodies", 400),
    ]

    const summary = calculateResultsSummary(items, 500)

    expect(summary.totalIncome).toBe(500)
    expect(summary.totalExpenses).toBe(1800)
    expect(summary.result).toBe(-1300)
  })

  it("handles items with undefined/null amounts", () => {
    const items: ResultLineItem[] = [
      { ...createResultItem("sponsors", 100), amount: undefined as any },
      createResultItem("sponsors", 200),
      { ...createResultItem("food", 50), amount: null as any },
    ]

    const summary = calculateResultsSummary(items)

    expect(summary.totalIncome).toBe(200)
    expect(summary.totalExpenses).toBe(0)
  })

  it("handles all expense categories", () => {
    const items: ResultLineItem[] = [
      createResultItem("security", 100),
      createResultItem("insurance", 100),
      createResultItem("food", 100),
      createResultItem("goodies", 100),
      createResultItem("supplies", 100),
      createResultItem("venue", 100),
      createResultItem("organizer_expenses", 100),
      createResultItem("other_expense", 100),
    ]

    const summary = calculateResultsSummary(items)

    expect(summary.totalExpenses).toBe(800)
  })

  it("defaults ticketRevenue to 0 when not provided", () => {
    const items: ResultLineItem[] = [createResultItem("sponsors", 500)]

    const summary = calculateResultsSummary(items)

    expect(summary.totalIncome).toBe(500)
  })
})

describe("groupResultItemsByCategory", () => {
  it("returns empty arrays for all categories when no items", () => {
    const grouped = groupResultItemsByCategory([])

    for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      expect(grouped[cat]).toEqual([])
    }
  })

  it("groups items by their category", () => {
    const sponsorItem1 = createResultItem("sponsors", 100, "Sponsor 1")
    const sponsorItem2 = createResultItem("sponsors", 200, "Sponsor 2")
    const foodItem = createResultItem("food", 300, "Food")

    const grouped = groupResultItemsByCategory([sponsorItem1, sponsorItem2, foodItem])

    expect(grouped.sponsors).toHaveLength(2)
    expect(grouped.sponsors).toContain(sponsorItem1)
    expect(grouped.sponsors).toContain(sponsorItem2)
    expect(grouped.food).toHaveLength(1)
    expect(grouped.food).toContain(foodItem)
    expect(grouped.tickets).toHaveLength(0)
  })

  it("preserves all item properties", () => {
    const item: ResultLineItem = {
      id: 123,
      documentId: "doc-123",
      category: "venue",
      name: "Conference Room",
      description: "Main venue rental",
      amount: 1000,
      sortOrder: 1,
    }

    const grouped = groupResultItemsByCategory([item])

    expect(grouped.venue[0]).toEqual(item)
  })
})

describe("calculateResultCategoryTotal", () => {
  it("returns 0 for empty items", () => {
    const total = calculateResultCategoryTotal([], "sponsors")

    expect(total).toBe(0)
  })

  it("sums amounts for matching category only", () => {
    const items: ResultLineItem[] = [
      createResultItem("sponsors", 100),
      createResultItem("sponsors", 200),
      createResultItem("food", 500),
    ]

    const sponsorTotal = calculateResultCategoryTotal(items, "sponsors")
    const foodTotal = calculateResultCategoryTotal(items, "food")

    expect(sponsorTotal).toBe(300)
    expect(foodTotal).toBe(500)
  })

  it("returns 0 when no items match category", () => {
    const items: ResultLineItem[] = [
      createResultItem("sponsors", 100),
      createResultItem("food", 200),
    ]

    const total = calculateResultCategoryTotal(items, "venue")

    expect(total).toBe(0)
  })

  it("includes ticket revenue for tickets category", () => {
    const items: ResultLineItem[] = [
      createResultItem("tickets", 50), // Manual adjustment
    ]

    const total = calculateResultCategoryTotal(items, "tickets", 1500)

    expect(total).toBe(1550) // 1500 ticket revenue + 50 manual
  })

  it("does not include ticket revenue for non-tickets categories", () => {
    const items: ResultLineItem[] = [createResultItem("sponsors", 500)]

    const total = calculateResultCategoryTotal(items, "sponsors", 1500)

    expect(total).toBe(500) // Only manual sponsor amount, not ticket revenue
  })

  it("handles undefined/null amounts", () => {
    const items: ResultLineItem[] = [
      createResultItem("food", 100),
      { ...createResultItem("food", 50), amount: undefined as any },
      { ...createResultItem("food", 30), amount: null as any },
    ]

    const total = calculateResultCategoryTotal(items, "food")

    expect(total).toBe(100)
  })

  it("returns only ticket revenue when no manual ticket items", () => {
    const total = calculateResultCategoryTotal([], "tickets", 2000)

    expect(total).toBe(2000)
  })
})
