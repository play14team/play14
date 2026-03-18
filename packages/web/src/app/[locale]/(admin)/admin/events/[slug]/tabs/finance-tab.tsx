"use client"

import { useTranslations } from "next-intl"
import RevenueDashboard from "@/components/admin/revenue-dashboard"

interface FinanceTabProps {
  eventDocumentId: string
}

export default function FinanceTab({ eventDocumentId }: FinanceTabProps) {
  const t = useTranslations("adminEvents.tabs.finance")

  return (
    <div className="admin-form-section">
      <h2>{t("title")}</h2>
      <p className="admin-form-section-description">{t("description")}</p>
      <RevenueDashboard eventId={eventDocumentId} />
    </div>
  )
}
