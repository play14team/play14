"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import { deleteNewsletter, getNewsletters, type NewsletterListItem } from "./newsletter.action"

interface NewsletterHistoryProps {
  onEdit: (newsletterId: string) => void
  isLoadingEdit: boolean
}

export default function NewsletterHistory({ onEdit, isLoadingEdit }: NewsletterHistoryProps) {
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
      if (!confirm("Are you sure you want to delete this draft?")) {
        return
      }

      const result = await deleteNewsletter(newsletterId)
      if (result.success) {
        toast.success("Draft deleted")
        loadNewsletters()
      } else {
        toast.error(result.error || "Failed to delete draft")
      }
    },
    [loadNewsletters, toast]
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
        <span>Loading newsletters...</span>
      </div>
    )
  }

  if (newsletters.length === 0) {
    return (
      <div className="newsletter-history-empty">
        <i className="bx bx-envelope" />
        <p>No newsletters yet</p>
        <p className="text-muted">Create your first newsletter using the Compose tab</p>
      </div>
    )
  }

  return (
    <div className="newsletter-history">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Recipients</th>
            <th>Sent</th>
            <th>Created</th>
            <th>Actions</th>
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
                      title="Edit draft"
                    >
                      <i className={`bx ${isLoadingEdit ? "bx-loader-alt bx-spin" : "bx-edit"}`} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleDelete(newsletter.documentId)}
                      title="Delete draft"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </>
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
            Previous
          </button>
          <span className="newsletter-history-page">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
