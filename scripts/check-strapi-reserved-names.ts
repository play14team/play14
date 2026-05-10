#!/usr/bin/env bun
const RESERVED = new Set(["status", "type", "state", "id"])

const SCHEMA_PATTERNS = [
  /^packages\/api\/src\/api\/[^/]+\/content-types\/[^/]+\/schema\.json$/,
  /^packages\/api\/src\/extensions\/[^/]+\/content-types\/[^/]+\/schema\.json$/,
  /^packages\/api\/src\/components\/[^/]+\/[^/]+\.json$/,
]

function stagedFiles(): string[] {
  const proc = Bun.spawnSync({
    cmd: ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  })
  return new TextDecoder().decode(proc.stdout).split("\n").filter(Boolean)
}

function readStaged(file: string): string | null {
  const proc = Bun.spawnSync({ cmd: ["git", "show", `:${file}`] })
  if (proc.exitCode !== 0) return null
  return new TextDecoder().decode(proc.stdout)
}

function lineOf(source: string, key: string): number | null {
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*\\{`)
  const lines = source.split("\n")
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1
  }
  return null
}

const offenders: Array<{ file: string; key: string; line: number | null }> = []

for (const file of stagedFiles()) {
  if (!SCHEMA_PATTERNS.some((p) => p.test(file))) continue

  const raw = readStaged(file)
  if (raw === null) continue

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    continue
  }

  const attrs = (parsed as { attributes?: Record<string, unknown> })?.attributes
  if (!attrs || typeof attrs !== "object") continue

  for (const key of Object.keys(attrs)) {
    if (RESERVED.has(key)) {
      offenders.push({ file, key, line: lineOf(raw, key) })
    }
  }
}

if (offenders.length === 0) {
  process.exit(0)
}

console.error("\n✖ Strapi reserved attribute names detected in staged schema(s):\n")
for (const { file, key, line } of offenders) {
  const loc = line ? `${file}:${line}` : file
  console.error(`  - ${loc} → attribute "${key}" is reserved`)
}
console.error(
  [
    "",
    "Reserved names: status, type, state, id.",
    "These collide with Strapi 5 internals (draft/publish, polymorphic discriminators, Koa ctx.state, primary key).",
    "Domain-prefix instead: orderStatus, ticketStatus, eventStatus, expectationType, webhookStatus, etc.",
    "If a rename is unavoidable on an existing field, use the rename-strapi-attribute skill so the schema, migration, and every reference move together.",
    "",
  ].join("\n")
)
process.exit(1)
