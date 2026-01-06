"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { PlayerProfile } from "@/libs/api/players"
import {
  uploadPlayerPicture,
  deletePlayerPicture,
} from "@/libs/api/players"
import { updatePlayerProfile, type PlayerUpdateData } from "./player-profile.action"
import SimpleEditor from "@/components/ui/simple-editor"
import ImageCropper from "./image-cropper"
import PlayerProfileActions from "./player-profile-actions"
import { useToast } from "./toast"

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

const POSITION_OPTIONS = ["Player", "Host", "Mentor", "Founder"] as const

interface SocialNetworkInput {
  id?: string
  type: string
  url: string
}

interface Props {
  player: PlayerProfile
}

export default function PlayerProfileForm({ player }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)

  // Form state
  const [name, setName] = useState(player.name)
  const [position, setPosition] = useState(player.position)
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

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)


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

      // Calculate new size (maintain aspect ratio, fit within maxSize)
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

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to WebP blob for optimized file size
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      setIsUploadingPicture(false)
      return
    }

    // Validate file size (10MB before processing)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      setIsUploadingPicture(false)
      return
    }

    // Load and process image
    const img = document.createElement("img")
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      // Check if image is square
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

        // Resize if image is larger than 800x800
        if (img.width > 800 || img.height > 800) {
          const resizedBlob = await resizeImage(img, 800)
          // Replace extension with .webp for optimized file size
          const baseName = file.name.replace(/\.[^/.]+$/, "")
          fileToUpload = new File([resizedBlob], `${baseName}.webp`, {
            type: "image/webp",
          })
        }

        // Upload the file
        const result = await uploadPlayerPicture(fileToUpload as File)

        if (result.success && result.player) {
          setCurrentAvatar(result.player.avatar)
          toast.success("Avatar updated!")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to upload avatar")
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
      // Create a file from the cropped blob with .webp extension
      const baseName = originalFile?.name?.replace(/\.[^/.]+$/, "") || "cropped"
      const croppedFile = new File([blob], `${baseName}.webp`, {
        type: "image/webp",
      })

      // Upload the cropped file
      const result = await uploadPlayerPicture(croppedFile)

      if (result.success && result.player) {
        setCurrentAvatar(result.player.avatar)
        toast.success("Avatar updated!")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to upload avatar")
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

    const result = await deletePlayerPicture()

    if (result.success && result.player) {
      setCurrentAvatar(result.player.avatar)
      toast.success("Avatar removed")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to delete avatar")
    }

    setIsUploadingPicture(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const data: PlayerUpdateData = {
      name,
      position,
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

    setIsSubmitting(false)
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
        <div className="profile-edit-layout">
          <div className="profile-edit-content">
            <div className="admin-form-section">
              <h2>Basic Information</h2>

              <div className="profile-header-row">
                <div className="profile-header-fields">
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label htmlFor="name">Name *</label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="admin-input"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="position">Position *</label>
                      <select
                        id="position"
                        value={position}
                        onChange={(e) =>
                          setPosition(e.target.value as typeof position)
                        }
                        required
                        disabled
                        className="admin-select"
                      >
                        {POSITION_OPTIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      <p className="admin-form-help">
                        Only other organizers can change your position
                      </p>
                    </div>
                  </div>

                  <div className="admin-form-row">
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
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-form-group admin-form-avatar">
                  <label>Avatar</label>
                  <div className="admin-avatar-container">
                    {currentAvatar?.url ? (
                      <div className="admin-avatar-preview">
                        <Image
                          src={currentAvatar.url}
                          alt={player.name}
                          width={120}
                          height={120}
                        />
                      </div>
                    ) : (
                      <div className="admin-avatar-placeholder">
                        <i className="bx bx-user"></i>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
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
                      }}
                      disabled={isUploadingPicture}
                      className="admin-avatar-edit-btn"
                      title="Change avatar"
                    >
                      <i className="bx bx-pencil"></i>
                    </button>
                  </div>
                  {isUploadingPicture && (
                    <div className="admin-avatar-uploading">
                      <i className="bx bx-loader-alt bx-spin"></i>
                      Uploading...
                    </div>
                  )}
                </div>
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
                Add links to your social media profiles to help others connect with
                you.
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

          <PlayerProfileActions
            playerSlug={player.slug}
            isSubmitting={isSubmitting}
          />
        </div>
      </form>
    </>
  )
}
