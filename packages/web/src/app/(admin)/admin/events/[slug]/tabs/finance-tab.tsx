"use client"

import RevenueDashboard from "@/components/admin/revenue-dashboard"

interface FinanceTabProps {
  eventDocumentId: string
}

export default function FinanceTab({ eventDocumentId }: FinanceTabProps) {
  return (
    <div className="admin-form-section">
      <h2>Ticket Sales Revenue</h2>
      <p className="admin-form-section-description">
        Revenue analytics from online ticket sales.
      </p>
      <RevenueDashboard eventId={eventDocumentId} />
    </div>
  )
}
