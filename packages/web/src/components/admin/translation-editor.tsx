"use client"

import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import SimpleEditor from "@/components/ui/simple-editor"
import ConfirmationDialog from "./confirmation-dialog"
import { useToast } from "./toast"

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
}

interface TranslationEditorProps {
  // The current content in the selected locale
  content: string
  onChange: (content: string) => void

  // English source content (for "copy from English")
  englishContent?: string

  // Translation management
  availableLocales: readonly string[]
  onLocaleChange: (locale: string) => void
  onTranslate?: (targetLocale: string) => Promise<void>
  onSaveTranslation?: (locale: string, content: string) => Promise<void>

  // Loading states
  isTranslating?: boolean
  isSaving?: boolean

  // Placeholder
  placeholder?: string
}

export default function TranslationEditor({
  content,
  onChange,
  englishContent,
  availableLocales,
  onLocaleChange,
  onTranslate,
  onSaveTranslation,
  isTranslating = false,
  isSaving = false,
  placeholder,
}: TranslationEditorProps) {
  const t = useTranslations("adminEvents.translation")
  const currentLocale = useLocale()
  const toast = useToast()
  const [selectedLocale, setSelectedLocale] = useState(currentLocale)
  const [localContent, setLocalContent] = useState(content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: "danger" | "warning" | "info"
    onConfirm: () => void
  }>({ isOpen: false, title: "", message: "", variant: "warning", onConfirm: () => {} })

  const closeDialog = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content)
    setHasUnsavedChanges(false)
  }, [content, selectedLocale])

  const handleLocaleSwitch = async (newLocale: string) => {
    // Auto-save unsaved changes before switching
    if (hasUnsavedChanges && onSaveTranslation && selectedLocale !== "en") {
      try {
        await onSaveTranslation(selectedLocale, localContent)
        toast.success(t("savedSuccess"))
      } catch {
        toast.error(t("saveError"))
      }
    }

    setSelectedLocale(newLocale)
    onLocaleChange(newLocale)
  }

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent)
    onChange(newContent)
    setHasUnsavedChanges(true)
  }

  const handleTranslate = async () => {
    if (!onTranslate) return

    try {
      await onTranslate(selectedLocale)
      toast.success(t("translateSuccess"))
      setHasUnsavedChanges(false)
    } catch {
      toast.error(t("translateError"))
    }
  }

  const handleCopyFromEnglish = () => {
    const source = englishContent ?? content
    if (!source) return

    if (localContent) {
      setConfirmDialog({
        isOpen: true,
        title: t("copyFromEnglishButton"),
        message: t("copyFromEnglishConfirm"),
        variant: "warning",
        onConfirm: () => {
          handleContentChange(source)
          toast.success(t("copiedFromEnglish"))
          closeDialog()
        },
      })
      return
    }

    handleContentChange(source)
    toast.success(t("copiedFromEnglish"))
  }

  const handleSave = async () => {
    if (!onSaveTranslation) return

    try {
      await onSaveTranslation(selectedLocale, localContent)
      toast.success(t("savedSuccess"))
      setHasUnsavedChanges(false)
    } catch {
      toast.error(t("saveError"))
    }
  }

  const isDefaultLocale = selectedLocale === "en"
  const sourceContent = englishContent ?? content

  return (
    <div className="translation-editor">
      {/* Locale Selector */}
      <div className="translation-editor-header">
        <div className="locale-tabs">
          {availableLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              className={`locale-tab ${selectedLocale === locale ? "active" : ""}`}
              onClick={() => handleLocaleSwitch(locale)}
              disabled={isSaving || isTranslating}
            >
              {LOCALE_NAMES[locale] || locale.toUpperCase()}
              {locale === "en" && <span className="badge">Default</span>}
            </button>
          ))}
        </div>

        {!isDefaultLocale && (
          <div className="translation-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleCopyFromEnglish}
              disabled={isTranslating || isSaving || !sourceContent}
              title={t("copyFromEnglishTitle")}
            >
              <i className="bx bx-copy" />
              {t("copyFromEnglishButton")}
            </button>

            {onTranslate && (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={handleTranslate}
                disabled={isTranslating || !sourceContent}
                title={t("translateWithAI")}
              >
                {isTranslating ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    {t("translating")}
                  </>
                ) : (
                  <>
                    <i className="bx bxs-magic-wand" />
                    {t("translateButton")}
                  </>
                )}
              </button>
            )}

            {onSaveTranslation && hasUnsavedChanges && (
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <i className="bx bx-save" />
                    {t("saveTranslation")}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="translation-editor-content">
        {!isDefaultLocale && !localContent && sourceContent && (
          <div className="translation-hint">
            <i className="bx bx-info-circle" />
            <p>
              {t("noTranslationYet")}
              {onTranslate && ` ${t("useTranslateButton")}`}
            </p>
          </div>
        )}

        <SimpleEditor
          content={localContent}
          onChange={handleContentChange}
          placeholder={
            placeholder || (isDefaultLocale ? t("enterDefaultContent") : t("enterTranslation"))
          }
        />
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeDialog}
      />

      <style jsx>{`
        .translation-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .translation-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .locale-tabs {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
          border-bottom: 2px solid var(--border-color);
        }

        .locale-tab {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: 0;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          margin-bottom: -2px;
          border-bottom: 2px solid transparent;
        }

        .locale-tab:hover:not(:disabled) {
          color: var(--text-primary);
          border-bottom-color: var(--text-secondary);
        }

        .locale-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          font-weight: 600;
        }

        .locale-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .locale-tab .badge {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.125rem 0.375rem;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: 0.25rem;
        }

        .locale-tab.active .badge {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
          color: var(--primary);
        }

        .translation-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .translation-editor-content {
          position: relative;
        }

        .translation-hint {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--info-bg);
          border: 1px solid var(--info-border);
          border-radius: 0.375rem;
          color: var(--info-text);
          margin-bottom: 1rem;
        }

        .translation-hint i {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .translation-hint p {
          margin: 0;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
