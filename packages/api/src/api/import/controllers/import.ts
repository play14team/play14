import { readFile, unlink } from "node:fs/promises"
import type { Core } from "@strapi/strapi"
import { runAudienceAttendeeImport } from "../../../services/import-audience-attendees"

type UploadedFile = {
  path?: string
  filepath?: string
  originalFilename?: string
  name?: string
  type?: string
  size?: number
}

const ORGANIZER_POSITIONS = new Set(["Host", "Mentor", "Founder"])

function normalizeUploadedFiles(input?: UploadedFile | UploadedFile[]): UploadedFile[] {
  if (!input) return []
  return Array.isArray(input) ? input : [input]
}

async function readCsvFiles(files: UploadedFile[], label: string): Promise<string[]> {
  const texts: string[] = []
  for (const file of files) {
    const fileName = file.name || file.originalFilename || file.path || file.filepath
    if (fileName && !fileName.toLowerCase().endsWith(".csv")) {
      throw new Error(`${label} file must be a CSV`)
    }
    const filePath = file.filepath || file.path
    if (!filePath) {
      throw new Error(`${label} file is missing an upload path`)
    }
    texts.push(await readFile(filePath, "utf8"))
    await unlink(filePath).catch(() => undefined)
  }
  return texts
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async uploadAudienceAttendees(ctx: any) {
    const user = ctx.state.user
    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: { fields: ["position"] } },
    })

    const position = userWithPlayer?.player?.position
    if (!position || !ORGANIZER_POSITIONS.has(position)) {
      return ctx.forbidden("Only organizers can import attendees")
    }

    const requestFiles = ctx.request.files || {}
    const attendeeFiles = normalizeUploadedFiles(requestFiles.attendees)
    const audienceFiles = normalizeUploadedFiles(requestFiles.audience)

    if (attendeeFiles.length === 0 && audienceFiles.length === 0) {
      return ctx.badRequest("Please provide attendee and/or audience CSV files")
    }

    try {
      const attendeeTexts = await readCsvFiles(attendeeFiles, "Attendee")
      const audienceTexts = await readCsvFiles(audienceFiles, "Audience")

      const result = await runAudienceAttendeeImport(strapi, {
        dryRun: false,
        verbose: false,
        skipAttendees: attendeeTexts.length === 0,
        skipAudience: audienceTexts.length === 0,
        attendeeTexts,
        audienceTexts,
        writeReports: false,
      })

      return ctx.send({
        data: {
          summary: result.summary,
          reportRows: result.reportRows,
          errors: result.errors,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      strapi.log.error(`[Import] Failed to process upload: ${errorMessage}`)
      return ctx.internalServerError(`Import failed: ${errorMessage}`)
    }
  },
})
