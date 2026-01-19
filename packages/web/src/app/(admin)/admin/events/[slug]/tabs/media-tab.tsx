"use client"

import MediaLinksEditor from "@/components/admin/media-links-editor"
import type { MediaLink } from "../media-links.action"

interface MediaTabProps {
  mediaLinks: MediaLink[]
  onMediaLinksChange: (mediaLinks: MediaLink[]) => void
}

export default function MediaTab({ mediaLinks, onMediaLinksChange }: MediaTabProps) {
  return (
    <>
      {/* Media Links Section */}
      <div className="admin-form-section">
        <h2>Photo & Video Galleries</h2>
        <p className="admin-form-section-description">
          Link to external photo albums or video collections from this event.
        </p>
        <MediaLinksEditor mediaLinks={mediaLinks} onChange={onMediaLinksChange} />
      </div>
    </>
  )
}
