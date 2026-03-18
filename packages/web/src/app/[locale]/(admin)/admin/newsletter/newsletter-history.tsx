"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import {
  deleteNewsletter,
  getNewsletters,
  type NewsletterListItem,
  retryNewsletter,
} from "./newsletter.action"

interface NewsletterHistoryProps {
  onEdit: (newsletterId: string) => void
  isLoadingEdit: boolean
}

export default function NewsletterHistory({ onEdit, isLoadingEdit }: NewsletterHistoryProps) {
  const t = useTranslations("adminMisc.newsletter.historyView")
  const toast = useToast()

  const [newsletters, setNewsletters] = useState<NewsletterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadNewsletters = useCallback(async () => {
    setIsLoading(true)
    const result = await getNewsletters(page, 10)
    setNewsletters(result.data)
    setTotalPages(result.meta.pagination.pageCount)
    setIsLoading(false)
  }, [page])

  useEffect(() => {
    loadNewsletters()
  }, [loadNewsletters])

  const handleDelete = useCallback(
    async (newsletterId: string) => {
      if (!confirm(t("deleteConfirm"))) {
        return
      }

      const result = await deleteNewsletter(newsletterId)
      if (result.success) {
        toast.success(t("deleted"))
        loadNewsletters()
      } else {
        toast.error(result.error || t("deleteFailed"))
      }
    },
    [loadNewsletters, t, toast]
  )

  const handleRetry = useCallback(
    async (newsletterId: string) => {
      const result = await retryNewsletter(newsletterId)
      if (result.success) {
        toast.success(t("retrySuccess"))
        loadNewsletters()
        onEdit(newsletterId)
      } else {
        toast.error(result.error || t("retryFailed"))
      }
    },
    [loadNewsletters, t, toast, onEdit]
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: "badge-secondary",
      sending: "badge-warning",
      sent: "badge-success",
      failed: "badge-danger",
    }
    return <span className={`badge ${statusClasses[status] || "badge-secondary"}`}>{status}</span>
  }

  if (isLoading) {
    return (
      <div className="newsletter-history-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("loading")}</span>
      </div>
    )
  }

  if (newsletters.length === 0) {
    return (
      <div className="newsletter-history-empty">
        <i className="bx bx-envelope" />
        <p>{t("empty")}</p>
        <p className="text-muted">{t("emptyHint")}</p>
      </div>
    )
  }

  return (
    <div className="newsletter-history">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t("subject")}</th>
            <th>{t("status")}</th>
            <th>{t("recipients")}</th>
            <th>{t("sent")}</th>
            <th>{t("created")}</th>
            <th>{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {newsletters.map((newsletter) => (
            <tr key={newsletter.documentId}>
              <td className="newsletter-subject">{newsletter.subject}</td>
              <td>{getStatusBadge(newsletter.sendStatus)}</td>
              <td>
                {newsletter.recipientCount !== null
                  ? newsletter.recipientCount.toLocaleString()
                  : "—"}
              </td>
              <td>{formatDate(newsletter.sentAt)}</td>
              <td>{formatDate(newsletter.createdAt)}</td>
              <td className="newsletter-actions">
                {newsletter.sendStatus === "draft" && (
                  <>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => onEdit(newsletter.documentId)}
                      disabled={isLoadingEdit}
                      title={t("editDraft")}
                    >
                      <i className={`bx ${isLoadingEdit ? "bx-loader-alt bx-spin" : "bx-edit"}`} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleDelete(newsletter.documentId)}
                      title={t("deleteDraft")}
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </>
                )}
                {newsletter.sendStatus === "failed" && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-warning admin-btn-sm"
                    onClick={() => handleRetry(newsletter.documentId)}
                    disabled={isLoadingEdit}
                    title={t("retrySending")}
                  >
                    <i className={`bx ${isLoadingEdit ? "bx-loader-alt bx-spin" : "bx-refresh"}`} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="newsletter-history-pagination">
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <i className="bx bx-chevron-left" />
            {t("previous")}
          </button>
          <span className="newsletter-history-page">{t("pageOf", { page, totalPages })}</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("next")}
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
