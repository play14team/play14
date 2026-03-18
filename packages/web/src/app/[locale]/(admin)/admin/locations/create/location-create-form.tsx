"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import CountrySelector from "@/components/admin/country-selector"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import { useToast } from "@/components/admin/toast"
import { createLocation } from "../locations.action"

export default function LocationCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error(t("adminCrud.common.nameRequired"))
      setIsSubmitting(false)
      return
    }

    if (!country) {
      toast.error(t("adminCrud.locations.form.selectCountry"))
      setIsSubmitting(false)
      return
    }

    const result = await createLocation({
      name: name.trim(),
      country: country.toUpperCase(),
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(
        result.error ||
          t("adminCrud.common.failedToCreate", { entity: t("adminCrud.locations.entityName") })
      )
      setIsSubmitting(false)
      return
    }

    toast.success(
      t("adminCrud.common.createdSuccess", { entity: t("adminCrud.locations.entityName") })
    )
    router.push(`/admin/locations/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form location-edit-form">
      <div className="admin-form-section">
        <h2>{t("adminCrud.locations.form.detailsTitle")}</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">{t("adminCrud.locations.form.nameLabel")}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="admin-input"
              placeholder={t("adminCrud.locations.form.namePlaceholder")}
            />
            <p className="admin-form-help">{t("adminCrud.locations.form.nameHelp")}</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>{t("adminCrud.locations.form.countryLabel")}</label>
            <CountrySelector
              value={country}
              onChange={setCountry}
              placeholder={t("adminCrud.locations.form.countryPlaceholder")}
              required
            />
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{t("adminCrud.locations.form.mapTitle")}</h2>
        <p className="admin-form-section-description">
          {t("adminCrud.locations.form.mapDescription")}
        </p>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
            <LocationMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="400px"
              centerOnLocation={name}
              autoFillFromLocation
              onCountryDetected={(code) => !country && setCountry(code)}
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
              {t("adminCrud.common.creating")}...
            </>
          ) : (
            <>
              <i className="bx bx-plus" />
              {t("adminCrud.locations.create.submitButton")}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
