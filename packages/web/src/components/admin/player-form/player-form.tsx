"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type PlayerUpdateData as AdminUpdateData,
  type PlayerForEdit,
  type PlayerSettingsData,
  updatePlayer,
  updatePlayerPosition,
} from "@/app/[locale]/(admin)/admin/players/players.action"
import type { StripeAccountStatus } from "@/app/[locale]/(admin)/admin/stripe/stripe-connect.action"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import SimpleEditor from "@/components/ui/simple-editor"
import { useBeforeUnload, useFormDirty } from "@/hooks/use-form-dirty"
import type { PlayerProfile } from "@/libs/api/players"
import type { GeoLocation } from "@/models/strapi"
import {
  type PlayerUpdateData as ProfileUpdateData,
  updatePlayerProfile,
} from "../player-profile.action"
import { useToast } from "../toast"
import AdminSettingsTab from "./admin-settings-tab"
import PlayerAvatarManager from "./player-avatar-manager"
import PlayerFormActions from "./player-form-actions"
import ProfileTabs, { type ProfileTabId } from "./profile-tabs"
import type { SettingsData } from "./settings.action"
import SettingsTab from "./settings-tab"
import StripeTab from "./stripe-tab"

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

function getSocialNetworkIcon(type: string): string {
  switch (type) {
    case "Email":
      return "bx bx-envelope"
    case "Website":
      return "bx bx-globe"
    case "Wikipedia":
      return "bx bxl-wikipedia"
    case "Xing":
      return "bx bxl-xing"
    case "Other":
      return "bx bx-link"
    default:
      return `bx bxl-${type.toLowerCase()}`
  }
}

const POSITION_HIERARCHY = ["Player", "Host", "Mentor", "Founder"] as const

interface SocialNetworkInput {
  id?: string
  socialNetworkType: string
  url: string
}

type PlayerData = PlayerProfile | PlayerForEdit

interface Props {
  player: PlayerData
  mode: "self" | "admin"
  currentUserPosition?: string
  stripeAccount?: StripeAccountStatus | null
  settingsData?: SettingsData | null
  adminSettings?: PlayerSettingsData | null
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

function normalizeMapLocation(
  location?: string | GeoLocation | MapLocation | null
): MapLocation | null {
  if (!location || typeof location === "string") return null

  if ("geometry" in location && location.geometry?.coordinates) {
    return {
      geometry: {
        coordinates: location.geometry.coordinates as [number, number],
        type: location.geometry.type,
      },
      place_name: location.place_name,
    }
  }

  if ("lat" in location && "lng" in location) {
    const lat = typeof location.lat === "number" ? location.lat : undefined
    const lng = typeof location.lng === "number" ? location.lng : undefined
    if (lat === undefined || lng === undefined) return null
    return {
      geometry: {
        coordinates: [lng, lat],
        type: "Point",
      },
      place_name: location.place_name,
    }
  }

  return null
}

export default function PlayerForm({
  player,
  mode,
  currentUserPosition = "Player",
  stripeAccount,
  settingsData,
  adminSettings,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTabId>("profile")

  // Navigation warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  // Form state
  const [name, setName] = useState(player.name)
  const [company, setCompany] = useState(player.company || "")
  const [tagline, setTagline] = useState(player.tagline || "")
  const [bio, setBio] = useState(player.bio || "")
  const [website, setWebsite] = useState(player.website || "")
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworkInput[]>(
    player.socialNetworks?.map((sn) => ({
      id: sn.id,
      socialNetworkType: sn.socialNetworkType,
      url: sn.url,
    })) || []
  )
  const [visible, setVisible] = useState(player.visible !== false)
  const [currentAvatar, setCurrentAvatar] = useState(player.avatar)
  const initialMapLocation = useMemo(() => normalizeMapLocation(player.location), [player.location])
  const initialMapLocationRef = useRef<MapLocation | null>(initialMapLocation)
  useEffect(() => {
    initialMapLocationRef.current = initialMapLocation
  }, [initialMapLocation])
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(initialMapLocation)
  const [locationTouched, setLocationTouched] = useState(false)
  const locationCenter = typeof player.location === "string" ? player.location : undefined

  // Position state (admin mode only - changes are immediate)
  const [currentPosition, setCurrentPosition] = useState(player.position)
  const [isPositionUpdating, setIsPositionUpdating] = useState(false)

  // Track dirty state
  const formValues = useMemo(
    () => ({ name, company, tagline, bio, website, visible, socialNetworks, mapLocation }),
    [name, company, tagline, bio, website, visible, socialNetworks, mapLocation]
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

      // Check if it's an internal navigation link
      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return

      // Check if it's an external link (opens in new tab)
      if (link.target === "_blank") return

      // Prevent navigation and show dialog
      e.preventDefault()
      e.stopPropagation()
      pendingNavigationRef.current = href
      setShowUnsavedDialog(true)
    }

    // Capture phase to intercept before Next.js router
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!isDirty) return

    const handlePopState = () => {
      // Push current state back to prevent navigation
      window.history.pushState(null, "", window.location.href)
      setShowUnsavedDialog(true)
      pendingNavigationRef.current = "back"
    }

    // Push initial state
    window.history.pushState(null, "", window.location.href)
    window.addEventListener("popstate", handlePopState)

    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  // Position action calculations (admin mode only)
  const promoteTarget =
    mode === "admin" ? getPromoteTarget(currentPosition, currentUserPosition) : null
  const demoteTarget =
    mode === "admin" ? getDemoteTarget(currentPosition, currentUserPosition) : null
  // In self mode, check the player's own position; in admin mode, check the current user's position
  const isOrganizer =
    mode === "self" ? player.position !== "Player" : currentUserPosition !== "Player"

  const handleAddSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { socialNetworkType: "LinkedIn", url: "" }])
  }

  const handleRemoveSocialNetwork = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index))
  }

  const handleSocialNetworkChange = (
    index: number,
    field: "socialNetworkType" | "url",
    value: string
  ) => {
    const updated = [...socialNetworks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialNetworks(updated)
  }

  const handleMapLocationChange = useCallback((location: MapLocation | null) => {
    setMapLocation(location)
    setLocationTouched(true)
  }, [])

  // ============================================
  // Position handling (admin mode only)
  // ============================================

  const handlePromote = async () => {
    if (!promoteTarget) return
    setIsPositionUpdating(true)
    const result = await updatePlayerPosition(player.documentId, promoteTarget, player.slug)
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
    const result = await updatePlayerPosition(player.documentId, demoteTarget, player.slug)
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

    const data = buildFormData()
    const result =
      mode === "self"
        ? await updatePlayerProfile(player.documentId, data as ProfileUpdateData, player.slug)
        : await updatePlayer(player.documentId, data as AdminUpdateData, player.slug)

    if (result.success) {
      toast.success(mode === "self" ? "Profile updated successfully!" : "Player profile updated!")
      resetDirtyState()
      setLocationTouched(false)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update profile")
    }

    setIsSubmitting(false)
  }

  // ============================================
  // Navigation handlers for unsaved changes dialog
  // ============================================

  const buildFormData = useCallback(() => {
    const locationValue = locationTouched ? normalizeMapLocation(mapLocation) : undefined
    const locationPayload = locationTouched ? { location: locationValue } : {}
    if (mode === "self") {
      return {
        name,
        position: currentPosition as "Player" | "Host" | "Mentor" | "Founder",
        company: company || undefined,
        tagline: tagline || undefined,
        bio: bio || undefined,
        website: website || undefined,
        visible,
        socialNetworks: socialNetworks.filter((sn) => sn.url.trim() !== ""),
        ...locationPayload,
      }
    }
    return {
      name,
      company: company || undefined,
      tagline: tagline || undefined,
      bio: bio || undefined,
      website: website || undefined,
      visible,
      socialNetworks: socialNetworks.filter((sn) => sn.url.trim() !== ""),
      ...locationPayload,
    }
  }, [
    mode,
    name,
    currentPosition,
    company,
    tagline,
    bio,
    website,
    visible,
    socialNetworks,
    mapLocation,
    locationTouched,
  ])

  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const data = buildFormData()
    const result =
      mode === "self"
        ? await updatePlayerProfile(player.documentId, data as ProfileUpdateData, player.slug)
        : await updatePlayer(player.documentId, data as AdminUpdateData, player.slug)

    if (result.success) {
      toast.success(mode === "self" ? "Profile updated successfully!" : "Player profile updated!")
      resetDirtyState()
      setLocationTouched(false)
      setShowUnsavedDialog(false)

      // Navigate after save
      const destination = pendingNavigationRef.current
      pendingNavigationRef.current = null

      if (destination === "back") {
        router.back()
      } else if (destination) {
        router.push(destination)
      }
    } else {
      toast.error(result.error || "Failed to update profile")
    }

    setIsSubmitting(false)
  }, [buildFormData, mode, player.documentId, player.slug, toast, resetDirtyState, router])

  const handleDiscardAndNavigate = useCallback(() => {
    resetDirtyState()
    setShowUnsavedDialog(false)
    setLocationTouched(false)

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
    // Reset form to initial values
    const initialName = player.name
    const initialCompany = player.company || ""
    const initialTagline = player.tagline || ""
    const initialBio = player.bio || ""
    const initialWebsite = player.website || ""
    const initialVisible = player.visible !== false
    const initialMapLocation = initialMapLocationRef.current
    const initialSocialNetworks =
      player.socialNetworks?.map((sn) => ({
        id: sn.id,
        socialNetworkType: sn.socialNetworkType,
        url: sn.url,
      })) || []

    setName(initialName)
    setCompany(initialCompany)
    setTagline(initialTagline)
    setBio(initialBio)
    setWebsite(initialWebsite)
    setVisible(initialVisible)
    setMapLocation(initialMapLocation)
    setSocialNetworks(initialSocialNetworks)
    setLocationTouched(false)

    // Pass the initial values to resetDirtyState to avoid stale closure issue
    resetDirtyState({
      name: initialName,
      company: initialCompany,
      tagline: initialTagline,
      bio: initialBio,
      website: initialWebsite,
      visible: initialVisible,
      mapLocation: initialMapLocation,
      socialNetworks: initialSocialNetworks,
    })
  }, [player, resetDirtyState])

  // Show Stripe tab only in self mode for organizers
  const showStripeTab = mode === "self" && isOrganizer
  const showSettingsTab = mode === "self" || (mode === "admin" && !!adminSettings)

  return (
    <>
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showStripeTab={showStripeTab}
        showSettingsTab={showSettingsTab}
      />

      {activeTab === "profile" && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="player-form-layout">
            <div className="player-form-content">
              <div className="admin-form-section">
                <h2>Basic Information</h2>

                <div className="admin-form-group">
                  <label className="admin-toggle-option">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={(e) => setVisible(e.target.checked)}
                    />
                    <span className="admin-toggle-track">
                      <span className="admin-toggle-thumb" />
                    </span>
                    {visible
                      ? "Profile visible on the public players page"
                      : "Profile hidden from the public players page"}
                  </label>
                </div>

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
                    <PlayerAvatarManager
                      playerId={player.documentId}
                      playerSlug={player.slug}
                      avatar={currentAvatar}
                      mode={mode}
                      showLibraryButton={isOrganizer}
                      onAvatarChange={setCurrentAvatar}
                    />
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

              <div className="location-social-row">
                <div className="admin-form-section">
                  <h2>Location</h2>
                  <p className="admin-form-section-description">
                    Search for your city or region to set your location.
                  </p>
                  <LocationMapPicker
                    value={mapLocation}
                    onChange={handleMapLocationChange}
                    centerOnLocation={locationCenter}
                    precision="city"
                  />
                </div>

                <div className="admin-form-section">
                  <h2>Social Networks</h2>
                  <p className="admin-form-section-description">
                    Add links to your social media profiles to help others connect with you.
                  </p>

                  <div className="admin-social-networks">
                    {socialNetworks.map((sn, index) => (
                      <div key={index} className="admin-social-network-row">
                        <i
                          className={`${getSocialNetworkIcon(sn.socialNetworkType)} admin-social-network-icon`}
                          title={sn.socialNetworkType}
                        />
                        <select
                          value={sn.socialNetworkType}
                          onChange={(e) =>
                            handleSocialNetworkChange(index, "socialNetworkType", e.target.value)
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
                          onChange={(e) => handleSocialNetworkChange(index, "url", e.target.value)}
                          className="admin-input"
                          placeholder="https://..."
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialNetwork(index)}
                          className="admin-btn-icon admin-btn-danger"
                          title="Remove"
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddSocialNetwork}
                      className="admin-btn admin-btn-secondary"
                    >
                      <i className="bx bx-plus" />
                      Add Social Network
                    </button>
                  </div>
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
              isDirty={isDirty}
              onDiscard={handleDiscard}
            />
          </div>

          <UnsavedChangesDialog
            isOpen={showUnsavedDialog}
            onSave={handleSaveAndNavigate}
            onDiscard={handleDiscardAndNavigate}
            onCancel={handleCancelNavigation}
            isSaving={isSubmitting}
          />
        </form>
      )}

      {activeTab === "stripe" && showStripeTab && (
        <div className="admin-form">
          <StripeTab account={stripeAccount ?? null} />
        </div>
      )}

      {activeTab === "settings" && mode === "self" && settingsData && (
        <div className="admin-form">
          <SettingsTab
            email={settingsData.email}
            username={settingsData.username}
            defaultTshirtSize={settingsData.defaultTshirtSize}
            defaultFoodPreferences={settingsData.defaultFoodPreferences}
          />
        </div>
      )}

      {activeTab === "settings" && mode === "admin" && adminSettings && (
        <div className="admin-form">
          <AdminSettingsTab playerId={player.documentId} settings={adminSettings} />
        </div>
      )}
    </>
  )
}
