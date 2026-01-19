"use client"

import type { MediaLink } from "@/app/(admin)/admin/events/[slug]/media-links.action"
import { useState } from "react"

const MEDIA_TYPES = [
  { value: "Photos", label: "Photos", icon: "bx-images" },
  { value: "Videos", label: "Videos", icon: "bx-video" },
] as const

interface Props {
  mediaLinks: MediaLink[]
  onChange: (mediaLinks: MediaLink[]) => void
}

interface EditingLink {
  index: number | null // null means adding new
  url: string
  type: "Photos" | "Videos"
}

export default function MediaLinksEditor({ mediaLinks, onChange }: Props) {
  const [editing, setEditing] = useState<EditingLink | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startAdding = () => {
    setEditing({
      index: null,
      url: "",
      type: "Photos",
    })
    setError(null)
  }

  const startEditing = (index: number) => {
    const link = mediaLinks[index]
    setEditing({
      index,
      url: link.url,
      type: link.type,
    })
    setError(null)
  }

  const cancelEditing = () => {
    setEditing(null)
    setError(null)
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSave = () => {
    if (!editing) return

    // Validate URL
    if (!editing.url.trim()) {
      setError("URL is required")
      return
    }

    if (!isValidUrl(editing.url.trim())) {
      setError("Please enter a valid URL")
      return
    }

    const newLink: MediaLink = {
      url: editing.url.trim(),
      type: editing.type,
    }

    let updatedLinks: MediaLink[]
    if (editing.index === null) {
      // Adding new
      updatedLinks = [...mediaLinks, newLink]
    } else {
      // Editing existing
      updatedLinks = mediaLinks.map((link, i) => (i === editing.index ? newLink : link))
    }

    onChange(updatedLinks)
    setEditing(null)
    setError(null)
  }

  const handleDelete = (index: number) => {
    if (!confirm("Are you sure you want to remove this link?")) {
      return
    }
    onChange(mediaLinks.filter((_, i) => i !== index))
  }

  const getTypeInfo = (type: "Photos" | "Videos") => {
    return MEDIA_TYPES.find((t) => t.value === type) || MEDIA_TYPES[0]
  }

  return (
    <div className="media-links-editor">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      {/* Existing links */}
      <div className="media-links-list">
        {mediaLinks.map((link, index) => (
          <div key={index} className="media-link-card">
            {editing?.index === index ? (
              // Editing mode
              <div className="media-link-form">
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label>URL *</label>
                    <input
                      type="url"
                      value={editing.url}
                      onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                      className="admin-input"
                      placeholder="https://photos.google.com/..."
                    />
                  </div>
                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select
                      value={editing.type}
                      onChange={(e) =>
                        setEditing({ ...editing, type: e.target.value as "Photos" | "Videos" })
                      }
                      className="admin-select"
                    >
                      {MEDIA_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="media-link-actions">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="media-link-info">
                  <div className="media-link-type">
                    <i className={`bx ${getTypeInfo(link.type).icon}`} />
                    <span>{link.type}</span>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="media-link-url"
                  >
                    {link.url}
                    <i className="bx bx-link-external" />
                  </a>
                </div>
                <div className="media-link-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(index)}
                    className="admin-btn admin-btn-icon"
                    title="Edit"
                    disabled={editing !== null}
                  >
                    <i className="bx bx-edit" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="admin-btn admin-btn-icon admin-btn-danger"
                    title="Delete"
                    disabled={editing !== null}
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new form */}
      {editing?.index === null && (
        <div className="media-link-card media-link-new">
          <div className="media-link-form">
            <h4>Add Media Link</h4>
            <div className="admin-form-row">
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label>URL *</label>
                <input
                  type="url"
                  value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  className="admin-input"
                  placeholder="https://photos.google.com/... or https://youtube.com/..."
                />
                <p className="admin-form-help">Link to an external photo album or video playlist</p>
              </div>
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label>Type</label>
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value as "Photos" | "Videos" })
                  }
                  className="admin-select"
                >
                  {MEDIA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="media-link-actions">
              <button
                type="button"
                onClick={handleSave}
                className="admin-btn admin-btn-primary admin-btn-sm"
              >
                Add Media Link
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!editing && (
        <button type="button" onClick={startAdding} className="admin-btn admin-btn-secondary">
          <i className="bx bx-plus" />
          Add Media Link
        </button>
      )}

      {mediaLinks.length === 0 && !editing && (
        <p className="media-links-empty">
          No external photo or video links added yet. Add links to Google Photos, Flickr, YouTube
          playlists, etc.
        </p>
      )}
    </div>
  )
}
