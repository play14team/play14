"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import SimpleEditor from "@/components/ui/simple-editor"
import { useToast } from "@/components/admin/toast"
import {
  updatePlayer,
  updatePlayerPosition,
  type PlayerForEdit,
  type PlayerUpdateData,
} from "../players.action"

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
  player: PlayerForEdit
  currentUserPosition: string
}

/**
 * Get the allowed position transitions based on the current user's position
 */
function getAllowedPositions(
  currentUserPosition: string,
  targetCurrentPosition: string
): string[] {
  if (currentUserPosition === "Founder") {
    // Founders can set any position
    return [...POSITION_OPTIONS]
  }

  if (currentUserPosition === "Mentor") {
    // Mentors can: Player → Host, Host → Mentor
    if (targetCurrentPosition === "Player") {
      return ["Player", "Host"]
    }
    if (targetCurrentPosition === "Host") {
      return ["Host", "Mentor"]
    }
    // Cannot change Mentor or Founder positions
    return [targetCurrentPosition]
  }

  if (currentUserPosition === "Host") {
    // Hosts can only: Player → Host
    if (targetCurrentPosition === "Player") {
      return ["Player", "Host"]
    }
    // Cannot change any other positions
    return [targetCurrentPosition]
  }

  // Players cannot change positions
  return [targetCurrentPosition]
}

export default function PlayerEditForm({ player, currentUserPosition }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const allowedPositions = getAllowedPositions(currentUserPosition, player.position)
  const canChangePosition = allowedPositions.length > 1

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Update profile data
    const data: PlayerUpdateData = {
      name,
      company: company || undefined,
      tagline: tagline || undefined,
      bio: bio || undefined,
      website: website || undefined,
      socialNetworks: socialNetworks.filter((sn) => sn.url.trim() !== ""),
    }

    const profileResult = await updatePlayer(player.documentId, data)

    if (!profileResult.success) {
      toast.error(profileResult.error || "Failed to update profile")
      setIsSubmitting(false)
      return
    }

    // Update position if changed
    if (position !== player.position) {
      const positionResult = await updatePlayerPosition(player.documentId, position)
      if (!positionResult.success) {
        toast.error(positionResult.error || "Failed to update position")
        setIsSubmitting(false)
        return
      }
    }

    toast.success("Player profile updated!")
    router.refresh()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-section">
        <h2>Basic Information</h2>

        <div className="admin-form-row">
          <div className="admin-form-group admin-form-avatar">
            <label>Avatar</label>
            <div className="admin-avatar-container">
              {player.avatar?.url ? (
                <div className="admin-avatar-preview">
                  <Image
                    src={player.avatar.url}
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
            </div>
            <p className="admin-form-help">
              Avatar can only be changed by the player themselves
            </p>
          </div>
        </div>

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
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="position">Position *</label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
              disabled={!canChangePosition}
              className="admin-select"
            >
              {allowedPositions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            {!canChangePosition && (
              <p className="admin-form-help">
                You don&apos;t have permission to change this player&apos;s position
              </p>
            )}
            {canChangePosition && currentUserPosition !== "Founder" && (
              <p className="admin-form-help">
                You can only promote players, not demote them
              </p>
            )}
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
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="tagline">Tagline</label>
            <input
              type="text"
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              className="admin-input"
              placeholder="A short description about yourself"
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
            <label htmlFor="bio">Bio</label>
            <SimpleEditor content={bio} onChange={setBio} placeholder="Write a bio..." />
          </div>
        </div>

        <div className="admin-form-row">
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
      </div>

      <div className="admin-form-section">
        <h2>Social Networks</h2>

        {socialNetworks.length === 0 ? (
          <p className="admin-form-empty">No social networks added yet.</p>
        ) : (
          <div className="admin-form-social-list">
            {socialNetworks.map((network, index) => (
              <div key={index} className="admin-form-social-item">
                <select
                  value={network.type}
                  onChange={(e) =>
                    handleSocialNetworkChange(index, "type", e.target.value)
                  }
                  className="admin-select"
                >
                  {SOCIAL_NETWORK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={network.url}
                  onChange={(e) =>
                    handleSocialNetworkChange(index, "url", e.target.value)
                  }
                  placeholder="https://..."
                  className="admin-input"
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-icon admin-btn-danger"
                  onClick={() => handleRemoveSocialNetwork(index)}
                >
                  <i className="bx bx-trash"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={handleAddSocialNetwork}
        >
          <i className="bx bx-plus"></i>
          Add Social Network
        </button>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-save"></i>
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}
