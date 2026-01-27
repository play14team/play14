import Image from "next/image"
import Link from "next/link"
import { deduplicateBy } from "@/libs/arrays"
import type { Event as EventType, GeoLocation, Player, UploadFile } from "@/models/strapi"
import HtmlContent from "../layout/html-content"
import Map from "../map"
import DefaultPlayerImage from "../ui/default-player-image"
import PlayerNav from "./nav"
import PlayerProfileTabs from "./profile-tabs"

// Helper to check if location is a GeoLocation object (has coordinates)
function isGeoLocation(location: string | GeoLocation | undefined): location is GeoLocation {
  if (!location || typeof location === "string") return false
  return "geometry" in location || ("lat" in location && "lng" in location)
}

// Helper to get location display name from string or GeoLocation
function getLocationName(location: string | GeoLocation | undefined): string | null {
  if (!location) return null
  if (typeof location === "string") return location
  if ("place_name" in location && location.place_name) {
    return location.place_name
  }
  return null
}

// Helper to get position badge class
function getPositionClass(position?: string): string {
  const pos = position?.toLowerCase() || "player"
  if (["founder", "host", "mentor", "player"].includes(pos)) {
    return pos
  }
  return "player"
}

// Map social network type to icon
function mapSocialIcon(type: string): string {
  if (type === "Email") return "bx bx-envelope"
  return `bx bxl-${type.toLowerCase()}`
}

export default function PlayerDetails({ player }: { player: Player }) {
  const avatar =
    player.avatar && typeof player.avatar === "object" ? (player.avatar as UploadFile) : undefined
  const locationName = getLocationName(player.location)
  const hasGeoLocation = isGeoLocation(player.location)
  const socialNetworks = player.socialNetworks || []

  const hosted = player.hosted || []
  const mentored = player.mentored || []
  const attended = player.attended || []

  // Calculate total unique events (deduplicated across all categories)
  const allUniqueEvents = deduplicateBy(
    (event: EventType) => event.documentId || event.slug,
    attended,
    hosted,
    mentored
  )
  const totalUniqueEvents = allUniqueEvents.length

  return (
    <div className="player-profile">
      <div className="container">
        {/* Navigation */}
        <PlayerNav current={player.slug} />

        {/* Hero section: Avatar + Info */}
        <div className="player-profile-hero">
          {/* Avatar column with social links */}
          <div className="player-profile-avatar">
            <div className="player-profile-avatar__image-container">
              {avatar ? (
                <Image
                  src={avatar.url}
                  alt={player.name}
                  width={280}
                  height={280}
                  priority
                  className="player-profile-avatar__image"
                  unoptimized
                />
              ) : (
                <DefaultPlayerImage
                  width={280}
                  height={280}
                  priority
                  className="player-profile-avatar__image"
                />
              )}
            </div>

            {/* Social links under avatar */}
            {socialNetworks.length > 0 && (
              <div className="player-profile-avatar__socials">
                {socialNetworks.map(
                  (network) =>
                    network?.url && (
                      <Link
                        key={network.id}
                        href={network.url}
                        target="_blank"
                        rel="noreferrer"
                        className="player-profile-avatar__social-link"
                        title={network.type as string}
                      >
                        <i className={mapSocialIcon(network.type as string)} />
                      </Link>
                    )
                )}
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="player-profile-info">
            {/* Name and badge */}
            <div className="player-profile-info__title">
              <h1 className="player-profile-info__name">{player.name}</h1>
              {player.position && (
                <span
                  className={`player-profile-info__position-badge player-profile-info__position-badge--${getPositionClass(player.position)}`}
                >
                  {player.position}
                </span>
              )}
            </div>

            {player.tagline && <p className="player-profile-info__tagline">{player.tagline}</p>}

            {/* Meta: company, website, location */}
            <div className="player-profile-info__meta">
              {player.company && (
                <span className="player-profile-info__meta-item">
                  <i className="bx bx-building" />
                  {player.company}
                </span>
              )}
              {player.website && (
                <span className="player-profile-info__meta-item">
                  <i className="bx bx-globe" />
                  <Link href={player.website} target="_blank" rel="noreferrer">
                    {player.website.replace(/^https?:\/\//, "")}
                  </Link>
                </span>
              )}
              {locationName && (
                <span className="player-profile-info__meta-item">
                  <i className="bx bx-map" />
                  {locationName}
                </span>
              )}
            </div>

            {/* Stats */}
            {totalUniqueEvents > 0 && (
              <div className="player-profile-info__stats">
                <span className="player-profile-info__stat">
                  <strong>{totalUniqueEvents}</strong> events
                </span>
                {hosted.length > 0 && (
                  <span className="player-profile-info__stat">
                    <strong>{hosted.length}</strong> hosted
                  </span>
                )}
                {mentored.length > 0 && (
                  <span className="player-profile-info__stat">
                    <strong>{mentored.length}</strong> mentored
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio section - full width */}
        {player.bio && (
          <div className="player-profile-bio">
            <HtmlContent>{player.bio}</HtmlContent>
          </div>
        )}

        {/* Map section */}
        {(hasGeoLocation || locationName) && (
          <div className="player-profile-map">
            <div className="player-profile-map__container">
              {hasGeoLocation ? (
                <Map location={player.location as GeoLocation} height="300px" zoom={10} />
              ) : (
                <div className="player-profile-map__fallback">
                  <i className="bx bx-map" />
                  <span>{locationName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events tabs section */}
        <PlayerProfileTabs
          attended={attended.filter(Boolean) as EventType[]}
          hosted={hosted.filter(Boolean) as EventType[]}
          mentored={mentored.filter(Boolean) as EventType[]}
        />
      </div>
    </div>
  )
}
