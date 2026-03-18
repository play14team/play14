"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import EventImageManager from "@/components/admin/event-image-manager"
import ScheduleEditor from "@/components/admin/schedule-editor"
import { useToast } from "@/components/admin/toast"
import TranslationEditor from "@/components/admin/translation-editor"
import { routing } from "@/i18n/routing"
import type { EventForEdit } from "../event-edit.action"
import {
  getEventLocaleDescription,
  translateWithGemini,
  updateEventLocalization,
} from "../event-translation.action"
import type { TimetableDay } from "../schedule.types"

interface ContentTabProps {
  description: string
  setDescription: (value: string) => void
  eventSlug: string
  eventName: string
  defaultImage: EventForEdit["defaultImage"]
  galleryImages: EventForEdit["images"]
  schedule: TimetableDay[]
  onScheduleChange: (schedule: TimetableDay[]) => void
  onImageUpdate: () => void
}

const AVAILABLE_LOCALES = routing.locales

export default function ContentTab({
  description,
  setDescription,
  eventSlug,
  eventName,
  defaultImage,
  galleryImages,
  schedule,
  onScheduleChange,
  onImageUpdate,
}: ContentTabProps) {
  const t = useTranslations("adminEvents.content")
  const currentLocale = useLocale()
  const toast = useToast()
  const [selectedLocale, setSelectedLocale] = useState(currentLocale)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSavingTranslation, setIsSavingTranslation] = useState(false)
  const [localeDescriptions, setLocaleDescriptions] = useState<Record<string, string>>({
    [currentLocale]: description,
  })

  const handleLocaleChange = async (locale: string) => {
    setSelectedLocale(locale)

    // Fetch description for this locale if not already loaded
    if (localeDescriptions[locale] === undefined) {
      const result = await getEventLocaleDescription(eventSlug, locale)
      setLocaleDescriptions((prev) => ({
        ...prev,
        [locale]: result.description ?? "",
      }))
    }
  }

  const handleTranslate = async (targetLocale: string) => {
    setIsTranslating(true)

    try {
      // Use English (default locale) as source
      const sourceDescription = localeDescriptions.en || description

      const result = await translateWithGemini(sourceDescription, "en", targetLocale)

      if (result.success && result.translation) {
        setLocaleDescriptions((prev) => ({
          ...prev,
          [targetLocale]: result.translation,
        }))

        // Auto-save the translation to the backend
        if (targetLocale !== "en") {
          const saveResult = await updateEventLocalization(
            eventSlug,
            targetLocale,
            result.translation
          )
          if (!saveResult.success) {
            toast.error(saveResult.error || "Failed to save translation")
          }
        }
      } else {
        toast.error(result.error || "Translation failed")
      }
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSaveTranslation = async (locale: string, content: string) => {
    if (locale === "en") {
      // Default locale - just update via parent
      setDescription(content)
      return
    }

    setIsSavingTranslation(true)

    try {
      const result = await updateEventLocalization(eventSlug, locale, content)

      if (result.success) {
        setLocaleDescriptions((prev) => ({
          ...prev,
          [locale]: content,
        }))
      } else {
        toast.error(result.error || "Failed to save translation")
        throw new Error("Failed to save translation")
      }
    } finally {
      setIsSavingTranslation(false)
    }
  }

  const currentDescription = localeDescriptions[selectedLocale] || ""

  return (
    <>
      {/* Description Section */}
      <div className="admin-form-section">
        <h2>{t("description")}</h2>

        <div className="admin-form-group">
          <TranslationEditor
            content={currentDescription}
            onChange={(content) => {
              if (selectedLocale === "en") {
                setDescription(content)
              }
              setLocaleDescriptions((prev) => ({
                ...prev,
                [selectedLocale]: content,
              }))
            }}
            englishContent={localeDescriptions.en || description}
            availableLocales={AVAILABLE_LOCALES}
            onLocaleChange={handleLocaleChange}
            onTranslate={handleTranslate}
            onSaveTranslation={handleSaveTranslation}
            isTranslating={isTranslating}
            isSaving={isSavingTranslation}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
      </div>

      {/* Images Section */}
      <div className="admin-form-section">
        <h2>{t("eventImages")}</h2>
        <p className="admin-form-section-description">{t("eventImagesDescription")}</p>
        <EventImageManager
          eventSlug={eventSlug}
          eventName={eventName}
          defaultImage={defaultImage}
          galleryImages={galleryImages || []}
          onUpdate={onImageUpdate}
        />
      </div>

      {/* Schedule Section */}
      <div className="admin-form-section">
        <h2>{t("eventSchedule")}</h2>
        <p className="admin-form-section-description">{t("eventScheduleDescription")}</p>
        <ScheduleEditor schedule={schedule} onChange={onScheduleChange} />
      </div>
    </>
  )
}
