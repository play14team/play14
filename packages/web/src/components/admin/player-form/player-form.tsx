"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { PlayerProfile } from "@/libs/api/players"
import { uploadPlayerPicture, deletePlayerPicture } from "@/libs/api/players"
import SimpleEditor from "@/components/ui/simple-editor"
import ImageCropper from "../image-cropper"
import MediaLibraryBrowser from "../media-library-browser"
import PlayerFormActions from "./player-form-actions"
import { useToast } from "../toast"
import {
  updatePlayerProfile,
  type PlayerUpdateData as ProfileUpdateData,
} from "../player-profile.action"
import {
  updatePlayer,
  updatePlayerPosition,
  setPlayerAvatarFromLibrary,
  removePlayerAvatar,
  uploadPlayerAvatar,
  type PlayerForEdit,
  type PlayerUpdateData as AdminUpdateData,
} from "@/app/(admin)/admin/players/players.action"

const SOCIAL_NETWORK_TYPES = [
  "Twitter",
  "LinkedIn",
  "Facebook",
  "Youtube",
  "Instagram",
  "Xing",
  "Email",
  "Website",
  "Wikipedia",
  "Vimeo",
  "Other",
] as const

const POSITION_HIERARCHY = ["Player", "Host", "Mentor", "Founder"] as const

interface SocialNetworkInput {
  id?: string
  type: string
  url: string
}

type PlayerData = PlayerProfile | PlayerForEdit

interface Props {
  player: PlayerData
  mode: "self" | "admin"
  currentUserPosition?: string
}

/**
 * Get the position index in the hierarchy
 */
function getPositionIndex(position: string): number {
  return POSITION_HIERARCHY.indexOf(position as (typeof POSITION_HIERARCHY)[number])
}

/**
 * Get the target position for promotion, or null if not allowed
 * Note: No one can be promoted to Founder - that's a protected position
 */
function getPromoteTarget(currentPosition: string, userPosition: string): string | null {
  const currentIndex = getPositionIndex(currentPosition)

  // Already at Mentor or Founder - no promotion allowed (Founder is protected)
  if (currentIndex >= 2) return null

  const nextPosition = POSITION_HIERARCHY[currentIndex + 1]

  // Founder can promote Player -> Host, Host -> Mentor (but not to Founder)
  if (userPosition === "Founder") return nextPosition

  // Host can only promote Player -> Host
  if (userPosition === "Host" && currentPosition === "Player") return "Host"

  // Mentor can promote Player -> Host, Host -> Mentor
  if (userPosition === "Mentor") {
    if (currentPosition === "Player") return "Host"
    if (currentPosition === "Host") return "Mentor"
  }

  return null
}

/**
 * Get the target position for demotion, or null if not allowed
 * Note: Founders cannot be demoted - that's a protected position
 */
function getDemoteTarget(currentPosition: string, userPosition: string): string | null {
  // Only Founders can demote
  if (userPosition !== "Founder") return null

  // Founders cannot be demoted
  if (currentPosition === "Founder") return null

  const currentIndex = getPositionIndex(currentPosition)

  // Already at bottom (Player)
  if (currentIndex <= 0) return null

  return POSITION_HIERARCHY[currentIndex - 1]
}

export default function PlayerForm({ player, mode, currentUserPosition = "Player" }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)

  // Form state
  const [name, setName] = useState(player.name)
  const [company, setCompany] = useState(player.company || "")
  const [tagline, setTagline] = useState(player.tagline || "")
  const [bio, setBio] = useState(player.bio || "")
  const [website, setWebsite] = useState(player.website || "")
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworkInput[]>(
    player.socialNetworks?.map((sn) => ({
      id: sn.id,
      type: sn.type,
      url: sn.url,
    })) || []
  )
  const [currentAvatar, setCurrentAvatar] = useState(player.avatar)

  // Position state (admin mode only - changes are immediate)
  const [currentPosition, setCurrentPosition] = useState(player.position)
  const [isPositionUpdating, setIsPositionUpdating] = useState(false)

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  // Media library state (available to organizers in both modes)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)

  // Position action calculations (admin mode only)
  const promoteTarget = mode === "admin" ? getPromoteTarget(currentPosition, currentUserPosition) : null
  const demoteTarget = mode === "admin" ? getDemoteTarget(currentPosition, currentUserPosition) : null
  // In self mode, check the player's own position; in admin mode, check the current user's position
  const isOrganizer = mode === "self"
    ? player.position !== "Player"
    : currentUserPosition !== "Player"

  const handleAddSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { type: "LinkedIn", url: "" }])
  }

  const handleRemoveSocialNetwork = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index))
  }

  const handleSocialNetworkChange = (
    index: number,
    field: "type" | "url",
    value: string
  ) => {
    const updated = [...socialNetworks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialNetworks(updated)
  }

  // ============================================
  // Avatar handling - Self mode (with cropper)
  // ============================================

  const resizeImage = (
    img: HTMLImageElement,
    maxSize: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      let width = img.width
      let height = img.height

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob"))
          }
        },
        "image/webp",
        0.9
      )
    })
  }

  const validateAndUploadPicture = async (file: File) => {
    setIsUploadingPicture(true)

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      setIsUploadingPicture(false)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      setIsUploadingPicture(false)
      return
    }

    const img = document.createElement("img")
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      if (img.width !== img.height) {
        // Show cropper for non-square images
        setImageToCrop(objectUrl)
        setOriginalFile(file)
        setShowCropper(true)
        setIsUploadingPicture(false)
        return
      }

      URL.revokeObjectURL(objectUrl)

      try {
        let fileToUpload: File | Blob = file

        if (img.width > 800 || img.height > 800) {
          const resizedBlob = await resizeImage(img, 800)
          const baseName = file.name.replace(/\.[^/.]+$/, "")
          fileToUpload = new File([resizedBlob], `${baseName}.webp`, {
            type: "image/webp",
          })
        }

        if (mode === "self") {
          const result = await uploadPlayerPicture(fileToUpload as File)
          if (result.success && result.player) {
            setCurrentAvatar(result.player.avatar)
            toast.success("Avatar updated!")
            router.refresh()
          } else {
            toast.error(result.error || "Failed to upload avatar")
          }
        } else {
          // Admin mode - use server action
          const formData = new FormData()
          formData.append("files", fileToUpload as File)
          const result = await uploadPlayerAvatar(player.documentId, formData)
          if (result.success) {
            if (result.avatarUrl) {
              setCurrentAvatar({ url: result.avatarUrl })
            }
            toast.success("Avatar uploaded!")
            router.refresh()
          } else {
            toast.error(result.error || "Failed to upload avatar")
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to process image"
        )
      }

      setIsUploadingPicture(false)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      toast.error("Failed to load image")
      setIsUploadingPicture(false)
    }

    img.src = objectUrl
  }

  const handleCroppedImage = async (blob: Blob) => {
    setShowCropper(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
    }
    setImageToCrop(null)
    setOriginalFile(null)
    setIsUploadingPicture(true)

    try {
      const baseName = originalFile?.name?.replace(/\.[^/.]+$/, "") || "cropped"
      const croppedFile = new File([blob], `${baseName}.webp`, {
        type: "image/webp",
      })

      if (mode === "self") {
        const result = await uploadPlayerPicture(croppedFile)
        if (result.success && result.player) {
          setCurrentAvatar(result.player.avatar)
          toast.success("Avatar updated!")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to upload avatar")
        }
      } else {
        // Admin mode
        const formData = new FormData()
        formData.append("files", croppedFile)
        const result = await uploadPlayerAvatar(player.documentId, formData)
        if (result.success) {
          if (result.avatarUrl) {
            setCurrentAvatar({ url: result.avatarUrl })
          }
          toast.success("Avatar uploaded!")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to upload avatar")
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image")
    }

    setIsUploadingPicture(false)
  }

  const handleCancelCrop = () => {
    setShowCropper(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
    }
    setImageToCrop(null)
    setOriginalFile(null)
  }

  const handlePictureDelete = async () => {
    setIsUploadingPicture(true)

    if (mode === "self") {
      const result = await deletePlayerPicture()
      if (result.success && result.player) {
        setCurrentAvatar(result.player.avatar)
        toast.success("Avatar removed")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete avatar")
      }
    } else {
      const result = await removePlayerAvatar(player.documentId)
      if (result.success) {
        setCurrentAvatar(null)
        toast.success("Avatar removed!")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to remove avatar")
      }
    }

    setIsUploadingPicture(false)
  }

  // ============================================
  // Avatar handling - Admin mode (media library)
  // ============================================

  const handleSelectAvatarFromLibrary = async (image: { id: number; url: string }) => {
    setIsUploadingPicture(true)
    const result = await setPlayerAvatarFromLibrary(player.documentId, image.id)
    if (result.success) {
      setCurrentAvatar({ url: image.url })
      toast.success("Avatar updated!")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to set avatar")
    }
    setIsUploadingPicture(false)
  }

  // ============================================
  // Position handling (admin mode only)
  // ============================================

  const handlePromote = async () => {
    if (!promoteTarget) return
    setIsPositionUpdating(true)
    const result = await updatePlayerPosition(player.documentId, promoteTarget)
    if (result.success) {
      setCurrentPosition(promoteTarget)
      toast.success(`Player promoted to ${promoteTarget}!`)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to promote player")
    }
    setIsPositionUpdating(false)
  }

  const handleDemote = async () => {
    if (!demoteTarget) return
    setIsPositionUpdating(true)
    const result = await updatePlayerPosition(player.documentId, demoteTarget)
    if (result.success) {
      setCurrentPosition(demoteTarget)
      toast.success(`Player demoted to ${demoteTarget}`)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to demote player")
    }
    setIsPositionUpdating(false)
  }

  // ============================================
  // Form submission
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (mode === "self") {
      const data: ProfileUpdateData = {
        name,
        position: currentPosition as "Player" | "Host" | "Mentor" | "Founder",
        company: company || undefined,
        tagline: tagline || undefined,
        bio: bio || undefined,
        website: website || undefined,
        socialNetworks: socialNetworks.filter((sn) => sn.url.trim() !== ""),
      }

      const result = await updatePlayerProfile(player.documentId, data)
      if (result.success) {
        toast.success("Profile updated successfully!")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    } else {
      const data: AdminUpdateData = {
        name,
        company: company || undefined,
        tagline: tagline || undefined,
        bio: bio || undefined,
        website: website || undefined,
        socialNetworks: socialNetworks.filter((sn) => sn.url.trim() !== ""),
      }

      const result = await updatePlayer(player.documentId, data)
      if (result.success) {
        toast.success("Player profile updated!")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    }

    setIsSubmitting(false)
  }

  // For avatar upload trigger
  const triggerFileUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await validateAndUploadPicture(file)
      }
    }
    input.click()
  }

  return (
    <>
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
        />
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="player-form-layout">
          <div className="player-form-content">
            <div className="admin-form-section">
              <h2>Basic Information</h2>

              {/* 3-column header: fields | fields | avatar */}
              <div className="player-form-header">
                <div className="player-form-header-fields">
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
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="tagline">Tagline</label>
                    <input
                      type="text"
                      id="tagline"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="admin-input"
                      placeholder="A short description about yourself"
                      maxLength={150}
                    />
                    <p className="admin-form-help">{tagline.length}/150 characters</p>
                  </div>
                </div>

                <div className="player-form-header-fields">
                  <div className="admin-form-group">
                    <label htmlFor="company">Company</label>
                    <input
                      type="text"
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="admin-input"
                      placeholder="Your company or organization"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="website">Website</label>
                    <input
                      type="url"
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="admin-input"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Avatar column */}
                <div className="player-form-header-avatar">
                  <label>Avatar</label>
                  <div className="admin-avatar-container">
                    {currentAvatar?.url ? (
                      <div className="admin-avatar-preview">
                        <Image
                          src={currentAvatar.url}
                          alt={player.name}
                          width={160}
                          height={160}
                        />
                      </div>
                    ) : (
                      <div className="admin-avatar-placeholder">
                        <i className="bx bx-user"></i>
                      </div>
                    )}
                  </div>
                  {isUploadingPicture && (
                    <div className="admin-avatar-uploading">
                      <i className="bx bx-loader-alt bx-spin"></i>
                      Uploading...
                    </div>
                  )}
                  {/* Avatar action buttons - icon only with tooltips */}
                  {(mode === "self" || isOrganizer) && (
                    <div className="player-form-avatar-actions">
                      {/* Upload */}
                      <button
                        type="button"
                        className="admin-btn-icon admin-btn-secondary"
                        onClick={triggerFileUpload}
                        disabled={isUploadingPicture}
                        title="Upload new avatar"
                      >
                        <i className="bx bx-upload"></i>
                      </button>
                      {/* Library (organizers only) */}
                      {isOrganizer && (
                        <button
                          type="button"
                          className="admin-btn-icon admin-btn-secondary"
                          onClick={() => setIsMediaLibraryOpen(true)}
                          disabled={isUploadingPicture}
                          title="Select from media library"
                        >
                          <i className="bx bx-images"></i>
                        </button>
                      )}
                      {/* Remove */}
                      {currentAvatar?.url && (
                        <button
                          type="button"
                          className="admin-btn-icon admin-btn-danger"
                          onClick={handlePictureDelete}
                          disabled={isUploadingPicture}
                          title="Remove avatar"
                        >
                          <i className="bx bx-trash"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio below header */}
              <div className="admin-form-group">
                <label htmlFor="bio">Bio</label>
                <SimpleEditor
                  content={bio}
                  onChange={setBio}
                  placeholder="Tell us about yourself, your experience with #play14, and what you're passionate about..."
                />
              </div>
            </div>

            <div className="admin-form-section">
              <h2>Social Networks</h2>
              <p className="admin-form-section-description">
                Add links to your social media profiles to help others connect with you.
              </p>

              <div className="admin-social-networks">
                {socialNetworks.map((sn, index) => (
                  <div key={index} className="admin-social-network-row">
                    <select
                      value={sn.type}
                      onChange={(e) =>
                        handleSocialNetworkChange(index, "type", e.target.value)
                      }
                      className="admin-select admin-select-sm"
                    >
                      {SOCIAL_NETWORK_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={sn.url}
                      onChange={(e) =>
                        handleSocialNetworkChange(index, "url", e.target.value)
                      }
                      className="admin-input"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSocialNetwork(index)}
                      className="admin-btn-icon admin-btn-danger"
                      title="Remove"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSocialNetwork}
                  className="admin-btn admin-btn-secondary"
                >
                  <i className="bx bx-plus"></i>
                  Add Social Network
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <PlayerFormActions
            playerSlug={player.slug}
            isSubmitting={isSubmitting}
            mode={mode}
            currentPosition={currentPosition}
            isPositionUpdating={isPositionUpdating}
            promoteTarget={promoteTarget}
            demoteTarget={demoteTarget}
            onPromote={handlePromote}
            onDemote={handleDemote}
          />
        </div>
      </form>

      {isOrganizer && (
        <MediaLibraryBrowser
          isOpen={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
          onSelect={handleSelectAvatarFromLibrary}
          title="Select Avatar"
        />
      )}
    </>
  )
}
