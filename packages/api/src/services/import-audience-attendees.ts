import crypto from "node:crypto"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import { nameToUsername } from "../libs/strings"
import { sendUserInvitationAndUpdateStatus } from "./user-invitations"

type ContactSource = "attendee" | "mailchimp"

interface ContactRecord {
  email?: string
  firstName?: string
  lastName?: string
  linkedinUrl?: string
  tshirtSize?: string
  foodPreferences?: string
  visible?: boolean
  sources: ContactSource[]
}

interface PlayerRecord {
  id?: number
  documentId?: string
  name: string
  slug?: string
  visible?: boolean
  position?: string
  userEmail?: string
  socialNetworks?: Array<{ socialNetworkType: string; url: string }>
  defaultTshirtSize?: string
  defaultFoodPreferences?: string
  planned?: boolean
}

interface UserRecord {
  id?: number
  documentId?: string
  email: string
  username?: string
  player?: PlayerRecord | null
  planned?: boolean
}

export interface ImportReportRow {
  email: string
  name: string
  sources: string
  userStatus: "existing" | "created"
  playerStatus: "matched" | "created"
  linkedIn: string
  visible: string
  notes: string
}

export interface ImportAudienceAttendeesOptions {
  dryRun?: boolean
  verbose?: boolean
  attendeeFiles?: string[]
  attendeeTexts?: string[]
  audienceFiles?: string[]
  audienceTexts?: string[]
  skipAttendees?: boolean
  skipAudience?: boolean
  repoRoot?: string
  reportDir?: string
  writeReports?: boolean
}

export interface ImportError {
  email?: string
  name?: string
  operation: "createPlayer" | "createUser" | "linkUser" | "updatePlayer" | "sendInvitation"
  message: string
}

export interface ImportAudienceAttendeesResult {
  dryRun: boolean
  reportPath?: string
  reportCsvPath?: string
  reportRows: ImportReportRow[]
  errors: ImportError[]
  summary: {
    contacts: number
    createPlayers: number
    matchPlayers: number
    createUsers: number
    linkUsers: number
    updatePlayers: number
    updateUsers: number
    skipped: number
    ambiguousMatches: number
    failed: number
  }
}

const TSHIRT_SIZES = ["XXXL", "XXL", "XL", "XS", "L", "M", "S"]

// Map player positions to role types (matches user-role-sync service)
const POSITION_TO_ROLE: Record<string, string> = {
  Player: "player",
  Host: "host",
  Mentor: "mentor",
  Founder: "founder",
}

function normalizeEmail(email?: string): string | null {
  if (!email) return null
  const trimmed = email.trim().toLowerCase()
  return trimmed ? trimmed : null
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeLinkedIn(url?: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower === "no" || lower === "non" || lower === "false") return null

  try {
    const normalizedUrl = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`)
    const host = normalizedUrl.hostname.replace(/^www\./, "").toLowerCase()
    const path = normalizedUrl.pathname.replace(/\/$/, "")
    return `${host}${path}`
  } catch {
    return trimmed.toLowerCase()
  }
}

function parseTshirtSize(value?: string): string | undefined {
  if (!value) return undefined
  const upper = value.toUpperCase()
  for (const size of TSHIRT_SIZES) {
    if (upper.includes(size)) {
      return size
    }
  }
  if (upper.includes("NONE")) return "none"
  return undefined
}

export function parseLinkedInField(value?: string): { linkedinUrl?: string; visible?: boolean } {
  if (!value) return {}
  const trimmed = value.trim()
  if (!trimmed) return {}
  const lower = trimmed.toLowerCase()
  if (lower === "no" || lower === "non" || lower === "false") {
    return { visible: false }
  }
  if (lower === "yes" || lower === "oui" || lower === "true") {
    return { visible: true }
  }
  return { linkedinUrl: trimmed, visible: true }
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0
  const input = text.replace(/^\uFEFF/, "")

  while (i < input.length) {
    const char = input[i]

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i += 1
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(field)
      field = ""
      i += 1
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1
      }
      row.push(field)
      field = ""
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row)
      }
      row = []
      i += 1
      continue
    }

    field += char
    i += 1
  }

  row.push(field)
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row)
  }

  return rows
}

function buildHeaderMap(headers: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    const list = map.get(normalized) || []
    list.push(index)
    map.set(normalized, list)
  })
  return map
}

function getFirstValue(
  row: string[],
  headerMap: Map<string, number[]>,
  headerNames: string[]
): string | undefined {
  for (const header of headerNames) {
    const indexes = headerMap.get(normalizeHeader(header))
    if (!indexes) continue
    for (const index of indexes) {
      const value = row[index]?.trim()
      if (value) return value
    }
  }
  return undefined
}

function getCombinedValues(
  row: string[],
  headerMap: Map<string, number[]>,
  headerNames: string[]
): string | undefined {
  const values: string[] = []
  for (const header of headerNames) {
    const indexes = headerMap.get(normalizeHeader(header)) || []
    for (const index of indexes) {
      const value = row[index]?.trim()
      if (value && !values.includes(value)) {
        values.push(value)
      }
    }
  }
  return values.length > 0 ? values.join(" | ") : undefined
}

function buildFullName(firstName?: string, lastName?: string, email?: string): string {
  const nameParts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (nameParts.length > 0) {
    return nameParts.join(" ")
  }
  if (email) {
    const local = email.split("@")[0]
    return local.replace(/[._-]+/g, " ").trim() || email
  }
  return "Unknown Player"
}

function loadMailchimpContactsFromText(text: string): ContactRecord[] {
  const rows = parseCsv(text, ",")
  if (rows.length === 0) return []
  const headers = rows[0]
  const headerMap = buildHeaderMap(headers)
  const contacts: ContactRecord[] = []

  for (const row of rows.slice(1)) {
    const email = getFirstValue(row, headerMap, ["Email Address", "Email"])
    if (!email) continue
    contacts.push({
      email,
      firstName: getFirstValue(row, headerMap, ["First Name"]),
      lastName: getFirstValue(row, headerMap, ["Last Name"]),
      sources: ["mailchimp"],
    })
  }

  return contacts
}

function loadMailchimpContacts(directory: string, files?: string[]): ContactRecord[] {
  const targets =
    files && files.length > 0
      ? files
      : readdirSync(directory)
          .filter((file) => file.endsWith(".csv"))
          .map((file) => join(directory, file))

  return targets.flatMap((filePath) =>
    loadMailchimpContactsFromText(readFileSync(filePath, "utf8"))
  )
}

export function loadAttendeeContactsFromText(text: string): ContactRecord[] {
  const headerLine = text.split(/\r?\n/).find((line) => line.trim() !== "") || ""
  const delimiter =
    headerLine.includes(";") && headerLine.includes(",")
      ? headerLine.split(";").length >= headerLine.split(",").length
        ? ";"
        : ","
      : headerLine.includes(";")
        ? ";"
        : ","
  const rows = parseCsv(text, delimiter)
  if (rows.length === 0) return []
  const headers = rows[0]
  const headerMap = buildHeaderMap(headers)
  const contacts: ContactRecord[] = []

  for (const row of rows.slice(1)) {
    const email =
      getFirstValue(row, headerMap, [
        "Attendee's Email address",
        "Attendee's email address",
        "Email",
      ]) || getFirstValue(row, headerMap, ["Purchaser's Email", "Purchaser's email"])
    const firstName = getFirstValue(row, headerMap, [
      "Attendee's first name",
      "First name",
      "First Name",
      "Prenom",
      "Prénom",
    ])
    const lastName = getFirstValue(row, headerMap, [
      "Attendee's name",
      "Last name",
      "Last Name",
      "Nom",
    ])
    const tshirtSize = parseTshirtSize(
      getFirstValue(row, headerMap, ["What is your T-shirt size and shape"])
    )
    const linkedinField = getFirstValue(row, headerMap, [
      "I want to appear on the #play14 website, and here is my LinkedIn profile url",
    ])
    const { linkedinUrl, visible } = parseLinkedInField(linkedinField)
    const foodPreferences = getCombinedValues(row, headerMap, [
      "Please notify us of any specific food diet (vegetarian, vegan, gluten-free, lactose-free, ...)",
    ])

    contacts.push({
      email,
      firstName,
      lastName,
      linkedinUrl,
      tshirtSize,
      foodPreferences,
      visible,
      sources: ["attendee"],
    })
  }

  return contacts
}

export function loadAttendeeContacts(directory: string, files?: string[]): ContactRecord[] {
  const targets =
    files && files.length > 0
      ? files
      : readdirSync(directory)
          .filter((file) => file.endsWith(".csv"))
          .map((file) => join(directory, file))

  return targets.flatMap((filePath) => loadAttendeeContactsFromText(readFileSync(filePath, "utf8")))
}

export function mergeContacts(
  attendeeContacts: ContactRecord[],
  mailchimpContacts: ContactRecord[]
): ContactRecord[] {
  const merged = new Map<string, ContactRecord>()

  const upsert = (contact: ContactRecord, source: ContactSource) => {
    const emailKey = normalizeEmail(contact.email)
    if (!emailKey) return
    const existing = merged.get(emailKey)
    if (!existing) {
      merged.set(emailKey, {
        ...contact,
        email: emailKey,
        sources: [source],
      })
      return
    }
    existing.sources.push(source)
    existing.firstName = existing.firstName || contact.firstName
    existing.lastName = existing.lastName || contact.lastName
    existing.linkedinUrl = existing.linkedinUrl || contact.linkedinUrl
    existing.tshirtSize = existing.tshirtSize || contact.tshirtSize
    existing.foodPreferences = existing.foodPreferences || contact.foodPreferences
    if (contact.visible === false) {
      existing.visible = false
    } else if (existing.visible === undefined) {
      existing.visible = contact.visible
    }
  }

  for (const contact of attendeeContacts) upsert(contact, "attendee")
  for (const contact of mailchimpContacts) upsert(contact, "mailchimp")

  return Array.from(merged.values())
}

function buildPlayerMaps(players: PlayerRecord[]) {
  const playersByName = new Map<string, PlayerRecord[]>()
  const playersByLinkedIn = new Map<string, PlayerRecord[]>()

  for (const player of players) {
    const normalizedName = normalizeName(player.name)
    if (normalizedName) {
      const list = playersByName.get(normalizedName) || []
      list.push(player)
      playersByName.set(normalizedName, list)
    }
    for (const network of player.socialNetworks || []) {
      const normalizedLinkedIn = normalizeLinkedIn(network.url)
      if (!normalizedLinkedIn) continue
      const list = playersByLinkedIn.get(normalizedLinkedIn) || []
      list.push(player)
      playersByLinkedIn.set(normalizedLinkedIn, list)
    }
  }

  return { playersByName, playersByLinkedIn }
}

function selectUnlinkedPlayer(players: PlayerRecord[]): PlayerRecord | null {
  return players.find((player) => !player.userEmail) || null
}

function ensureUniqueName(baseName: string, reservedNames: Set<string>): string {
  let name = baseName
  let counter = 1
  while (reservedNames.has(normalizeName(name))) {
    counter += 1
    name = `${baseName} (${counter})`
  }
  reservedNames.add(normalizeName(name))
  return name
}

function ensureUniqueSlug(baseName: string, reservedSlugs: Set<string>): string {
  const baseSlug = slugify(baseName, { lower: true, strict: true }) || "player"
  let slug = baseSlug
  let attempts = 0
  while (reservedSlugs.has(slug) && attempts < 10) {
    const suffix = crypto.randomBytes(2).toString("hex")
    slug = `${baseSlug}-${suffix}`
    attempts += 1
  }
  reservedSlugs.add(slug)
  return slug
}

async function loadExistingPlayers(strapi): Promise<PlayerRecord[]> {
  const players: PlayerRecord[] = []
  let start = 0
  const limit = 500

  while (true) {
    const batch = await strapi.documents("api::player.player").findMany({
      start,
      limit,
      populate: {
        user: { fields: ["email"] },
        socialNetworks: true,
      },
    })

    for (const player of batch || []) {
      players.push({
        id: player.id,
        documentId: player.documentId,
        name: player.name,
        slug: player.slug,
        visible: player.visible,
        position: player.position,
        userEmail: player.user?.email?.toLowerCase(),
        socialNetworks: player.socialNetworks || [],
        defaultTshirtSize: player.defaultTshirtSize,
        defaultFoodPreferences: player.defaultFoodPreferences,
      })
    }

    if (!batch || batch.length < limit) break
    start += limit
  }

  return players
}

async function loadExistingUsers(strapi): Promise<UserRecord[]> {
  const users: UserRecord[] = []
  let start = 0
  const limit = 500

  while (true) {
    const batch = await strapi.documents("plugin::users-permissions.user").findMany({
      start,
      limit,
      populate: {
        player: { populate: { socialNetworks: true, user: { fields: ["email"] } } },
      },
    })

    for (const user of batch || []) {
      users.push({
        id: user.id,
        documentId: user.documentId,
        email: user.email?.toLowerCase(),
        username: user.username,
        player: user.player
          ? {
              id: user.player.id,
              documentId: user.player.documentId,
              name: user.player.name,
              slug: user.player.slug,
              visible: user.player.visible,
              position: user.player.position,
              userEmail: user.player.user?.email?.toLowerCase(),
              socialNetworks: user.player.socialNetworks || [],
              defaultTshirtSize: user.player.defaultTshirtSize,
              defaultFoodPreferences: user.player.defaultFoodPreferences,
            }
          : null,
      })
    }

    if (!batch || batch.length < limit) break
    start += limit
  }

  return users
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

export async function runAudienceAttendeeImport(
  strapi: Core.Strapi,
  options: ImportAudienceAttendeesOptions = {}
): Promise<ImportAudienceAttendeesResult> {
  const dryRun = options.dryRun ?? true
  const verbose = options.verbose ?? false
  const skipAttendees = options.skipAttendees ?? false
  const skipAudience = options.skipAudience ?? false
  const writeReports = options.writeReports ?? true

  const logInfo = strapi.log?.info?.bind(strapi.log) ?? console.log

  const cwd = process.cwd()
  const repoRoot =
    options.repoRoot ?? (cwd.endsWith("packages/api") ? resolve(cwd, "..", "..") : cwd)
  const reportDir = options.reportDir ?? resolve(repoRoot, "docs")

  const audienceDir = resolve(repoRoot, "docs/audience")
  const attendeesDir = resolve(repoRoot, "docs/attendees")

  const audienceTexts = options.audienceTexts || []
  const attendeeTexts = options.attendeeTexts || []
  const attendeeFiles = options.attendeeFiles?.length
    ? resolveInputFiles(options.attendeeFiles, repoRoot, "Attendee")
    : []
  const audienceFiles = options.audienceFiles?.length
    ? resolveInputFiles(options.audienceFiles, repoRoot, "Audience")
    : []

  if (skipAttendees && attendeeFiles.length > 0) {
    throw new Error("Cannot combine skipAttendees with attendeeFiles")
  }
  if (skipAudience && audienceFiles.length > 0) {
    throw new Error("Cannot combine skipAudience with audienceFiles")
  }
  if (skipAttendees && attendeeTexts.length > 0) {
    throw new Error("Cannot combine skipAttendees with attendeeTexts")
  }
  if (skipAudience && audienceTexts.length > 0) {
    throw new Error("Cannot combine skipAudience with audienceTexts")
  }
  if (attendeeTexts.length > 0 && attendeeFiles.length > 0) {
    throw new Error("Cannot combine attendeeTexts with attendeeFiles")
  }
  if (audienceTexts.length > 0 && audienceFiles.length > 0) {
    throw new Error("Cannot combine audienceTexts with audienceFiles")
  }

  const mailchimpContacts = skipAudience
    ? []
    : audienceTexts.length > 0
      ? audienceTexts.flatMap(loadMailchimpContactsFromText)
      : loadMailchimpContacts(audienceDir, audienceFiles)
  const attendeeContacts = skipAttendees
    ? []
    : attendeeTexts.length > 0
      ? attendeeTexts.flatMap(loadAttendeeContactsFromText)
      : loadAttendeeContacts(attendeesDir, attendeeFiles)
  const contacts = mergeContacts(attendeeContacts, mailchimpContacts)

  // Load all roles for position-based assignment
  const allRoles = await strapi.documents("plugin::users-permissions.role").findMany({})
  const rolesByType = new Map<string, { id: number; documentId: string }>()
  for (const role of allRoles) {
    if (role.type) {
      rolesByType.set(role.type, { id: Number(role.id), documentId: role.documentId })
    }
  }
  const playerRole = rolesByType.get("player")
  if (!playerRole) {
    throw new Error("Player role not found")
  }

  const existingPlayers = await loadExistingPlayers(strapi)
  const existingUsers = await loadExistingUsers(strapi)

  const usersByEmail = new Map<string, UserRecord>()
  existingUsers.forEach((user) => {
    if (user.email) usersByEmail.set(user.email, user)
  })

  const { playersByName, playersByLinkedIn } = buildPlayerMaps(existingPlayers)
  const reservedNames = new Set(existingPlayers.map((player) => normalizeName(player.name)))
  const reservedSlugs = new Set(existingPlayers.map((player) => player.slug).filter(Boolean))

  const actions = {
    createPlayers: [] as Array<{ name: string; email: string }>,
    createUsers: [] as Array<{ email: string; playerName: string }>,
    linkUsers: [] as Array<{ email: string; playerName: string }>,
    updatePlayers: [] as Array<{
      name: string
      documentId?: string
      updates: Record<string, unknown>
    }>,
    updateUsers: [] as Array<{ email: string; updates: Record<string, unknown> }>,
    skipped: [] as Array<{ reason: string; email?: string }>,
    ambiguousMatches: [] as Array<{ email: string; name: string }>,
  }
  const reportRows: ImportReportRow[] = []

  for (const contact of contacts) {
    const email = normalizeEmail(contact.email)
    if (!email) {
      actions.skipped.push({ reason: "missing_email" })
      continue
    }

    const firstName = contact.firstName?.trim()
    const lastName = contact.lastName?.trim()
    const fullName = buildFullName(firstName, lastName, email)
    const normalizedName = normalizeName(fullName)
    const normalizedLinkedIn = normalizeLinkedIn(contact.linkedinUrl)
    const desiredTshirt = contact.tshirtSize
    const desiredFood = contact.foodPreferences

    const existingUser = usersByEmail.get(email)
    let user = existingUser
    let player: PlayerRecord | null = user?.player || null
    let matchedExistingPlayer = false
    let createdPlayer = false
    let createdUser = false
    const notes: string[] = []

    if (!player) {
      let matchedPlayer: PlayerRecord | null = null
      if (normalizedLinkedIn) {
        const linkedPlayers = playersByLinkedIn.get(normalizedLinkedIn) || []
        matchedPlayer = selectUnlinkedPlayer(linkedPlayers)
      }
      if (!matchedPlayer && normalizedName) {
        const candidates = playersByName.get(normalizedName) || []
        if (candidates.length > 1 && !selectUnlinkedPlayer(candidates)) {
          actions.ambiguousMatches.push({ email, name: fullName })
          notes.push("ambiguous_name_match")
        }
        matchedPlayer = selectUnlinkedPlayer(candidates)
      }

      if (matchedPlayer) {
        player = matchedPlayer
        matchedExistingPlayer = true
      }
    }

    if (!user || !player) {
      if (!player) {
        const uniqueName = ensureUniqueName(fullName, reservedNames)
        const uniqueSlug = ensureUniqueSlug(uniqueName, reservedSlugs)
        player = {
          name: uniqueName,
          slug: uniqueSlug,
          visible: false,
          socialNetworks: normalizedLinkedIn
            ? [
                {
                  socialNetworkType: "LinkedIn",
                  url: contact.linkedinUrl || normalizedLinkedIn,
                },
              ]
            : [],
          defaultTshirtSize: desiredTshirt || "none",
          defaultFoodPreferences: desiredFood,
          planned: true,
        }
        createdPlayer = true
        actions.createPlayers.push({ name: uniqueName, email })
        const nameList = playersByName.get(normalizeName(uniqueName)) || []
        nameList.push(player)
        playersByName.set(normalizeName(uniqueName), nameList)
        if (normalizedLinkedIn) {
          const linkedList = playersByLinkedIn.get(normalizedLinkedIn) || []
          linkedList.push(player)
          playersByLinkedIn.set(normalizedLinkedIn, linkedList)
        }
      }

      if (!user) {
        actions.createUsers.push({ email, playerName: player?.name || fullName })
        user = {
          email,
          username: nameToUsername(fullName, firstName, lastName),
          player,
          planned: true,
        }
        createdUser = true
        usersByEmail.set(email, user)
      }

      if (player && (!user.player || user.planned)) {
        actions.linkUsers.push({ email, playerName: player.name })
        user.player = player
      }
    }

    const playerUpdates: Record<string, unknown> = {}
    const canInspectPlayerPrefs =
      player?.defaultTshirtSize !== undefined || player?.defaultFoodPreferences !== undefined
    if (player) {
      if (normalizedLinkedIn) {
        const hasLinkedIn = (player.socialNetworks || []).some((network) => {
          const normalized = normalizeLinkedIn(network.url)
          return normalized === normalizedLinkedIn
        })
        if (!hasLinkedIn) {
          playerUpdates.socialNetworks = [
            ...(player.socialNetworks || []),
            {
              socialNetworkType: "LinkedIn",
              url: contact.linkedinUrl || normalizedLinkedIn,
            },
          ]
        }
      }

      if (canInspectPlayerPrefs) {
        if (desiredTshirt && (!player.defaultTshirtSize || player.defaultTshirtSize === "none")) {
          playerUpdates.defaultTshirtSize = desiredTshirt
        }
        if (desiredFood && !player.defaultFoodPreferences) {
          playerUpdates.defaultFoodPreferences = desiredFood
        }
      }
    }

    if (player && Object.keys(playerUpdates).length > 0 && !player.planned) {
      actions.updatePlayers.push({
        name: player.name,
        documentId: player.documentId,
        updates: playerUpdates,
      })
    }

    const userStatus = existingUser && !createdUser ? "existing" : "created"
    const playerStatus = matchedExistingPlayer && !createdPlayer ? "matched" : "created"
    reportRows.push({
      email,
      name: player?.name || fullName,
      sources: contact.sources.join(","),
      userStatus,
      playerStatus,
      linkedIn: contact.linkedinUrl || "",
      visible: createdPlayer ? "false" : player?.visible !== false ? "true" : "false",
      notes: notes.join(","),
    })

    if (verbose) {
      logInfo(`[Import] ${email}: ${player?.name || fullName}`)
    }
  }

  logInfo("Import summary")
  logInfo(`- Contacts processed: ${contacts.length}`)
  logInfo(`- Create players: ${actions.createPlayers.length}`)
  logInfo(`- Create users: ${actions.createUsers.length}`)
  logInfo(`- Link users: ${actions.linkUsers.length}`)
  logInfo(`- Update players: ${actions.updatePlayers.length}`)
  logInfo(`- Update users: ${actions.updateUsers.length}`)
  logInfo(`- Skipped: ${actions.skipped.length}`)
  logInfo(`- Ambiguous matches: ${actions.ambiguousMatches.length}`)

  let reportPath: string | undefined
  let csvPath: string | undefined
  if (writeReports) {
    reportPath = resolve(reportDir, "import-report.json")
    writeFileSync(reportPath, JSON.stringify(reportRows, null, 2), "utf8")
    csvPath = resolve(reportDir, "import-report.csv")
    const csvHeader = [
      "email",
      "name",
      "sources",
      "userStatus",
      "playerStatus",
      "linkedIn",
      "visible",
      "notes",
    ]
    const csvLines = [csvHeader.join(",")].concat(
      reportRows.map((row) =>
        csvHeader
          .map((key) => {
            const value = String(row[key as keyof typeof row] ?? "")
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(",")
      )
    )
    writeFileSync(csvPath, `${csvLines.join("\n")}\n`, "utf8")
    logInfo(`- Report JSON: ${reportPath}`)
    logInfo(`- Report CSV: ${csvPath}`)
  }

  const matchPlayers = reportRows.filter((row) => row.playerStatus === "matched").length

  const summary = {
    contacts: contacts.length,
    createPlayers: actions.createPlayers.length,
    matchPlayers,
    createUsers: actions.createUsers.length,
    linkUsers: actions.linkUsers.length,
    updatePlayers: actions.updatePlayers.length,
    updateUsers: actions.updateUsers.length,
    skipped: actions.skipped.length,
    ambiguousMatches: actions.ambiguousMatches.length,
  }

  if (dryRun) {
    logInfo("Dry-run mode enabled. No changes were applied.")
    return {
      dryRun,
      reportPath,
      reportCsvPath: csvPath,
      reportRows,
      errors: [],
      summary: { ...summary, failed: 0 },
    }
  }

  const errors: ImportError[] = []

  // Process each operation individually to allow partial success
  // If one player/user fails, continue with the rest

  // Create players
  for (const action of actions.createPlayers) {
    const playerName = action.name
    const playerRecord = playersByName
      .get(normalizeName(playerName))
      ?.find((player) => player.name === playerName)
    if (!playerRecord?.planned) continue

    try {
      const createdPlayer = await strapi.documents("api::player.player").create({
        data: {
          name: playerRecord.name,
          slug: playerRecord.slug,
          position: "Player",
          visible: playerRecord.visible ?? true,
          socialNetworks: playerRecord.socialNetworks || [],
          defaultTshirtSize: playerRecord.defaultTshirtSize || "none",
          defaultFoodPreferences: playerRecord.defaultFoodPreferences || null,
        } as any,
      })
      playerRecord.id = Number(createdPlayer.id)
      playerRecord.documentId = createdPlayer.documentId
      playerRecord.planned = false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      strapi.log.error(`[Import] Failed to create player ${playerName}: ${errorMessage}`)
      errors.push({
        email: action.email,
        name: playerName,
        operation: "createPlayer",
        message: errorMessage,
      })
    }
  }

  // Create users
  for (const action of actions.createUsers) {
    const user = usersByEmail.get(action.email)
    if (!user?.planned) continue

    try {
      const password = `${crypto.randomBytes(16).toString("hex")}!`

      // Determine role based on player's position
      const playerPosition = user.player?.position || "Player"
      const roleType = POSITION_TO_ROLE[playerPosition] || "player"
      const targetRole = rolesByType.get(roleType) || playerRole

      const createdUser = await strapi.documents("plugin::users-permissions.user").create({
        data: {
          username: user.username || user.email,
          email: user.email,
          password,
          confirmed: true,
          blocked: false,
          provider: "local",
          role: targetRole.id,
          ...(user.player?.id ? { player: user.player.id } : {}),
          invitationStatus: "pending",
        } as any,
      })
      user.id = Number(createdUser.id)
      user.documentId = createdUser.documentId
      user.planned = false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      strapi.log.error(`[Import] Failed to create user ${action.email}: ${errorMessage}`)
      errors.push({
        email: action.email,
        name: action.playerName,
        operation: "createUser",
        message: errorMessage,
      })
    }
  }

  // Link users to players
  for (const action of actions.linkUsers) {
    const user = usersByEmail.get(action.email)
    if (!user?.player || !user.documentId || !user.player.id) continue

    try {
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: { player: user.player.id } as any,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      strapi.log.error(`[Import] Failed to link user ${action.email}: ${errorMessage}`)
      errors.push({
        email: action.email,
        name: action.playerName,
        operation: "linkUser",
        message: errorMessage,
      })
    }
  }

  // Update players
  for (const action of actions.updatePlayers) {
    const targetDocumentId =
      action.documentId ||
      existingPlayers.find((p) => p.name === action.name)?.documentId ||
      playersByName.get(normalizeName(action.name))?.find((p) => p.name === action.name)?.documentId
    if (!targetDocumentId) continue

    try {
      await strapi.documents("api::player.player").update({
        documentId: targetDocumentId,
        data: action.updates as any,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      strapi.log.error(`[Import] Failed to update player ${action.name}: ${errorMessage}`)
      errors.push({
        name: action.name,
        operation: "updatePlayer",
        message: errorMessage,
      })
    }
  }

  // Send invitation emails to newly created users immediately
  // This is done outside the transaction to avoid blocking database writes
  // Failed emails will leave users in "pending" status for cron retry
  let emailsSent = 0
  let emailsFailed = 0
  for (const action of actions.createUsers) {
    const user = usersByEmail.get(action.email)
    if (!user?.documentId) continue

    const success = await sendUserInvitationAndUpdateStatus(strapi, {
      documentId: user.documentId,
      email: user.email,
      username: user.username || user.email,
      player: user.player ? { name: user.player.name } : undefined,
    })

    if (success) {
      emailsSent++
    } else {
      emailsFailed++
      // User remains in "pending" status - cron job will retry
    }
  }

  if (emailsSent > 0 || emailsFailed > 0) {
    logInfo(`- Invitation emails sent: ${emailsSent}`)
    if (emailsFailed > 0) {
      logInfo(`- Invitation emails failed (will retry via cron): ${emailsFailed}`)
    }
  }

  if (errors.length > 0) {
    logInfo(`- Errors: ${errors.length}`)
    for (const error of errors) {
      logInfo(`  - ${error.operation}: ${error.email || error.name} - ${error.message}`)
    }
  }

  return {
    dryRun,
    reportPath,
    reportCsvPath: csvPath,
    reportRows,
    errors,
    summary: { ...summary, failed: errors.length },
  }
}
