"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useToast } from "@/components/admin/toast"
import VenueMapPicker, { type MapLocation } from "@/components/admin/venue-map-picker"
import { createVenue } from "../venues.action"

export default function VenueCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [addressDetails, setAddressDetails] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error(t("common.nameRequired"))
      setIsSubmitting(false)
      return
    }

    const result = await createVenue({
      name: name.trim(),
      website: website.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToCreate", { entity: t("venues.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.createdSuccess", { entity: t("venues.entityName") }))
    router.push(`/admin/venues/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>{t("venues.form.detailsTitle")}</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">{t("venues.form.nameLabel")}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="admin-input"
              placeholder={t("venues.form.namePlaceholder")}
            />
            <p className="admin-form-help">{t("venues.form.nameHelp")}</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="website">{t("venues.form.websiteLabel")}</label>
            <input
              type="url"
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="admin-input"
              placeholder={t("venues.form.websitePlaceholder")}
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="addressDetails">{t("venues.form.addressLabel")}</label>
            <input
              type="text"
              id="addressDetails"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              className="admin-input"
              placeholder={t("venues.form.addressPlaceholder")}
            />
            <p className="admin-form-help">{t("venues.form.addressHelp")}</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{t("venues.form.mapTitle")}</h2>
        <p className="admin-form-section-description">{t("venues.form.mapDescription")}</p>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
            <VenueMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="400px"
              centerOnLocation={addressDetails || name}
              autoFillFromLocation
            />
          </div>
        </div>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={isSubmitting}
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              {t("common.creating")}
            </>
          ) : (
            <>
              <i className="bx bx-plus" />
              {t("venues.create.submitButton")}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
