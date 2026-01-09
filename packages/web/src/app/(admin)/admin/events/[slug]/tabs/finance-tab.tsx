"use client"

import { useState, useCallback } from "react"
import FinanceEditor from "@/components/admin/finance-editor"
import RevenueDashboard from "@/components/admin/revenue-dashboard"
import type { FinanceData } from "../finance.action"

interface FinanceTabProps {
  eventDocumentId: string
  financeData: FinanceData | null
  onFinanceChange: (data: FinanceData | null) => void
}

export default function FinanceTab({
  eventDocumentId,
  financeData,
  onFinanceChange,
}: FinanceTabProps) {
  const [ticketRevenue, setTicketRevenue] = useState(0)

  const handleAnalyticsLoaded = useCallback((netRevenue: number) => {
    setTicketRevenue(netRevenue)
  }, [])

  return (
    <>
      {/* Ticket Sales Revenue Section */}
      <div className="admin-form-section">
        <h2>Ticket Sales Revenue</h2>
        <p className="admin-form-section-description">
          Revenue analytics from online ticket sales.
        </p>
        <RevenueDashboard eventId={eventDocumentId} onAnalyticsLoaded={handleAnalyticsLoaded} />
      </div>

      {/* Manual Finance Section */}
      <div className="admin-form-section">
        <h2>Manual Finance Tracking</h2>
        <p className="admin-form-section-description">
          Track additional revenue (sponsorships, donations), expenses, and financial
          results manually.
        </p>
        <FinanceEditor
          financeData={financeData}
          onChange={onFinanceChange}
          defaultRevenue={ticketRevenue}
        />
      </div>
    </>
  )
}
