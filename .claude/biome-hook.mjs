#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import path from "node:path"

// Try to get the filename from different sources
const filename = process.env.CLAUDE_FILENAME || process.argv[2]

// Extensions that Biome can lint/format
const lintableExtensions = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".json", ".jsonc"]

// Extensions that require TypeScript checking
const typescriptExtensions = [".ts", ".tsx"]

// Track which packages need TypeScript checking
const packagesNeedingTsCheck = new Set()

/**
 * Determine which package a file belongs to and add to check set
 */
function trackPackageForTsCheck(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!typescriptExtensions.includes(ext)) return

  // Determine package from path
  if (filePath.includes("packages/api/")) {
    packagesNeedingTsCheck.add("packages/api")
  } else if (filePath.includes("packages/web/")) {
    packagesNeedingTsCheck.add("packages/web")
  }
}

/**
 * Run TypeScript check on packages that had TS files modified
 */
function runTypeScriptChecks() {
  for (const pkg of packagesNeedingTsCheck) {
    try {
      console.log(`Running TypeScript check on ${pkg}...`)
      execFileSync("bunx", ["tsc", "--noEmit"], {
        stdio: "inherit",
        cwd: path.join(process.cwd(), pkg),
      })
      console.log(`✓ TypeScript check passed for ${pkg}`)
    } catch {
      console.error(`✗ TypeScript errors found in ${pkg}`)
      // Don't exit - let the user see all errors
    }
  }
}

if (!filename) {
  // Run Biome on all modified files instead
  try {
    // Get list of unstaged modified files from git (after Edit/Write operations)
    const result = execFileSync("git", ["diff", "--name-only"], { encoding: "utf-8" })
    const modifiedFiles = result
      .trim()
      .split("\n")
      .filter((file) => {
        if (!file) return false
        const ext = path.extname(file).toLowerCase()
        return lintableExtensions.includes(ext)
      })

    if (modifiedFiles.length > 0) {
      console.log(`Running Biome on ${modifiedFiles.length} modified file(s)...`)
      for (const file of modifiedFiles) {
        // Track packages that need TypeScript checking
        trackPackageForTsCheck(file)

        try {
          execFileSync("bunx", ["biome", "check", "--write", file], {
            stdio: "inherit",
            cwd: process.cwd(),
          })
        } catch {
          // Biome may return non-zero for unfixable issues
        }
      }

      // Run TypeScript checks on affected packages
      runTypeScriptChecks()
    }
  } catch {
    // Could not get modified files from git
  }
  process.exit(0)
}

// Get the file extension
const ext = path.extname(filename).toLowerCase()

if (lintableExtensions.includes(ext)) {
  // Track package for TypeScript checking
  trackPackageForTsCheck(filename)

  try {
    console.log(`Running Biome on ${filename}...`)
    execFileSync("bunx", ["biome", "check", "--write", filename], {
      stdio: "inherit",
      cwd: process.cwd(),
    })
  } catch {
    // Biome may return non-zero for unfixable issues
  }

  // Run TypeScript checks on affected packages
  runTypeScriptChecks()
}
