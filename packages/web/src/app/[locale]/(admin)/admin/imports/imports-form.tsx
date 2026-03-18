"use client"

import { useTranslations } from "next-intl"
import { useRef, useState, useTransition } from "react"
import { type ImportUploadResponse, uploadAudienceAttendeeImport } from "./imports.action"

const ATTENDEE_SAMPLE = `Attendee's Email address,Attendee's first name,Attendee's name,"What is your T-shirt size and shape","I want to appear on the #play14 website, and here is my LinkedIn profile url","Please notify us of any specific food diet (vegetarian, vegan, gluten-free, lactose-free, ...)"
jane.doe@example.com,Jane,Doe,Unisex M,https://www.linkedin.com/in/janedoe,vegetarian
alex.smith@example.com,Alex,Smith,Unisex L,no,gluten-free`

const AUDIENCE_SAMPLE = `Email Address,First Name,Last Name
jane.doe@example.com,Jane,Doe
alex.smith@example.com,Alex,Smith`

export default function ImportsForm() {
  const t = useTranslations("adminMisc.imports")
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportUploadResponse | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setResult(null)

    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    const attendeeFile = formData.get("attendees") as File | null
    const audienceFile = formData.get("audience") as File | null

    startTransition(async () => {
      const response = await uploadAudienceAttendeeImport(attendeeFile, audienceFile)
      if (!response.success) {
        setError(response.error || "Import failed.")
        return
      }
      setResult(response.data || null)
    })
  }

  const reportRows = result?.reportRows || []
  const visibleRows = reportRows.slice(0, 50)

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-section">
        <h2>{t("uploadTitle")}</h2>
        <p className="admin-form-section-description">{t("uploadDescription")}</p>

        <div className="admin-form-row">
          <div className="admin-form-group" style={{ flex: 1 }}>
            <label htmlFor="attendees">{t("attendeeCsv")}</label>
            <input
              id="attendees"
              name="attendees"
              type="file"
              accept=".csv"
              className="admin-input"
              disabled={isPending}
            />
            <p className="admin-form-help">{t("attendeeHelp")}</p>
          </div>
          <div className="admin-form-group" style={{ flex: 1 }}>
            <label htmlFor="audience">{t("audienceCsv")}</label>
            <input
              id="audience"
              name="audience"
              type="file"
              accept=".csv"
              className="admin-input"
              disabled={isPending}
            />
            <p className="admin-form-help">{t("audienceHelp")}</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{t("sampleFiles")}</h2>
        <p className="admin-form-section-description">{t("sampleDescription")}</p>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <div className="admin-sample-card">
              <p className="admin-sample-title">{t("attendeeSampleTitle")}</p>
              <p className="admin-form-help">{t("attendeeSampleHelp")}</p>
              <a
                className="admin-btn admin-btn-secondary admin-btn-block"
                href="/import-samples/attendee-sample.csv"
                download
              >
                <i className="bx bx-download" />
                {t("downloadAttendeeSample")}
              </a>
              <pre className="admin-sample-preview">{ATTENDEE_SAMPLE}</pre>
            </div>
          </div>
          <div className="admin-form-group">
            <div className="admin-sample-card">
              <p className="admin-sample-title">{t("audienceSampleTitle")}</p>
              <p className="admin-form-help">{t("audienceSampleHelp")}</p>
              <a
                className="admin-btn admin-btn-secondary admin-btn-block"
                href="/import-samples/audience-sample.csv"
                download
              >
                <i className="bx bx-download" />
                {t("downloadAudienceSample")}
              </a>
              <pre className="admin-sample-preview">{AUDIENCE_SAMPLE}</pre>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-form-section admin-info-section">
          <p className="admin-form-help" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        </div>
      )}

      {result && (
        <div className="admin-form-section admin-info-section">
          <h3>{t("importSummary")}</h3>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <p className="admin-form-help">
                {t("contactsProcessed", { count: result.summary.contacts })}
              </p>
              <p className="admin-form-help">
                {t("playersCreated", { count: result.summary.createPlayers })}
              </p>
              <p className="admin-form-help">
                {t("playersMatched", { count: result.summary.matchPlayers })}
              </p>
              <p className="admin-form-help">
                {t("playersUpdated", { count: result.summary.updatePlayers })}
              </p>
            </div>
            <div className="admin-form-group">
              <p className="admin-form-help">
                {t("usersCreated", { count: result.summary.createUsers })}
              </p>
              <p className="admin-form-help">
                {t("usersLinked", { count: result.summary.linkUsers })}
              </p>
              <p className="admin-form-help">{t("skipped", { count: result.summary.skipped })}</p>
              <p className="admin-form-help">
                {t("ambiguousMatches", { count: result.summary.ambiguousMatches })}
              </p>
            </div>
          </div>

          {reportRows.length > 0 && (
            <>
              <h4>{t("processedContacts")}</h4>
              <div className="admin-form-group">
                {visibleRows.map((row) => (
                  <p key={row.email} className="admin-form-help">
                    {row.email} — {row.name} (user: {row.userStatus}, player: {row.playerStatus},
                    visible: {row.visible})
                  </p>
                ))}
              </div>
              {reportRows.length > visibleRows.length && (
                <p className="admin-form-help">
                  {t("showingRows", { visible: visibleRows.length, total: reportRows.length })}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
          {isPending ? t("importing") : t("runImport")}
        </button>
      </div>
    </form>
  )
}
