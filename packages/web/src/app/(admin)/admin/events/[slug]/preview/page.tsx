import { requireOrganizer } from "@/libs/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getEventPreview } from "./preview.action"
import EventDetails from "@/components/events/details"
import type { Event } from "@/models/strapi"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Preview Event | #play14",
  robots: "noindex, nofollow",
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EventPreviewPage({ params }: PageProps) {
  const session = await requireOrganizer()
  const { slug } = await params

  const event = await getEventPreview(slug)

  if (!event) {
    notFound()
  }

  // Verify user is host/mentor of this event or is Founder
  const isEventOrganizer =
    event.hosts?.some((h) => h.documentId === session.player.documentId) ||
    event.mentors?.some((m) => m.documentId === session.player.documentId) ||
    session.player.position === "Founder"

  if (!isEventOrganizer) {
    notFound()
  }

  // Cast the preview event to the Event type expected by EventDetails
  const eventForDetails = event as unknown as Event

  return (
    <div className="admin-preview-page">
      <div className="admin-preview-banner">
        <div className="admin-preview-banner-content">
          <div className="admin-preview-banner-info">
            <i className="bx bx-show"></i>
            <span>
              <strong>Preview Mode</strong> - This is how the event will appear to the public
              {event.isDraft && " (currently draft)"}
            </span>
          </div>
          <div className="admin-preview-banner-actions">
            <Link
              href={`/admin/events/${slug}`}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <i className="bx bx-edit"></i>
              Back to Edit
            </Link>
            {event.isPublished && (
              <Link
                href={`/events/${slug}`}
                className="admin-btn admin-btn-primary admin-btn-sm"
                target="_blank"
              >
                <i className="bx bx-link-external"></i>
                View Live
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="admin-preview-content">
        <EventDetails event={eventForDetails} />
      </div>
    </div>
  )
}
