#!/usr/bin/env node

import { execFileSync } from "child_process"
import path from "path"

// Try to get the filename from different sources
const filename = process.env.CLAUDE_FILENAME || process.argv[2]

// Extensions that Biome can lint/format
const lintableExtensions = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".json", ".jsonc"]

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
        try {
          execFileSync("bunx", ["biome", "check", "--write", file], {
            stdio: "inherit",
            cwd: process.cwd(),
          })
        } catch {
          // Biome may return non-zero for unfixable issues
        }
      }
    }
  } catch {
    // Could not get modified files from git
  }
  process.exit(0)
}

// Get the file extension
const ext = path.extname(filename).toLowerCase()

if (lintableExtensions.includes(ext)) {
  try {
    console.log(`Running Biome on ${filename}...`)
    execFileSync("bunx", ["biome", "check", "--write", filename], {
      stdio: "inherit",
      cwd: process.cwd(),
    })
  } catch {
    // Biome may return non-zero for unfixable issues
  }
}
