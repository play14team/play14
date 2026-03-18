"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import { aiGenerateContent, aiImproveContent, aiSuggestSubjects } from "./newsletter.action"

interface AiAssistantPanelProps {
  currentContent: string
  selectedContent: string | null
  hasSelection: boolean
  onContentGenerated: (content: string) => void
  onReplaceSelection: (html: string) => void
  onSubjectSelected: (subject: string) => void
  onClose: () => void
}

export default function AiAssistantPanel({
  currentContent,
  selectedContent,
  hasSelection,
  onContentGenerated,
  onReplaceSelection,
  onSubjectSelected,
  onClose,
}: AiAssistantPanelProps) {
  const t = useTranslations("adminMisc.newsletter.aiAssistant")
  const toast = useToast()

  const [prompt, setPrompt] = useState("")
  const [improveInstructions, setImproveInstructions] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isSuggestingSubjects, setIsSuggestingSubjects] = useState(false)
  // Track if we improved a selection (to know whether to replace selection or all content)
  const [improvedFromSelection, setImprovedFromSelection] = useState(false)

  const [activeSection, setActiveSection] = useState<"generate" | "improve" | "subjects">(
    "generate"
  )

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error(t("enterPrompt"))
      return
    }

    setIsGenerating(true)
    setGeneratedContent("")
    try {
      const result = await aiGenerateContent(prompt)
      if (result.success && result.content) {
        setGeneratedContent(result.content)
      } else {
        toast.error(result.error || t("generateFailed"))
      }
    } catch (error) {
      // Handle timeout/abort errors with a more helpful message
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error(t("timeout"))
      } else {
        toast.error(t("genericError"))
      }
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, t, toast])

  const handleImprove = useCallback(async () => {
    // Use selected content if available, otherwise use full content
    const trimmedSelection = selectedContent?.trim()
    const isFromSelection = !!trimmedSelection && hasSelection
    const contentToImprove = isFromSelection ? trimmedSelection : currentContent.trim()

    if (!contentToImprove) {
      toast.error(t("writeContentFirstImprove"))
      return
    }
    if (!improveInstructions.trim()) {
      toast.error(t("enterInstructions"))
      return
    }

    setIsImproving(true)
    setGeneratedContent("")
    setImprovedFromSelection(isFromSelection)
    try {
      const result = await aiImproveContent(contentToImprove, improveInstructions)
      if (result.success && result.content) {
        setGeneratedContent(result.content)
      } else {
        toast.error(result.error || t("improveFailed"))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error(t("timeoutImprove"))
      } else {
        toast.error(t("genericErrorImprove"))
      }
    } finally {
      setIsImproving(false)
    }
  }, [currentContent, selectedContent, hasSelection, improveInstructions, t, toast])

  const handleSuggestSubjects = useCallback(async () => {
    if (!currentContent.trim()) {
      toast.error(t("writeContentFirstImprove"))
      return
    }

    setIsSuggestingSubjects(true)
    setSuggestedSubjects([])
    try {
      const result = await aiSuggestSubjects(currentContent)
      if (result.success && result.subjects) {
        setSuggestedSubjects(result.subjects)
      } else {
        toast.error(result.error || t("suggestFailed"))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error(t("timeoutSubjects"))
      } else {
        toast.error(t("genericErrorSubjects"))
      }
    } finally {
      setIsSuggestingSubjects(false)
    }
  }, [currentContent, t, toast])

  const handleUseContent = useCallback(() => {
    if (generatedContent) {
      // If we improved a selection and still have one, replace just the selection
      if (activeSection === "improve" && improvedFromSelection && hasSelection) {
        onReplaceSelection(generatedContent)
        toast.success(t("selectionReplaced"))
      } else {
        // Otherwise replace all content (for generate, or improve without selection)
        onContentGenerated(generatedContent)
        toast.success(t("contentApplied"))
      }
      setGeneratedContent("")
      setImprovedFromSelection(false)
    }
  }, [
    generatedContent,
    activeSection,
    improvedFromSelection,
    hasSelection,
    onContentGenerated,
    onReplaceSelection,
    t,
    toast,
  ])

  const handleSelectSubject = useCallback(
    (subject: string) => {
      onSubjectSelected(subject)
      toast.success(t("subjectApplied"))
    },
    [onSubjectSelected, t, toast]
  )

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <h3>
          <i className="bx bx-bot" />
          {t("title")}
        </h3>
        <button type="button" className="ai-assistant-close" onClick={onClose}>
          <i className="bx bx-x" />
        </button>
      </div>

      <div className="ai-assistant-tabs">
        <button
          type="button"
          className={`ai-assistant-tab ${activeSection === "generate" ? "active" : ""}`}
          onClick={() => setActiveSection("generate")}
        >
          {t("generate")}
        </button>
        <button
          type="button"
          className={`ai-assistant-tab ${activeSection === "improve" ? "active" : ""}`}
          onClick={() => setActiveSection("improve")}
        >
          {t("improve")}
        </button>
        <button
          type="button"
          className={`ai-assistant-tab ${activeSection === "subjects" ? "active" : ""}`}
          onClick={() => setActiveSection("subjects")}
        >
          {t("subjects")}
        </button>
      </div>

      <div className="ai-assistant-content">
        {activeSection === "generate" && (
          <div className="ai-assistant-section">
            <label htmlFor="ai-prompt">{t("promptLabel")}</label>
            <textarea
              id="ai-prompt"
              className="admin-input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("promptPlaceholder")}
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              <i className="bx bx-magic-wand" />
              {isGenerating ? t("generating") : t("generateDraft")}
            </button>
          </div>
        )}

        {activeSection === "improve" && (
          <div className="ai-assistant-section">
            {selectedContent?.trim() ? (
              <p className="ai-assistant-hint ai-assistant-hint-info">
                <i className="bx bx-selection" /> {t("improvingSelection")}
              </p>
            ) : (
              currentContent.trim() && (
                <p className="ai-assistant-hint">
                  <i className="bx bx-info-circle" /> {t("selectTextHint")}
                </p>
              )
            )}
            <label htmlFor="ai-improve">{t("improveLabel")}</label>
            <textarea
              id="ai-improve"
              className="admin-input"
              rows={3}
              value={improveInstructions}
              onChange={(e) => setImproveInstructions(e.target.value)}
              placeholder={t("improvePlaceholder")}
            />
            <div className="ai-assistant-quick-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions(t("shorterInstruction"))}
              >
                {t("shorter")}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions(t("engagingInstruction"))}
              >
                {t("moreEngaging")}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions(t("ctaInstruction"))}
              >
                {t("betterCta")}
              </button>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              onClick={handleImprove}
              disabled={
                isImproving ||
                (!currentContent.trim() && !selectedContent?.trim()) ||
                !improveInstructions.trim()
              }
            >
              <i className="bx bx-edit" />
              {isImproving ? t("improving") : t("improveContent")}
            </button>
            {!currentContent.trim() && !selectedContent?.trim() && (
              <p className="ai-assistant-hint">{t("writeContentFirst")}</p>
            )}
          </div>
        )}

        {activeSection === "subjects" && (
          <div className="ai-assistant-section">
            <p className="ai-assistant-description">{t("subjectsDescription")}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              onClick={handleSuggestSubjects}
              disabled={isSuggestingSubjects || !currentContent.trim()}
            >
              <i className="bx bx-bulb" />
              {isSuggestingSubjects ? t("suggestingSubjects") : t("suggestSubjects")}
            </button>
            {!currentContent.trim() && (
              <p className="ai-assistant-hint">{t("writeContentForSubjects")}</p>
            )}
            {suggestedSubjects.length > 0 && (
              <div className="ai-assistant-suggestions">
                <h4>{t("suggestions")}</h4>
                <ul>
                  {suggestedSubjects.map((subject, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className="ai-suggestion-item"
                        onClick={() => handleSelectSubject(subject)}
                      >
                        <span>{subject}</span>
                        <i className="bx bx-check" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {generatedContent && (activeSection === "generate" || activeSection === "improve") && (
          <div className="ai-assistant-result">
            <div className="ai-assistant-result-header">
              <h4>Generated content</h4>
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-sm"
                onClick={handleUseContent}
              >
                <i className="bx bx-check" />
                Use this
              </button>
            </div>
            {/* Content generated by AI for founder's newsletter - displayed in admin panel only */}
            <div
              className="ai-assistant-result-preview"
              dangerouslySetInnerHTML={{ __html: generatedContent }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
