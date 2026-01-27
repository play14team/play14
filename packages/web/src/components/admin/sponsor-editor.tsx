"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  createSponsor,
  getAvailableSponsors,
  type Sponsor,
  type Sponsorship,
} from "@/app/(admin)/admin/events/[slug]/sponsor.action"

const DEFAULT_CATEGORIES = ["Gold", "Silver", "Bronze", "Partner"]

interface Props {
  sponsorships: Sponsorship[]
  onChange: (sponsorships: Sponsorship[]) => void
}

export default function SponsorEditor({ sponsorships, onChange }: Props) {
  const [availableSponsors, setAvailableSponsors] = useState<Sponsor[]>([])
  const [_isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForCategory, setCreateForCategory] = useState<string | null>(null)
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState("")

  const loadAvailableSponsors = useCallback(async () => {
    setIsLoading(true)
    const result = await getAvailableSponsors()
    if (result.success && result.data) {
      setAvailableSponsors(result.data)
    }
    setIsLoading(false)
  }, [])

  // Load available sponsors on mount
  useEffect(() => {
    loadAvailableSponsors()
  }, [loadAvailableSponsors])

  const addCategory = (category: string) => {
    if (sponsorships.some((s) => s.category === category)) {
      return // Category already exists
    }
    onChange([...sponsorships, { category, sponsors: [] }])
  }

  const removeCategory = (category: string) => {
    onChange(sponsorships.filter((s) => s.category !== category))
  }

  const addSponsorToCategory = (category: string, sponsor: Sponsor) => {
    onChange(
      sponsorships.map((s) => {
        if (s.category === category) {
          // Don't add if already in category
          if (s.sponsors.some((sp) => sp.documentId === sponsor.documentId)) {
            return s
          }
          return { ...s, sponsors: [...s.sponsors, sponsor] }
        }
        return s
      })
    )
  }

  const removeSponsorFromCategory = (category: string, sponsorDocId: string) => {
    onChange(
      sponsorships.map((s) => {
        if (s.category === category) {
          return {
            ...s,
            sponsors: s.sponsors.filter((sp) => sp.documentId !== sponsorDocId),
          }
        }
        return s
      })
    )
  }

  const handleCreateSponsor = async (name: string, url: string) => {
    setError(null)
    const result = await createSponsor({ name, url: url || undefined })

    if (result.success && result.data) {
      // Add to available sponsors
      setAvailableSponsors([...availableSponsors, result.data])

      // Add to the category if we know which one
      if (createForCategory) {
        addSponsorToCategory(createForCategory, result.data)
      }

      setShowCreateModal(false)
      setCreateForCategory(null)
      return result.data
    }
    setError(result.error || "Failed to create sponsor")
    return null
  }

  // Get sponsors not already in any category
  const getUnusedSponsors = useCallback(() => {
    const usedIds = new Set(sponsorships.flatMap((s) => s.sponsors.map((sp) => sp.documentId)))
    return availableSponsors.filter((s) => !usedIds.has(s.documentId))
  }, [availableSponsors, sponsorships])

  return (
    <div className="sponsor-editor">
      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      {/* Category Cards */}
      <div className="sponsor-categories">
        {sponsorships.map((sponsorship) => (
          <div key={sponsorship.category} className="sponsor-category-card">
            <div className="sponsor-category-header">
              <h4>{sponsorship.category}</h4>
              <button
                type="button"
                className="admin-btn-icon"
                onClick={() => removeCategory(sponsorship.category)}
                title={`Remove ${sponsorship.category} category`}
              >
                <i className="bx bx-trash" />
              </button>
            </div>

            <div className="sponsor-list">
              {sponsorship.sponsors.map((sponsor) => (
                <div key={sponsor.documentId} className="sponsor-chip">
                  {sponsor.logo?.url && (
                    <Image
                      src={sponsor.logo.formats?.thumbnail?.url || sponsor.logo.url}
                      alt={sponsor.name}
                      width={24}
                      height={24}
                      className="sponsor-chip-logo"
                    />
                  )}
                  <span className="sponsor-chip-name">{sponsor.name}</span>
                  <button
                    type="button"
                    className="sponsor-chip-remove"
                    onClick={() =>
                      removeSponsorFromCategory(sponsorship.category, sponsor.documentId)
                    }
                    title="Remove sponsor"
                  >
                    <i className="bx bx-x" />
                  </button>
                </div>
              ))}
            </div>

            <div className="sponsor-category-actions">
              <select
                className="admin-select admin-select-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const sponsor = availableSponsors.find((s) => s.documentId === e.target.value)
                    if (sponsor) {
                      addSponsorToCategory(sponsorship.category, sponsor)
                    }
                  }
                }}
              >
                <option value="">Add sponsor...</option>
                {getUnusedSponsors().map((sponsor) => (
                  <option key={sponsor.documentId} value={sponsor.documentId}>
                    {sponsor.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => {
                  setCreateForCategory(sponsorship.category)
                  setShowCreateModal(true)
                }}
              >
                <i className="bx bx-plus" />
                New
              </button>
            </div>
          </div>
        ))}

        {/* Add Category */}
        <div className="sponsor-add-category">
          {showCustomCategoryInput ? (
            <div className="custom-category-input">
              <input
                type="text"
                className="admin-input admin-input-sm"
                placeholder="Enter category name..."
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customCategoryName.trim()) {
                    addCategory(customCategoryName.trim())
                    setCustomCategoryName("")
                    setShowCustomCategoryInput(false)
                  } else if (e.key === "Escape") {
                    setCustomCategoryName("")
                    setShowCustomCategoryInput(false)
                  }
                }}
              />
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-sm"
                onClick={() => {
                  if (customCategoryName.trim()) {
                    addCategory(customCategoryName.trim())
                    setCustomCategoryName("")
                    setShowCustomCategoryInput(false)
                  }
                }}
                disabled={!customCategoryName.trim()}
              >
                Add
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => {
                  setCustomCategoryName("")
                  setShowCustomCategoryInput(false)
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              className="admin-select admin-select-sm"
              value=""
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  setShowCustomCategoryInput(true)
                } else if (e.target.value) {
                  addCategory(e.target.value)
                }
              }}
            >
              <option value="">Add category...</option>
              {DEFAULT_CATEGORIES.filter(
                (cat) => !sponsorships.some((s) => s.category === cat)
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom">Custom category...</option>
            </select>
          )}
        </div>
      </div>

      {/* Create Sponsor Modal */}
      {showCreateModal && (
        <CreateSponsorModal
          onClose={() => {
            setShowCreateModal(false)
            setCreateForCategory(null)
          }}
          onCreate={handleCreateSponsor}
        />
      )}
    </div>
  )
}

// Create Sponsor Modal Component
interface CreateSponsorModalProps {
  onClose: () => void
  onCreate: (name: string, url: string) => Promise<Sponsor | null>
}

function CreateSponsorModal({ onClose, onCreate }: CreateSponsorModalProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsCreating(true)
    setError(null)

    const result = await onCreate(name.trim(), url.trim())
    if (!result) {
      setError("Failed to create sponsor")
    }

    setIsCreating(false)
  }

  const modalContent = (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal sponsor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Create New Sponsor</h3>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="admin-modal-body">
          {error && (
            <div className="admin-alert admin-alert-error admin-alert-sm">
              <i className="bx bx-error-circle" />
              {error}
            </div>
          )}

          <div className="admin-form-group">
            <label htmlFor="sponsorName">Name *</label>
            <input
              type="text"
              id="sponsorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              placeholder="Sponsor name"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="sponsorUrl">Website URL</label>
            <input
              type="url"
              id="sponsorUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="admin-input"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
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
      </div>
    </div>
  )

  // Use portal to render modal outside the form hierarchy
  if (!mounted) return null
  return createPortal(modalContent, document.body)
}
