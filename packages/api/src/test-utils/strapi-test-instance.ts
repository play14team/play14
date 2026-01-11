/**
 * Strapi test instance manager for integration tests
 *
 * Provides lifecycle management for a real Strapi instance
 * configured with PostgreSQL test database for integration testing.
 *
 * Requires the test database container to be running:
 *   podman-compose up play14-db-test
 */

import type { Core } from "@strapi/strapi"
import { resolve } from "path"

let strapiInstance: Core.Strapi | null = null

/**
 * Setup a Strapi test instance with test configuration
 *
 * This creates a real Strapi instance with:
 * - PostgreSQL test database (play14-db-test container on port 5433)
 * - Mock payment provider (automatically used when NODE_ENV=test)
 * - Full server mounted and ready for HTTP requests
 *
 * Prerequisites:
 * - Test database container running: `podman-compose up play14-db-test`
 */
export async function setupStrapiTestInstance(): Promise<Core.Strapi> {
  if (strapiInstance) {
    return strapiInstance
  }

  // Set test environment - must be set before Strapi loads
  process.env.NODE_ENV = "test"

  // PostgreSQL test database configuration
  // Respects environment variables if already set (e.g., by CI), otherwise uses defaults
  // CI sets DATABASE_* directly, local dev can use TEST_DATABASE_* for overrides
  process.env.DATABASE_CLIENT = "postgres"
  process.env.DATABASE_HOST = process.env.DATABASE_HOST || process.env.TEST_DATABASE_HOST || "localhost"
  process.env.DATABASE_PORT = process.env.DATABASE_PORT || process.env.TEST_DATABASE_PORT || "5433"
  process.env.DATABASE_NAME = process.env.DATABASE_NAME || process.env.TEST_DATABASE_NAME || "play14_test"
  process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || process.env.TEST_DATABASE_USERNAME || "test_user"
  process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || process.env.TEST_DATABASE_PASSWORD || "test_password"
  process.env.DATABASE_SCHEMA = process.env.DATABASE_SCHEMA || "public"
  process.env.DATABASE_SSL = process.env.DATABASE_SSL || "false"

  // Stripe environment variables (used by mock provider detection)
  // The actual Stripe SDK won't be used since NODE_ENV=test triggers mock provider
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_key_for_testing"
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_testing"
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_mock_key_for_testing"
  process.env.STRIPE_PLATFORM_FEE_PERCENT = "0"

  // Frontend URL for redirects
  process.env.FRONTEND_URL = "http://localhost:3000"

  // Disable email sending in tests
  process.env.RESEND_API_KEY = "re_test_mock"

  // Disable cron jobs in tests
  process.env.CRON_ENABLED = "false"

  // Dynamic import of Strapi
  // For TypeScript projects, we need distDir for compiled controllers/routes
  // The global setup ensures Strapi is built before tests run
  const { createStrapi } = await import("@strapi/strapi")

  const appDir = process.cwd()
  strapiInstance = await createStrapi({
    appDir,
    distDir: resolve(appDir, "dist"),
  }).load()

  // Mount the server for HTTP requests
  await strapiInstance.server.mount()

  return strapiInstance
}

/**
 * Teardown the Strapi test instance
 *
 * Note: With sequential test execution (fileParallelism: false), we don't actually
 * destroy Strapi here to allow subsequent test files to reuse the same instance.
 * The process exit will handle cleanup. Only call this if you need to force cleanup.
 */
export async function teardownStrapiTestInstance(): Promise<void> {
  // Don't destroy - let other test files reuse the instance
  // The singleton pattern in setupStrapiTestInstance will return the existing instance
  // Strapi will be cleaned up when the process exits
}

/**
 * Force teardown the Strapi test instance
 *
 * Use this only when you need to explicitly destroy the instance,
 * such as in a global teardown or when testing Strapi lifecycle.
 */
export async function forceDestroyStrapi(): Promise<void> {
  if (strapiInstance) {
    await strapiInstance.destroy()
    strapiInstance = null
  }
}

/**
 * Get the current Strapi instance
 *
 * @throws Error if instance not initialized
 */
export function getStrapiInstance(): Core.Strapi {
  if (!strapiInstance) {
    throw new Error("Strapi instance not initialized. Call setupStrapiTestInstance first.")
  }
  return strapiInstance
}

/**
 * Check if Strapi instance is initialized
 */
export function isStrapiInstanceReady(): boolean {
  return strapiInstance !== null
}

/**
 * Get the HTTP server for supertest requests
 */
export function getHttpServer() {
  const strapi = getStrapiInstance()
  return strapi.server.httpServer
}
