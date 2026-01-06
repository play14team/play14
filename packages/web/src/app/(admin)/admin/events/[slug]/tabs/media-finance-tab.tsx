"use client"

import MediaLinksEditor from "@/components/admin/media-links-editor"
import FinanceEditor from "@/components/admin/finance-editor"
import type { MediaLink } from "../media-links.action"
import type { FinanceData } from "../finance.action"

interface MediaFinanceTabProps {
  mediaLinks: MediaLink[]
  onMediaLinksChange: (mediaLinks: MediaLink[]) => void
  financeData: FinanceData | null
  onFinanceChange: (data: FinanceData | null) => void
}

export default function MediaFinanceTab({
  mediaLinks,
  onMediaLinksChange,
  financeData,
  onFinanceChange,
}: MediaFinanceTabProps) {
  return (
    <>
      {/* Media Links Section */}
      <div className="admin-form-section">
        <h2>Photo & Video Galleries</h2>
        <p className="admin-form-section-description">
          Link to external photo albums or video collections from this event.
        </p>
        <MediaLinksEditor
          mediaLinks={mediaLinks}
          onChange={onMediaLinksChange}
        />
      </div>

      {/* Finance Section */}
      <div className="admin-form-section">
        <h2>Event Finance</h2>
        <p className="admin-form-section-description">
          Track revenue, expenses, and financial results for this event.
        </p>
        <FinanceEditor
          financeData={financeData}
          onChange={onFinanceChange}
        />
      </div>
    </>
  )
}
