"use client"

import { useEffect, useState } from "react"
import { getNewsletterPreview, updateNewsletter } from "./newsletter.action"

type DeviceType = "desktop" | "mobile"

interface NewsletterPreviewProps {
  newsletterId: string
  subject: string
  body: string
  onClose: () => void
}

export default function NewsletterPreview({
  newsletterId,
  subject,
  body,
  onClose,
}: NewsletterPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<DeviceType>("desktop")

  useEffect(() => {
    async function loadPreview() {
      setIsLoading(true)
      setError(null)

      // First save the current content to ensure preview matches
      const saveResult = await updateNewsletter(newsletterId, { subject, body })
      if (!saveResult.success) {
        setError(saveResult.error || "Failed to save before preview")
        setIsLoading(false)
        return
      }

      // Then fetch the preview
      const result = await getNewsletterPreview(newsletterId)
      if (result.success && result.html) {
        setPreviewHtml(result.html)
      } else {
        setError(result.error || "Failed to load preview")
      }
      setIsLoading(false)
    }

    loadPreview()
  }, [newsletterId, subject, body])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content newsletter-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Newsletter preview</h2>
          <div className="newsletter-preview-devices">
            <button
              type="button"
              className={`newsletter-preview-device ${device === "desktop" ? "active" : ""}`}
              onClick={() => setDevice("desktop")}
              title="Desktop view"
            >
              <i className="bx bx-desktop" />
            </button>
            <button
              type="button"
              className={`newsletter-preview-device ${device === "mobile" ? "active" : ""}`}
              onClick={() => setDevice("mobile")}
              title="Mobile view"
            >
              <i className="bx bx-mobile-alt" />
            </button>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className="modal-body newsletter-preview-body">
          {isLoading && (
            <div className="newsletter-preview-loading">
              <i className="bx bx-loader-alt bx-spin" />
              <span>Loading preview...</span>
            </div>
          )}
          {error && (
            <div className="newsletter-preview-error">
              <i className="bx bx-error-circle" />
              <span>{error}</span>
            </div>
          )}
          {previewHtml && !isLoading && (
            <div className={`newsletter-preview-frame newsletter-preview-${device}`}>
              <iframe srcDoc={previewHtml} title="Newsletter preview" sandbox="allow-same-origin" />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
