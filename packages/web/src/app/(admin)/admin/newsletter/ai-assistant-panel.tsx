"use client"

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
      toast.error("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    setGeneratedContent("")
    try {
      const result = await aiGenerateContent(prompt)
      if (result.success && result.content) {
        setGeneratedContent(result.content)
      } else {
        toast.error(result.error || "Failed to generate content")
      }
    } catch (error) {
      // Handle timeout/abort errors with a more helpful message
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error("Request timed out. Try a simpler prompt or try again.")
      } else {
        toast.error("Failed to generate content. Please try again.")
      }
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, toast])

  const handleImprove = useCallback(async () => {
    // Use selected content if available, otherwise use full content
    const trimmedSelection = selectedContent?.trim()
    const isFromSelection = !!trimmedSelection && hasSelection
    const contentToImprove = isFromSelection ? trimmedSelection : currentContent.trim()

    if (!contentToImprove) {
      toast.error("Please write some content first")
      return
    }
    if (!improveInstructions.trim()) {
      toast.error("Please enter improvement instructions")
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
        toast.error(result.error || "Failed to improve content")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error("Request timed out. Try again.")
      } else {
        toast.error("Failed to improve content. Please try again.")
      }
    } finally {
      setIsImproving(false)
    }
  }, [currentContent, selectedContent, hasSelection, improveInstructions, toast])

  const handleSuggestSubjects = useCallback(async () => {
    if (!currentContent.trim()) {
      toast.error("Please write some content first")
      return
    }

    setIsSuggestingSubjects(true)
    setSuggestedSubjects([])
    try {
      const result = await aiSuggestSubjects(currentContent)
      if (result.success && result.subjects) {
        setSuggestedSubjects(result.subjects)
      } else {
        toast.error(result.error || "Failed to generate subject suggestions")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("aborted") || message.includes("timeout")) {
        toast.error("Request timed out. Try again.")
      } else {
        toast.error("Failed to generate subjects. Please try again.")
      }
    } finally {
      setIsSuggestingSubjects(false)
    }
  }, [currentContent, toast])

  const handleUseContent = useCallback(() => {
    if (generatedContent) {
      // If we improved a selection and still have one, replace just the selection
      if (activeSection === "improve" && improvedFromSelection && hasSelection) {
        onReplaceSelection(generatedContent)
        toast.success("Selection replaced")
      } else {
        // Otherwise replace all content (for generate, or improve without selection)
        onContentGenerated(generatedContent)
        toast.success("Content applied")
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
    toast,
  ])

  const handleSelectSubject = useCallback(
    (subject: string) => {
      onSubjectSelected(subject)
      toast.success("Subject applied")
    },
    [onSubjectSelected, toast]
  )

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <h3>
          <i className="bx bx-bot" />
          AI assistant
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
          Generate
        </button>
        <button
          type="button"
          className={`ai-assistant-tab ${activeSection === "improve" ? "active" : ""}`}
          onClick={() => setActiveSection("improve")}
        >
          Improve
        </button>
        <button
          type="button"
          className={`ai-assistant-tab ${activeSection === "subjects" ? "active" : ""}`}
          onClick={() => setActiveSection("subjects")}
        >
          Subjects
        </button>
      </div>

      <div className="ai-assistant-content">
        {activeSection === "generate" && (
          <div className="ai-assistant-section">
            <label htmlFor="ai-prompt">Describe what you want to write about</label>
            <textarea
              id="ai-prompt"
              className="admin-input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Announce our upcoming event in Berlin, highlight the keynote speaker and encourage early registration..."
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              <i className="bx bx-magic-wand" />
              {isGenerating ? "Generating..." : "Generate draft"}
            </button>
          </div>
        )}

        {activeSection === "improve" && (
          <div className="ai-assistant-section">
            {selectedContent?.trim() ? (
              <p className="ai-assistant-hint ai-assistant-hint-info">
                <i className="bx bx-selection" /> Improving selected text only
              </p>
            ) : (
              currentContent.trim() && (
                <p className="ai-assistant-hint">
                  <i className="bx bx-info-circle" /> Select text in the editor to improve only that
                  portion
                </p>
              )
            )}
            <label htmlFor="ai-improve">How should the content be improved?</label>
            <textarea
              id="ai-improve"
              className="admin-input"
              rows={3}
              value={improveInstructions}
              onChange={(e) => setImproveInstructions(e.target.value)}
              placeholder="e.g., Make it more concise, add a stronger call to action, make it more engaging..."
            />
            <div className="ai-assistant-quick-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions("Make it shorter and more concise")}
              >
                Shorter
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions("Make it more engaging and enthusiastic")}
              >
                More engaging
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setImproveInstructions("Add a stronger call to action")}
              >
                Better CTA
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
              {isImproving ? "Improving..." : "Improve content"}
            </button>
            {!currentContent.trim() && !selectedContent?.trim() && (
              <p className="ai-assistant-hint">Write some content first to improve it</p>
            )}
          </div>
        )}

        {activeSection === "subjects" && (
          <div className="ai-assistant-section">
            <p className="ai-assistant-description">
              Generate subject line suggestions based on your newsletter content.
            </p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              onClick={handleSuggestSubjects}
              disabled={isSuggestingSubjects || !currentContent.trim()}
            >
              <i className="bx bx-bulb" />
              {isSuggestingSubjects ? "Generating..." : "Suggest subjects"}
            </button>
            {!currentContent.trim() && (
              <p className="ai-assistant-hint">
                Write some content first to get subject suggestions
              </p>
            )}
            {suggestedSubjects.length > 0 && (
              <div className="ai-assistant-suggestions">
                <h4>Suggestions</h4>
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
