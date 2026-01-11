"use server"

import { strapiFetchFormData } from "@/libs/strapi-client"

export interface ImportSummary {
  contacts: number
  createPlayers: number
  createUsers: number
  linkUsers: number
  updatePlayers: number
  updateUsers: number
  skipped: number
  ambiguousMatches: number
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

export interface ImportUploadResponse {
  summary: ImportSummary
  reportRows: ImportReportRow[]
}

export interface ImportUploadResult {
  success: boolean
  data?: ImportUploadResponse
  error?: string
}

export async function uploadAudienceAttendeeImport(
  attendeeFile?: File | null,
  audienceFile?: File | null
): Promise<ImportUploadResult> {
  const hasAttendee = attendeeFile && attendeeFile.size > 0
  const hasAudience = audienceFile && audienceFile.size > 0

  if (!hasAttendee && !hasAudience) {
    return {
      success: false,
      error: "Please select at least one CSV file.",
    }
  }

  const formData = new FormData()
  if (hasAttendee && attendeeFile) {
    formData.append("attendees", attendeeFile)
  }
  if (hasAudience && audienceFile) {
    formData.append("audience", audienceFile)
  }

  const result = await strapiFetchFormData<{ data: ImportUploadResponse }>(
    "/imports/audience-attendees",
    {},
    formData
  )

  if (!result.ok || !result.data) {
    return {
      success: false,
      error: result.error || "Import failed.",
    }
  }

  return {
    success: true,
    data: result.data.data,
  }
}
