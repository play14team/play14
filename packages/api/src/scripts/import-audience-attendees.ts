import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { createStrapi } from "@strapi/strapi"
import { runAudienceAttendeeImport } from "../services/import-audience-attendees"

function collectArgValues(args: string[], flag: string): string[] {
  const values: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === flag) {
      const next = args[i + 1]
      if (!next || next.startsWith("--")) {
        throw new Error(`${flag} requires a value`)
      }
      values.push(next)
      i += 1
      continue
    }
    if (arg.startsWith(`${flag}=`)) {
      values.push(arg.slice(flag.length + 1))
    }
  }
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
}

function resolveInputFiles(paths: string[], repoRoot: string, label: string): string[] {
  const resolved = paths.map((entry) => (entry.startsWith("/") ? entry : resolve(repoRoot, entry)))
  for (const filePath of resolved) {
    if (!existsSync(filePath)) {
      throw new Error(`${label} file not found: ${filePath}`)
    }
  }
  return resolved
}

async function run(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = !args.includes("--apply")
  const verbose = args.includes("--verbose")
  const skipAttendees = args.includes("--no-attendees")
  const skipAudience = args.includes("--no-audience")

  const cwd = process.cwd()
  const appDir = cwd.endsWith("packages/api") ? cwd : resolve(cwd, "packages/api")
  const repoRoot = cwd.endsWith("packages/api") ? resolve(cwd, "..", "..") : cwd

  const attendeeArgs = collectArgValues(args, "--attendees")
  const audienceArgs = collectArgValues(args, "--audience")
  if (skipAttendees && attendeeArgs.length > 0) {
    throw new Error("Cannot combine --no-attendees with --attendees")
  }
  if (skipAudience && audienceArgs.length > 0) {
    throw new Error("Cannot combine --no-audience with --audience")
  }

  const attendeeFiles = attendeeArgs.length
    ? resolveInputFiles(attendeeArgs, repoRoot, "Attendee")
    : []
  const audienceFiles = audienceArgs.length
    ? resolveInputFiles(audienceArgs, repoRoot, "Audience")
    : []

  const strapi = await createStrapi({ appDir }).load()

  try {
    await runAudienceAttendeeImport(strapi, {
      dryRun,
      verbose,
      skipAttendees,
      skipAudience,
      attendeeFiles,
      audienceFiles,
      repoRoot,
    })
  } finally {
    await strapi.destroy()
  }
}

const shouldRunCli =
  typeof process.argv[1] === "string" && process.argv[1].includes("import-audience-attendees")
if (shouldRunCli) {
  run().catch((error) => {
    console.error("Import failed:", error)
    process.exitCode = 1
  })
}
