/**
 * Global setup for integration tests
 *
 * This file is run once before all integration tests start.
 * It initializes the Strapi instance and sets up the test environment.
 */

import { rm, stat } from "fs/promises"
import { resolve } from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function setup() {
  console.log("\n🚀 Starting integration test setup...")

  // Set NODE_ENV early for Strapi config loading
  process.env.NODE_ENV = "test"

  // When running from packages/api, process.cwd() is already the API directory
  const apiDir = process.cwd()
  const distDir = resolve(apiDir, "dist")

  // Check if we need to build Strapi (TypeScript compilation)
  try {
    await stat(resolve(distDir, "src"))
    console.log("  ✓ Strapi dist found, skipping build")
  } catch {
    console.log("  ⚙ Building Strapi (TypeScript compilation)...")
    try {
      await execAsync("bun run strapi build", { cwd: apiDir })
      console.log("  ✓ Strapi build complete")
    } catch (error) {
      console.error("  ✗ Strapi build failed:", error)
      throw error
    }
  }

  // Clean up any existing test database
  const testDbPath = resolve(apiDir, ".tmp/test.db")
  try {
    await rm(testDbPath, { force: true })
    console.log("  ✓ Cleaned up existing test database")
  } catch {
    // File doesn't exist, which is fine
  }

  console.log("  ✓ Integration test setup complete\n")
}

export async function teardown() {
  console.log("\n🧹 Running integration test teardown...")

  // Optionally clean up test database after all tests
  // Keeping it can be useful for debugging failed tests
  // const testDbPath = resolve(process.cwd(), "packages/api/.tmp/test.db")
  // await rm(testDbPath, { force: true })

  console.log("  ✓ Integration test teardown complete\n")
}
