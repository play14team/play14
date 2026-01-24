import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration for play14-web
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { open: "never" }], ["list"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers and devices */
  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Mobile devices
    {
      name: "mobile-iphone-se",
      use: { ...devices["iPhone SE"] }, // 375x667
    },
    {
      name: "mobile-iphone-14",
      use: { ...devices["iPhone 14"] }, // 390x844
    },
    {
      name: "mobile-pixel-5",
      use: { ...devices["Pixel 5"] }, // 393x851
    },

    // Tablet
    {
      name: "tablet-ipad",
      use: { ...devices["iPad (gen 7)"] }, // 810x1080
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
