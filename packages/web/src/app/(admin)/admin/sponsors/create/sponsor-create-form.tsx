"use client"

import { useToast } from "@/components/admin/toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createSponsor } from "../sponsors.action"

export default function SponsorCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error("Name is required")
      setIsSubmitting(false)
      return
    }

    const result = await createSponsor({
      name: name.trim(),
      url: url.trim() || undefined,
    })

    if (!result.success) {
      toast.error(result.error || "Failed to create sponsor")
      setIsSubmitting(false)
      return
    }

    toast.success("Sponsor created successfully!")
    router.push(`/admin/sponsors/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>Sponsor Details</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="admin-input"
              placeholder="e.g., Acme Corporation"
            />
            <p className="admin-form-help">The full name of the sponsor</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="url">Website URL</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="admin-input"
              placeholder="https://example.com"
            />
            <p className="admin-form-help">The sponsor&apos;s website</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Additional Information</h2>
        <p className="admin-form-section-description">
          You can add a logo and social network links after creating the sponsor.
        </p>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={isSubmitting}
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              Creating...
            </>
          ) : (
            <>
              <i className="bx bx-plus" />
              Create Sponsor
            </>
          )}
        </button>
      </div>
    </form>
  )
}
