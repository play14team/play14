"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import SimpleEditor, { type SimpleEditorRef } from "@/components/ui/simple-editor"
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
  const t = useTranslations("adminMisc.newsletter.form")
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
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)
  const editorRef = useRef<SimpleEditorRef>(null)

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
      toast.error(t("enterSubjectAndBody"))
      return
    }

    setIsSaving(true)
    try {
      if (documentId) {
        const result = await updateNewsletter(documentId, { subject, body })
        if (result.success) {
          toast.success(t("draftSaved"))
        } else {
          toast.error(result.error || t("draftSaveFailed"))
        }
      } else {
        const result = await createNewsletter({ subject, body })
        if (result.success && result.documentId) {
          setDocumentId(result.documentId)
          toast.success(t("draftCreated"))
        } else {
          toast.error(result.error || t("draftCreateFailed"))
        }
      }
    } finally {
      setIsSaving(false)
    }
  }, [documentId, subject, body, hasContent, t, toast])

  const handleSendTest = useCallback(async () => {
    if (!documentId) {
      toast.error(t("saveDraftFirst2"))
      return
    }

    setIsSendingTest(true)
    try {
      // Save first to ensure we have the latest content
      const saveResult = await updateNewsletter(documentId, { subject, body })
      if (!saveResult.success) {
        toast.error(saveResult.error || t("saveBeforeTestFailed"))
        return
      }

      const result = await sendTestNewsletter(documentId)
      if (result.success) {
        toast.success(t("testSent", { email: result.email || "" }))
      } else {
        toast.error(result.error || t("testFailed"))
      }
    } finally {
      setIsSendingTest(false)
    }
  }, [documentId, subject, body, t, toast])

  const handleSend = useCallback(async () => {
    if (!documentId) {
      toast.error(t("saveDraftFirst2"))
      return
    }

    setIsSending(true)
    try {
      // Save first to ensure we have the latest content
      const saveResult = await updateNewsletter(documentId, { subject, body })
      if (!saveResult.success) {
        toast.error(saveResult.error || t("saveBeforeSendFailed"))
        return
      }

      const result = await sendNewsletter(documentId)
      if (result.success) {
        toast.success(t("sentTo", { count: result.recipientCount || 0 }))
        // Reset form for new newsletter
        setSubject("")
        setBody("")
        setDocumentId(null)
        setShowConfirmSend(false)
        router.refresh()
      } else {
        toast.error(result.error || t("sendFailed"))
      }
    } finally {
      setIsSending(false)
    }
  }, [documentId, subject, body, t, toast, router])

  const handleAiContentGenerated = useCallback((content: string) => {
    setBody(content)
  }, [])

  const handleAiSubjectSelected = useCallback((selectedSubject: string) => {
    setSubject(selectedSubject)
  }, [])

  const handleSelectionChange = useCallback(
    (selected: string | null, range: { from: number; to: number } | null) => {
      setSelectedText(selected)
      setSelectionRange(range)
    },
    []
  )

  const handleReplaceSelection = useCallback(
    (html: string) => {
      if (selectionRange && editorRef.current) {
        editorRef.current.replaceSelection(selectionRange.from, selectionRange.to, html)
      }
    },
    [selectionRange]
  )

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
                ref={editorRef}
                content={body}
                onChange={setBody}
                onSelectionChange={handleSelectionChange}
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
                {showAiPanel ? t("hideAi") : t("showAi")}
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
                    data-save-shortcut
                  >
                    <i className="bx bx-save" />
                    {isSaving ? t("saving") : t("saveDraft")}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowPreview(true)}
                    disabled={!hasContent}
                  >
                    <i className="bx bx-show" />
                    {t("preview")}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleSendTest}
                    disabled={isSendingTest || !documentId}
                    title={!documentId ? t("saveDraftFirst") : t("sendTestTooltip")}
                  >
                    <i className="bx bx-mail-send" />
                    {isSendingTest ? t("sending") : t("sendTest")}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => setShowConfirmSend(true)}
                    disabled={isSending || !documentId}
                    title={!documentId ? t("saveDraftFirst") : t("sendToAll")}
                  >
                    <i className="bx bx-send" />
                    {t("sendNewsletter")}
                  </button>
                </>
              )}
            </div>
          </div>

          {audienceCount !== null && (
            <div className="newsletter-audience-info">
              <i className="bx bx-group" />
              <span>{t("subscribers", { count: audienceCount })}</span>
            </div>
          )}
        </div>
      </div>

      {showAiPanel && (
        <div className="newsletter-form-sidebar">
          <AiAssistantPanel
            currentContent={body}
            selectedContent={selectedText}
            hasSelection={!!selectionRange}
            onContentGenerated={handleAiContentGenerated}
            onReplaceSelection={handleReplaceSelection}
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
              <h2>{t("confirmSendTitle")}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowConfirmSend(false)}
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <div
              className="modal-body"
              dangerouslySetInnerHTML={{
                __html: `<p>${t("confirmSendBody", { count: audienceCount?.toLocaleString() || "all" })}</p><p>${t("confirmSendWarning")}</p>`,
              }}
            />
            <div className="modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowConfirmSend(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSend}
                disabled={isSending}
              >
                <i className="bx bx-send" />
                {isSending ? t("sending") : t("sendNow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
