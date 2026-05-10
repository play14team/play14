"use client"

import "react-photo-album/rows.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"
import "yet-another-react-lightbox/styles.css"
import "./gallery-page.scss"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { RowsPhotoAlbum } from "react-photo-album"
import Lightbox from "yet-another-react-lightbox"
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen"
import Slideshow from "yet-another-react-lightbox/plugins/slideshow"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import type { GalleryEvent } from "../get-gallery.action"
import MediaLinkCard from "./media-link-card"

const HIGHLIGHT_VIDEOS = [
  "1k1neo2trkg",
  "DHl-HKMcdD4",
  "Dw4runS6Ub8",
  "EcpTuqSg3Ow",
  "p6T-0k59L6Y",
  "w6mAXyZIkAM",
  "Pwhjr0Y82f4",
  "86DrKsf6uvk",
]

interface YearGroup {
  year: number
  events: GalleryEvent[]
  photos: Array<{ src: string; width: number; height: number; alt: string }>
  mediaLinks: Array<{
    url: string
    mediaType: string
    eventName: string
    locationName?: string
    previewImageUrl?: string
  }>
}

function groupEventsByYear(events: GalleryEvent[]): YearGroup[] {
  const yearMap = new Map<number, GalleryEvent[]>()

  for (const event of events) {
    const year = new Date(event.start).getFullYear()
    if (!yearMap.has(year)) {
      yearMap.set(year, [])
    }
    yearMap.get(year)!.push(event)
  }

  // Sort years descending
  const years = Array.from(yearMap.keys()).sort((a, b) => b - a)

  return years.map((year) => {
    const yearEvents = yearMap.get(year)!
    const photos: YearGroup["photos"] = []
    const mediaLinks: YearGroup["mediaLinks"] = []

    for (const event of yearEvents) {
      // Collect uploaded images
      if (event.images) {
        for (const img of event.images) {
          if (img?.url) {
            photos.push({
              src: img.url,
              width: img.width || 800,
              height: img.height || 600,
              alt: `${event.name} - ${event.location?.name || ""}`,
            })
          }
        }
      }

      // Collect external media links
      if (event.media) {
        for (const link of event.media) {
          if (link?.url) {
            mediaLinks.push({
              url: link.url,
              mediaType: link.mediaType,
              eventName: event.name,
              locationName: event.location?.name,
              previewImageUrl: event.defaultImage?.url,
            })
          }
        }
      }
    }

    return { year, events: yearEvents, photos, mediaLinks }
  })
}

export default function GalleryPageContent({ events }: { events: GalleryEvent[] }) {
  const t = useTranslations("gallery")
  const yearGroups = groupEventsByYear(events)
  const [lightboxState, setLightboxState] = useState<{
    yearIndex: number
    photoIndex: number
  } | null>(null)

  if (yearGroups.length === 0) {
    return (
      <div className="container centered pt-5 pb-5">
        <p className="empty-state-message">{t("noContent")}</p>
      </div>
    )
  }

  return (
    <div className="gallery-wall">
      {/* Highlights */}
      <section className="gallery-wall__highlights">
        <h2 className="gallery-wall__highlights-title">
          <i className="bx bx-movie-play" /> {t("highlights")}
        </h2>
        <div className="gallery-wall__highlights-grid">
          {HIGHLIGHT_VIDEOS.map((id) => (
            <div key={id} className="gallery-wall__video-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}`}
                title={t("highlights")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Year quick navigation */}
      <nav className="gallery-wall__year-nav" aria-label={t("jumpToYear")}>
        {yearGroups.map(({ year }) => (
          <a key={year} href={`#gallery-${year}`} className="gallery-wall__year-link">
            {year}
          </a>
        ))}
      </nav>

      {/* Year sections */}
      {yearGroups.map(({ year, events: yearEvents, photos, mediaLinks }, yearIndex) => (
        <section key={year} id={`gallery-${year}`} className="gallery-wall__section">
          <div className="gallery-wall__section-header">
            <h2 className="gallery-wall__year">{year}</h2>
            <span className="gallery-wall__count">
              {t("events", { count: yearEvents.length })}
              {photos.length > 0 && ` · ${t("photos", { count: photos.length })}`}
            </span>
          </div>

          {/* Photo wall */}
          {photos.length > 0 && (
            <div className="gallery-wall__photos">
              <RowsPhotoAlbum
                photos={photos}
                targetRowHeight={200}
                onClick={({ index }) => setLightboxState({ yearIndex, photoIndex: index })}
              />
              <Lightbox
                slides={photos.map((p) => ({ src: p.src, alt: p.alt }))}
                open={lightboxState?.yearIndex === yearIndex}
                index={lightboxState?.photoIndex ?? 0}
                close={() => setLightboxState(null)}
                plugins={[Fullscreen, Slideshow, Thumbnails, Zoom]}
              />
            </div>
          )}

          {/* External media links */}
          {mediaLinks.length > 0 && (
            <div className="gallery-wall__media-links">
              <h3 className="gallery-wall__media-links-title">
                <i className="bx bx-link-external" /> {t("albumsAndCollections")}
              </h3>
              <div className="gallery-wall__media-grid">
                {mediaLinks.map((link, i) => (
                  <MediaLinkCard
                    key={`${link.eventName}-${link.mediaType}-${i}`}
                    {...link}
                    watchVideosLabel={t("watchVideos")}
                    viewPhotosLabel={t("viewPhotos")}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
