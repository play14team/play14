"use client"

import { useTranslations } from "next-intl"
import MediaLinksEditor from "@/components/admin/media-links-editor"
import type { MediaLink } from "../media-links.action"

interface MediaTabProps {
  mediaLinks: MediaLink[]
  onMediaLinksChange: (mediaLinks: MediaLink[]) => void
}

export default function MediaTab({ mediaLinks, onMediaLinksChange }: MediaTabProps) {
  const t = useTranslations("adminEvents.media")

  return (
    <>
      {/* Media Links Section */}
      <div className="admin-form-section">
        <h2>{t("title")}</h2>
        <p className="admin-form-section-description">{t("description")}</p>
        <MediaLinksEditor mediaLinks={mediaLinks} onChange={onMediaLinksChange} />
      </div>
    </>
  )
}
