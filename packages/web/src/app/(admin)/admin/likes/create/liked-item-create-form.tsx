"use client"

import { useToast } from "@/components/admin/toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createLikedItem } from "../liked-items.action"

export default function LikedItemCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error("Name is required")
      setIsSubmitting(false)
      return
    }

    if (!url.trim()) {
      toast.error("URL is required")
      setIsSubmitting(false)
      return
    }

    const result = await createLikedItem({
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
    })

    if (!result.success) {
      toast.error(result.error || "Failed to create liked item")
      setIsSubmitting(false)
      return
    }

    toast.success("Liked item created successfully!")
    router.push(`/admin/likes/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>Item Details</h2>

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
              placeholder="e.g., Story Cubes"
            />
            <p className="admin-form-help">The name of the thing we like</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="url">Website URL *</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="admin-input"
              placeholder="https://example.com"
            />
            <p className="admin-form-help">Link to the product, tool, or resource</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-input"
              rows={3}
              placeholder="A short description of why we like this..."
            />
            <p className="admin-form-help">A brief description (optional)</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Additional Information</h2>
        <p className="admin-form-section-description">
          You can add an image and link contributors after creating the item.
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
              Create Item
            </>
          )}
        </button>
      </div>
    </form>
  )
}
