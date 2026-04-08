import Image from "next/image"
import Link from "next/link"
import { getYouTubeThumbnail } from "./youtube"

interface MediaLinkCardProps {
  url: string
  type: string
  eventName: string
  eventSlug: string
  locationName?: string
  previewImageUrl?: string
  watchVideosLabel: string
  viewPhotosLabel: string
}

export default function MediaLinkCard({
  url,
  type,
  eventName,
  eventSlug,
  locationName,
  previewImageUrl,
  watchVideosLabel,
  viewPhotosLabel,
}: MediaLinkCardProps) {
  const isVideo = type === "Videos"
  const youtubeThumbnail = isVideo ? getYouTubeThumbnail(url) : null
  const thumbnailUrl = youtubeThumbnail || previewImageUrl

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="gallery-media-card"
      title={`${isVideo ? watchVideosLabel : viewPhotosLabel} - ${eventName}`}
    >
      <div className="gallery-media-card__image">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${eventName} ${type.toLowerCase()}`}
            fill
            sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="gallery-media-card__placeholder">
            <i className={`bx ${isVideo ? "bx-video" : "bx-images"}`} />
          </div>
        )}
        <div className="gallery-media-card__overlay">
          <i className={`bx ${isVideo ? "bx-play-circle" : "bx-link-external"}`} />
        </div>
      </div>
      <div className="gallery-media-card__info">
        <span className="gallery-media-card__type">
          <i className={`bx ${isVideo ? "bx-video" : "bx-images"}`} />
          {type}
        </span>
        <span className="gallery-media-card__event">{eventName}</span>
        {locationName && <span className="gallery-media-card__location">{locationName}</span>}
      </div>
    </Link>
  )
}
