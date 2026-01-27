"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/admin/toast"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import { useBeforeUnload, useFormDirty } from "@/hooks/use-form-dirty"
import { getPlayers, type PlayerListItem } from "../../players/players.action"
import {
  type ContributorInfo,
  deleteLikedItem,
  type LikedItemForEdit,
  removeLikedItemImage,
  updateLikedItem,
  uploadLikedItemImage,
} from "../liked-items.action"

interface Props {
  item: LikedItemForEdit
}

export default function LikedItemEditForm({ item }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Navigation warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  // Form state
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description || "")
  const [url, setUrl] = useState(item.url)
  const [contributors, setContributors] = useState<ContributorInfo[]>(item.contributors || [])
  const [currentImage, setCurrentImage] = useState(item.image)

  // Player search state
  const [playerSearch, setPlayerSearch] = useState("")
  const [playerResults, setPlayerResults] = useState<PlayerListItem[]>([])
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false)
  const playerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track dirty state
  const formValues = useMemo(
    () => ({
      name,
      description,
      url,
      contributors: JSON.stringify(contributors.map((c) => c.documentId).sort()),
    }),
    [name, description, url, contributors]
  )
  const { isDirty, resetDirtyState } = useFormDirty(formValues)

  // Browser beforeunload warning
  useBeforeUnload(isDirty)

  // Intercept Link clicks to warn about unsaved changes
  useEffect(() => {
    if (!isDirty) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (!link) return

      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return

      if (link.target === "_blank") return

      e.preventDefault()
      e.stopPropagation()
      pendingNavigationRef.current = href
      setShowUnsavedDialog(true)
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!isDirty) return

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href)
      setShowUnsavedDialog(true)
      pendingNavigationRef.current = "back"
    }

    window.history.pushState(null, "", window.location.href)
    window.addEventListener("popstate", handlePopState)

    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  // Player search with debounce
  useEffect(() => {
    if (playerSearchTimeoutRef.current) {
      clearTimeout(playerSearchTimeoutRef.current)
    }

    if (!playerSearch.trim()) {
      setPlayerResults([])
      return
    }

    playerSearchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingPlayers(true)
      try {
        const result = await getPlayers(undefined, 1, 10, playerSearch)
        // Filter out already selected contributors
        const selectedIds = contributors.map((c) => c.documentId)
        setPlayerResults(result.data.filter((p) => !selectedIds.includes(p.documentId)))
      } catch {
        // Ignore search errors
      }
      setIsSearchingPlayers(false)
    }, 300)

    return () => {
      if (playerSearchTimeoutRef.current) {
        clearTimeout(playerSearchTimeoutRef.current)
      }
    }
  }, [playerSearch, contributors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await updateLikedItem(item.documentId, {
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      contributorIds: contributors.map((c) => c.documentId),
    })

    if (!result.success) {
      toast.error(result.error || "Failed to update liked item")
      setIsSubmitting(false)
      return
    }

    toast.success("Liked item updated successfully!")
    resetDirtyState()
    router.refresh()
    setIsSubmitting(false)
  }

  const handleAddContributor = (player: PlayerListItem) => {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const normalizeUrl = (avatarUrl: string) =>
      avatarUrl.startsWith("http") ? avatarUrl : `${baseUrl}${avatarUrl}`

    setContributors([
      ...contributors,
      {
        documentId: player.documentId,
        name: player.name,
        slug: player.name.toLowerCase().replace(/\s+/g, "-"),
        avatar: player.avatar
          ? {
              url: normalizeUrl(player.avatar.url),
            }
          : null,
      },
    ])
    setPlayerSearch("")
    setPlayerResults([])
  }

  const handleRemoveContributor = (documentId: string) => {
    setContributors(contributors.filter((c) => c.documentId !== documentId))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    const formData = new FormData()
    formData.append("files", file)

    const result = await uploadLikedItemImage(item.documentId, formData)

    if (!result.success) {
      toast.error(result.error || "Failed to upload image")
    } else {
      toast.success("Image uploaded successfully!")
      router.refresh()
    }

    setIsUploadingImage(false)
    // Reset file input
    e.target.value = ""
  }

  const handleRemoveImage = async () => {
    const result = await removeLikedItemImage(item.documentId)

    if (!result.success) {
      toast.error(result.error || "Failed to remove image")
    } else {
      toast.success("Image removed successfully!")
      setCurrentImage(null)
      router.refresh()
    }
  }

  // Navigation handlers for unsaved changes dialog
  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const result = await updateLikedItem(item.documentId, {
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      contributorIds: contributors.map((c) => c.documentId),
    })

    if (result.success) {
      toast.success("Liked item updated successfully!")
      resetDirtyState()
      setShowUnsavedDialog(false)

      const destination = pendingNavigationRef.current
      pendingNavigationRef.current = null

      if (destination === "back") {
        router.back()
      } else if (destination) {
        router.push(destination)
      }
    } else {
      toast.error(result.error || "Failed to update liked item")
    }

    setIsSubmitting(false)
  }, [item.documentId, name, description, url, contributors, toast, resetDirtyState, router])

  const handleDiscardAndNavigate = useCallback(() => {
    resetDirtyState()
    setShowUnsavedDialog(false)

    const destination = pendingNavigationRef.current
    pendingNavigationRef.current = null

    if (destination === "back") {
      router.back()
    } else if (destination) {
      router.push(destination)
    }
  }, [resetDirtyState, router])

  const handleCancelNavigation = useCallback(() => {
    pendingNavigationRef.current = null
    setShowUnsavedDialog(false)
  }, [])

  const handleDiscard = useCallback(() => {
    setName(item.name)
    setDescription(item.description || "")
    setUrl(item.url)
    setContributors(item.contributors || [])

    resetDirtyState({
      name: item.name,
      description: item.description || "",
      url: item.url,
      contributors: JSON.stringify((item.contributors || []).map((c) => c.documentId).sort()),
    })
  }, [item, resetDirtyState])

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteLikedItem(item.documentId)

    if (!result.success) {
      toast.error(result.error || "Failed to delete liked item")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success("Liked item deleted successfully!")
    router.push("/admin/likes")
  }

  const getImageUrl = (): string | null => {
    if (!currentImage) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const imageUrl =
      currentImage.formats?.medium?.url || currentImage.formats?.small?.url || currentImage.url
    return imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`
  }

  const getAvatarUrl = (contributor: ContributorInfo): string | null => {
    if (!contributor.avatar) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const avatarUrl = contributor.avatar.url
    return avatarUrl.startsWith("http") ? avatarUrl : `${baseUrl}${avatarUrl}`
  }

  const getPlayerAvatarUrl = (player: PlayerListItem): string | null => {
    if (!player.avatar) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    return player.avatar.url.startsWith("http")
      ? player.avatar.url
      : `${baseUrl}${player.avatar.url}`
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form sponsor-edit-form">
      <div className="sponsor-edit-layout">
        <div className="sponsor-edit-details">
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
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Image</label>
                <div className="image-manager">
                  {getImageUrl() ? (
                    <div className="image-preview">
                      <Image
                        src={getImageUrl()!}
                        alt={item.name}
                        width={200}
                        height={200}
                        style={{ objectFit: "contain" }}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={handleRemoveImage}
                      >
                        <i className="bx bx-trash" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload">
                      <label className="admin-btn admin-btn-secondary">
                        <i className="bx bx-upload" />
                        {isUploadingImage ? "Uploading..." : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  )}
                </div>
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
              </div>
            </div>
          </div>

          <div className="admin-form-section">
            <h2>Contributors</h2>
            <p className="admin-form-section-description">
              Link players who created or recommend this item.
            </p>

            <div className="admin-form-row">
              <div className="admin-form-group full-width">
                {contributors.length > 0 && (
                  <div className="contributors-list">
                    {contributors.map((contributor) => {
                      const avatarUrl = getAvatarUrl(contributor)
                      return (
                        <div key={contributor.documentId} className="contributor-tag">
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={contributor.name}
                              width={24}
                              height={24}
                              style={{ borderRadius: "50%" }}
                            />
                          ) : (
                            <i className="bx bx-user" />
                          )}
                          <span>{contributor.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveContributor(contributor.documentId)}
                            className="contributor-remove"
                            title="Remove"
                          >
                            <i className="bx bx-x" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="player-search">
                  <div className="search-input-wrapper">
                    <i className="bx bx-search" />
                    <input
                      type="text"
                      placeholder="Search players to add..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="admin-input"
                    />
                    {isSearchingPlayers && <i className="bx bx-loader-alt bx-spin" />}
                  </div>

                  {playerResults.length > 0 && (
                    <div className="player-results">
                      {playerResults.map((player) => {
                        const avatarUrl = getPlayerAvatarUrl(player)
                        return (
                          <button
                            key={player.documentId}
                            type="button"
                            className="player-result"
                            onClick={() => handleAddContributor(player)}
                          >
                            {avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt={player.name}
                                width={28}
                                height={28}
                                style={{ borderRadius: "50%" }}
                              />
                            ) : (
                              <i className="bx bx-user" />
                            )}
                            <span>{player.name}</span>
                            {player.company && (
                              <span className="player-company">{player.company}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sponsor-edit-actions">
          <div className="action-buttons">
            <button
              type="submit"
              className={`admin-btn admin-btn-primary admin-btn-block ${isDirty ? "admin-btn-dirty" : ""}`}
              disabled={isSubmitting}
              data-save-shortcut
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bx bx-save" />
                  Save changes
                </>
              )}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                className="admin-btn admin-btn-danger-outline admin-btn-block"
              >
                <i className="bx bx-undo" />
                Discard changes
              </button>
            )}

            {!showDeleteConfirm && (
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-btn-block"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <i className="bx bx-trash" />
                Delete item
              </button>
            )}

            {showDeleteConfirm && (
              <div className="admin-delete-confirm">
                <span>Are you sure you want to delete this item?</span>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-block"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete"
                  )}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-block"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isDirty && (
            <div className="dirty-indicator">
              <i className="bx bx-edit-alt" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={isSubmitting}
      />

      <style jsx>{`
        .image-manager {
          margin-top: 0.5rem;
        }
        .image-preview {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .image-preview img {
          border-radius: 8px;
          background: var(--color-bg-tertiary);
        }
        .image-upload {
          display: flex;
          align-items: center;
        }
        .contributors-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .contributor-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--color-bg-secondary);
          border-radius: 20px;
          font-size: 0.875rem;
        }
        .contributor-tag i {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-tertiary);
          border-radius: 50%;
        }
        .contributor-remove {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
        }
        .contributor-remove:hover {
          color: var(--color-danger);
        }
        .player-search {
          position: relative;
        }
        .player-search .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .player-search .search-input-wrapper > i.bx-search {
          position: absolute;
          left: 12px;
          color: var(--color-text-secondary);
          pointer-events: none;
          z-index: 1;
        }
        .player-search .search-input-wrapper > i.bx-loader-alt {
          position: absolute;
          right: 12px;
          color: var(--color-text-secondary);
        }
        .player-search input {
          flex: 1;
          padding-left: 36px !important;
          padding-right: 36px !important;
        }
        .player-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--admin-card-bg, #fff);
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 8px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        :global([data-theme="dark"]) .player-results {
          background: var(--admin-card-bg, #1e1e1e);
        }
        .player-result {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          width: 100%;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--color-text-primary, #333);
        }
        .player-result:hover {
          background: var(--color-bg-secondary, #f5f5f5);
        }
        :global([data-theme="dark"]) .player-result {
          color: var(--color-text-primary, #fff);
        }
        :global([data-theme="dark"]) .player-result:hover {
          background: var(--color-bg-secondary, #2a2a2a);
        }
        .player-result i.bx-user {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-tertiary, #e0e0e0);
          border-radius: 50%;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .player-company {
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          margin-left: auto;
        }
      `}</style>
    </form>
  )
}
