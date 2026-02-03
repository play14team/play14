"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import SimpleEditor from "@/components/ui/simple-editor"
import AiAssistantPanel from "./ai-assistant-panel"
import {
  createNewsletter,
  getAudienceCount,
  type NewsletterForEdit,
  sendNewsletter,
  sendTestNewsletter,
  updateNewsletter,
} from "./newsletter.action"
import NewsletterPreview from "./newsletter-preview"

interface NewsletterFormProps {
  newsletter?: NewsletterForEdit
}

export default function NewsletterForm({ newsletter }: NewsletterFormProps) {
  const router = useRouter()
  const toast = useToast()

  const [subject, setSubject] = useState(newsletter?.subject || "")
  const [body, setBody] = useState(newsletter?.body || "")
  const [documentId, setDocumentId] = useState(newsletter?.documentId || null)
  const [audienceCount, setAudienceCount] = useState<number | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showConfirmSend, setShowConfirmSend] = useState(false)

  const isEditable = !newsletter || newsletter.sendStatus === "draft"
  const hasContent = subject.trim().length > 0 && body.trim().length > 0

  // Fetch audience count on mount
  useEffect(() => {
    async function fetchAudienceCount() {
      const result = await getAudienceCount()
      if (result.success && result.count !== undefined) {
        setAudienceCount(result.count)
      }
    }
    fetchAudienceCount()
  }, [])

  const handleSaveDraft = useCallback(async () => {
    if (!hasContent) {
      toast.error("Please enter a subject and body")
      return
    }

    setIsSaving(true)
    try {
      if (documentId) {
        const result = await updateNewsletter(documentId, { subject, body })
        if (result.success) {
          toast.success("Draft saved")
        } else {
          toast.error(result.error || "Failed to save draft")
        }
      } else {
        const result = await createNewsletter({ subject, body })
        if (result.success && result.documentId) {
          setDocumentId(result.documentId)
          toast.success("Draft created")
        } else {
          toast.error(result.error || "Failed to create draft")
        }
      }
    } finally {
      setIsSaving(false)
    }
  }, [documentId, subject, body, hasContent, toast])

  const handleSendTest = useCallback(async () => {
    if (!documentId) {
      toast.error("Please save the draft first")
      return
    }

    setIsSendingTest(true)
    try {
      // Save first to ensure we have the latest content
      const saveResult = await updateNewsletter(documentId, { subject, body })
      if (!saveResult.success) {
        toast.error(saveResult.error || "Failed to save before sending test")
        return
      }

      const result = await sendTestNewsletter(documentId)
      if (result.success) {
        toast.success(`Test email sent to ${result.email}`)
      } else {
        toast.error(result.error || "Failed to send test email")
      }
    } finally {
      setIsSendingTest(false)
    }
  }, [documentId, subject, body, toast])

  const handleSend = useCallback(async () => {
    if (!documentId) {
      toast.error("Please save the draft first")
      return
    }

    setIsSending(true)
    try {
      // Save first to ensure we have the latest content
      const saveResult = await updateNewsletter(documentId, { subject, body })
      if (!saveResult.success) {
        toast.error(saveResult.error || "Failed to save before sending")
        return
      }

      const result = await sendNewsletter(documentId)
      if (result.success) {
        toast.success(`Newsletter sent to ${result.recipientCount} subscribers`)
        // Reset form for new newsletter
        setSubject("")
        setBody("")
        setDocumentId(null)
        setShowConfirmSend(false)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to send newsletter")
      }
    } finally {
      setIsSending(false)
    }
  }, [documentId, subject, body, toast, router])

  const handleAiContentGenerated = useCallback((content: string) => {
    setBody(content)
  }, [])

  const handleAiSubjectSelected = useCallback((selectedSubject: string) => {
    setSubject(selectedSubject)
  }, [])

  return (
    <div className="newsletter-form-container">
      <div className="newsletter-form-main">
        <div className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              className="admin-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter newsletter subject..."
              maxLength={200}
              disabled={!isEditable}
            />
            <div className="admin-form-help">{subject.length}/200 characters</div>
          </div>

          <div className="admin-form-group">
            <label>Content</label>
            {isEditable ? (
              <SimpleEditor
                content={body}
                onChange={setBody}
                placeholder="Write your newsletter content..."
              />
            ) : (
              // Founder-created content displayed back to founder
              <div className="newsletter-body-preview" dangerouslySetInnerHTML={{ __html: body }} />
            )}
          </div>

          <div className="newsletter-form-actions">
            <div className="newsletter-form-actions-left">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowAiPanel(!showAiPanel)}
              >
                <i className="bx bx-bot" />
                {showAiPanel ? "Hide AI assistant" : "AI assistant"}
              </button>
            </div>

            <div className="newsletter-form-actions-right">
              {isEditable && (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleSaveDraft}
                    disabled={isSaving || !hasContent}
                  >
                    <i className="bx bx-save" />
                    {isSaving ? "Saving..." : "Save draft"}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowPreview(true)}
                    disabled={!hasContent}
                  >
                    <i className="bx bx-show" />
                    Preview
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleSendTest}
                    disabled={isSendingTest || !documentId}
                    title={!documentId ? "Save draft first" : "Send test to your email"}
                  >
                    <i className="bx bx-mail-send" />
                    {isSendingTest ? "Sending..." : "Send test"}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => setShowConfirmSend(true)}
                    disabled={isSending || !documentId}
                    title={!documentId ? "Save draft first" : "Send to all subscribers"}
                  >
                    <i className="bx bx-send" />
                    Send newsletter
                  </button>
                </>
              )}
            </div>
          </div>

          {audienceCount !== null && (
            <div className="newsletter-audience-info">
              <i className="bx bx-group" />
              <span>{audienceCount.toLocaleString()} subscribers</span>
            </div>
          )}
        </div>
      </div>

      {showAiPanel && (
        <div className="newsletter-form-sidebar">
          <AiAssistantPanel
            currentContent={body}
            onContentGenerated={handleAiContentGenerated}
            onSubjectSelected={handleAiSubjectSelected}
            onClose={() => setShowAiPanel(false)}
          />
        </div>
      )}

      {showPreview && documentId && (
        <NewsletterPreview
          newsletterId={documentId}
          subject={subject}
          body={body}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showConfirmSend && (
        <div className="modal-overlay" onClick={() => setShowConfirmSend(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm send</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowConfirmSend(false)}
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <div className="modal-body">
              <p>
                You are about to send this newsletter to{" "}
                <strong>{audienceCount?.toLocaleString() || "all"} subscribers</strong>.
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowConfirmSend(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSend}
                disabled={isSending}
              >
                <i className="bx bx-send" />
                {isSending ? "Sending..." : "Send now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
