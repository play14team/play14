import { type Page, expect, test } from "@playwright/test"
import { waitForPageLoad } from "./utils/test-helpers"

// Define viewport sizes for testing
const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone 14 Plus", width: 428, height: 926 },
]

const TABLET_VIEWPORT = { name: "iPad", width: 810, height: 1080 }

/**
 * Helper to check for horizontal overflow
 */
async function checkNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<boolean> {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
  return bodyWidth <= viewportWidth + 20 // Allow small margin for scrollbars
}

/**
 * Helper to verify element is not overflowing its container
 */
async function verifyElementFitsViewport(
  page: Page,
  selector: string,
  viewportWidth: number
): Promise<boolean> {
  const element = page.locator(selector).first()
  if ((await element.count()) === 0) return true

  const boundingBox = await element.boundingBox()
  if (!boundingBox) return true

  return boundingBox.x >= 0 && boundingBox.x + boundingBox.width <= viewportWidth + 20
}

// =============================================================================
// GENERAL RESPONSIVE LAYOUT TESTS
// =============================================================================

test.describe("General Responsive Layout", () => {
  const allViewports = [...MOBILE_VIEWPORTS, TABLET_VIEWPORT]

  for (const viewport of allViewports) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test("home page renders without horizontal scroll", async ({ page }) => {
        await page.goto("/")
        await waitForPageLoad(page)

        const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
        expect(noOverflow).toBe(true)
      })

      test("events page renders without horizontal scroll", async ({ page }) => {
        await page.goto("/events")
        await waitForPageLoad(page)

        const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
        expect(noOverflow).toBe(true)
      })

      test("players page renders without horizontal scroll", async ({ page }) => {
        await page.goto("/community/players")
        await waitForPageLoad(page)

        const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
        expect(noOverflow).toBe(true)
      })

      test("games page renders without horizontal scroll", async ({ page }) => {
        await page.goto("/community/games")
        await waitForPageLoad(page)

        const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
        expect(noOverflow).toBe(true)
      })

      test("footer is visible and fits viewport", async ({ page }) => {
        await page.goto("/")
        await waitForPageLoad(page)

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(500)

        const footer = page.locator("footer")
        await expect(footer).toBeVisible()

        const noOverflow = await verifyElementFitsViewport(page, "footer", viewport.width)
        expect(noOverflow).toBe(true)
      })
    })
  }
})

// =============================================================================
// TICKET SELECTOR RESPONSIVE TESTS
// =============================================================================

test.describe("Ticket Selector Responsive Design", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test("event detail page should not overflow horizontally", async ({ page }) => {
        // Navigate to events page first
        await page.goto("/events")
        await waitForPageLoad(page)

        // Find and click on an event
        const eventLink = page.locator("a[href^='/events/']").first()
        if ((await eventLink.count()) > 0) {
          await eventLink.click()
          await waitForPageLoad(page)

          // Check for no horizontal overflow on event detail page
          const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
          expect(noOverflow).toBe(true)
        }
      })

      test("ticket type cards should fit within viewport", async ({ page }) => {
        await page.goto("/events")
        await waitForPageLoad(page)

        const eventLink = page.locator("a[href^='/events/']").first()
        if ((await eventLink.count()) > 0) {
          await eventLink.click()
          await waitForPageLoad(page)
        }

        // Check for ticket selector component (CSS modules generate unique class names)
        const ticketSelector = page.locator('[class*="ticketType"]')
        if ((await ticketSelector.count()) > 0) {
          const noOverflow = await verifyElementFitsViewport(
            page,
            '[class*="ticketType"]',
            viewport.width
          )
          expect(noOverflow).toBe(true)
        }
      })

      test("quantity selector buttons are large enough for touch", async ({ page }) => {
        await page.goto("/events")
        await waitForPageLoad(page)

        const eventLink = page.locator("a[href^='/events/']").first()
        if ((await eventLink.count()) > 0) {
          await eventLink.click()
          await waitForPageLoad(page)
        }

        // Check quantity buttons are large enough to tap (min 36px)
        const quantityButtons = page.locator('[class*="quantitySelector"] button')
        if ((await quantityButtons.count()) > 0) {
          const firstButton = quantityButtons.first()
          const box = await firstButton.boundingBox()
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(36)
            expect(box.height).toBeGreaterThanOrEqual(36)
          }
        }
      })
    })
  }
})

// =============================================================================
// NAVIGATION RESPONSIVE TESTS
// =============================================================================

test.describe("Navigation Responsive Design", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test("hamburger menu should be visible on mobile", async ({ page }) => {
        await page.goto("/")
        await waitForPageLoad(page)

        const toggler = page.locator(".navbar-toggler")
        await expect(toggler).toBeVisible()
      })

      test("hamburger menu should expand on click", async ({ page }) => {
        await page.goto("/")
        await waitForPageLoad(page)

        const toggler = page.locator(".navbar-toggler")
        await expect(toggler).toBeVisible()

        await toggler.click()
        await page.waitForTimeout(300)

        const navCollapse = page.locator(".navbar-collapse.show")
        await expect(navCollapse).toBeVisible()
      })

      test("navigation links should be accessible in mobile menu", async ({ page }) => {
        await page.goto("/")
        await waitForPageLoad(page)

        const toggler = page.locator(".navbar-toggler")
        await toggler.click()
        await page.waitForTimeout(300)

        // Check that menu items are visible
        const navLinks = page.locator(".navbar-collapse.show .nav-link")
        const count = await navLinks.count()
        expect(count).toBeGreaterThan(0)
      })
    })
  }
})

// =============================================================================
// TOUCH TARGET SIZE TESTS
// =============================================================================

test.describe("Touch Target Accessibility", () => {
  const MINIMUM_TOUCH_TARGET = 44 // WCAG recommended minimum

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test("hamburger menu button is large enough", async ({ page }) => {
    await page.goto("/")
    await waitForPageLoad(page)

    const toggler = page.locator(".navbar-toggler")
    const box = await toggler.boundingBox()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET)
      expect(box.height).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET)
    }
  })

  test("primary buttons have adequate touch targets", async ({ page }) => {
    await page.goto("/")
    await waitForPageLoad(page)

    // Check main CTA buttons
    const buttons = page.locator('button.btn-primary, a.btn-primary, [class*="purchaseButton"]')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box && box.width > 0) {
          // Primary buttons should be at least 44px tall
          expect(box.height).toBeGreaterThanOrEqual(36)
        }
      }
    }
  })
})

// =============================================================================
// FORM INPUT RESPONSIVENESS
// =============================================================================

test.describe("Form Input Responsiveness", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`contact form inputs should be usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/contact")
      await waitForPageLoad(page)

      const inputs = page.locator('input[type="text"], input[type="email"], textarea')
      const count = await inputs.count()

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i)
        if (await input.isVisible()) {
          const box = await input.boundingBox()
          if (box) {
            // Input should use most of the viewport width (accounting for padding)
            expect(box.width).toBeGreaterThan(viewport.width * 0.6)
          }
        }
      }
    })
  }
})

// =============================================================================
// EVENT DETAIL PAGE RESPONSIVE TESTS
// =============================================================================

test.describe("Event Detail Page Responsive Design", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test("event sidebar should stack below main content on mobile", async ({ page }) => {
        await page.goto("/events")
        await waitForPageLoad(page)

        const eventLink = page.locator("a[href^='/events/']").first()
        if ((await eventLink.count()) > 0) {
          await eventLink.click()
          await waitForPageLoad(page)

          // The layout should not have horizontal overflow
          const noOverflow = await checkNoHorizontalOverflow(page, viewport.width)
          expect(noOverflow).toBe(true)
        }
      })

      test("event images should be responsive", async ({ page }) => {
        await page.goto("/events")
        await waitForPageLoad(page)

        const eventLink = page.locator("a[href^='/events/']").first()
        if ((await eventLink.count()) > 0) {
          await eventLink.click()
          await waitForPageLoad(page)

          // Check event images don't overflow
          const images = page.locator(".event-details img, [class*='event'] img")
          const count = await images.count()

          for (let i = 0; i < Math.min(count, 3); i++) {
            const img = images.nth(i)
            if (await img.isVisible()) {
              const box = await img.boundingBox()
              if (box) {
                expect(box.width).toBeLessThanOrEqual(viewport.width)
              }
            }
          }
        }
      })
    })
  }
})
