"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  createSponsor,
  getAvailableSponsors,
  type Sponsor,
  type Sponsorship,
} from "@/app/[locale]/(admin)/admin/events/[slug]/sponsor.action"

const DEFAULT_CATEGORIES = ["Gold", "Silver", "Bronze", "Partner"]

interface Props {
  sponsorships: Sponsorship[]
  onChange: (sponsorships: Sponsorship[]) => void
}

export default function SponsorEditor({ sponsorships, onChange }: Props) {
  const t = useTranslations("adminEvents.sponsorEditor")
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
    setError(result.error || t("failedToCreate"))
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
                title={t("removeCategory", { category: sponsorship.category })}
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
                    title={t("removeSponsor")}
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
                <option value="">{t("addSponsor")}</option>
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
                {t("new")}
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
                placeholder={t("enterCategoryName")}
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
                {t("add")}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => {
                  setCustomCategoryName("")
                  setShowCustomCategoryInput(false)
                }}
              >
                {t("cancel")}
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
              <option value="">{t("addCategory")}</option>
              {DEFAULT_CATEGORIES.filter(
                (cat) => !sponsorships.some((s) => s.category === cat)
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom">{t("customCategory")}</option>
            </select>
          )}
        </div>
      </div>

      {/* Create Sponsor Modal */}
      {showCreateModal && (
        <CreateSponsorModal
          existingSponsors={availableSponsors}
          onClose={() => {
            setShowCreateModal(false)
            setCreateForCategory(null)
          }}
          onCreate={handleCreateSponsor}
          onUseExisting={(sponsor) => {
            if (createForCategory) {
              addSponsorToCategory(createForCategory, sponsor)
            }
            setShowCreateModal(false)
            setCreateForCategory(null)
          }}
        />
      )}
    </div>
  )
}

// Create Sponsor Modal Component
interface CreateSponsorModalProps {
  existingSponsors: Sponsor[]
  onClose: () => void
  onCreate: (name: string, url: string) => Promise<Sponsor | null>
  onUseExisting: (sponsor: Sponsor) => void
}

function CreateSponsorModal({
  existingSponsors,
  onClose,
  onCreate,
  onUseExisting,
}: CreateSponsorModalProps) {
  const t = useTranslations("adminEvents.sponsorEditor")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // A sponsor list is global: creating a duplicate name is rejected by the API,
  // so surface the existing one instead of letting the user hit that dead end.
  const duplicate = existingSponsors.find(
    (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!name.trim()) {
      setError(t("nameRequiredError"))
      return
    }

    setIsCreating(true)
    setError(null)

    const result = await onCreate(name.trim(), url.trim())
    if (!result) {
      setError(t("failedToCreate"))
    }

    setIsCreating(false)
  }

  const modalContent = (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal sponsor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{t("createNewSponsor")}</h3>
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

          {duplicate && (
            <div className="admin-alert admin-alert-warning admin-alert-sm">
              <i className="bx bx-info-circle" />
              <span>{t("duplicateHint", { name: duplicate.name })}</span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => onUseExisting(duplicate)}
              >
                {t("useExisting")}
              </button>
            </div>
          )}

          <div className="admin-form-group">
            <label htmlFor="sponsorName">{t("nameRequired")}</label>
            <input
              type="text"
              id="sponsorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              placeholder={t("sponsorNamePlaceholder")}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="sponsorUrl">{t("websiteUrl")}</label>
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
            {t("cancel")}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSubmit}
            disabled={isCreating || !name.trim() || Boolean(duplicate)}
          >
            {isCreating ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                {t("creating")}
              </>
            ) : (
              <>
                <i className="bx bx-plus" />
                {t("createSponsor")}
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
