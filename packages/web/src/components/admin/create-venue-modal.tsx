"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { createVenue } from "@/app/[locale]/(admin)/admin/venues/venues.action"
import LocationMapPicker, { type MapLocation } from "./location-map-picker"
import { useToast } from "./toast"

interface CreateVenueModalProps {
  isOpen: boolean
  onClose: () => void
  onVenueCreated: (venue: { documentId: string; name: string; addressDetails?: string }) => void
}

export default function CreateVenueModal({
  isOpen,
  onClose,
  onVenueCreated,
}: CreateVenueModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [addressDetails, setAddressDetails] = useState("")
  const [website, setWebsite] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

  // Handle dialog open/close with native dialog API
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return

    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.bottom &&
      rect.left <= e.clientX &&
      e.clientX <= rect.right

    if (!isInDialog) {
      onClose()
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("")
      setAddressDetails("")
      setWebsite("")
      setMapLocation(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error(t("common.nameRequired"))
      setIsSubmitting(false)
      return
    }

    const result = await createVenue({
      name: name.trim(),
      addressDetails: addressDetails.trim() || undefined,
      website: website.trim() || undefined,
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToCreate", { entity: t("venues.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.createdSuccess", { entity: t("venues.entityName") }))

    // Call the callback with the new venue
    onVenueCreated({
      documentId: result.documentId!,
      name: name.trim(),
      addressDetails: addressDetails.trim() || undefined,
    })

    onClose()
    setIsSubmitting(false)
  }

  return (
    <dialog ref={dialogRef} className="create-venue-modal" onClick={handleBackdropClick}>
      <div className="create-venue-modal-content">
        <div className="create-venue-modal-header">
          <h2>
            <i className="bx bx-building-house" />
            {t("venues.modal.title")}
          </h2>
          <button
            type="button"
            className="create-venue-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="create-venue-modal-body">
          <div className="admin-form-group">
            <label htmlFor="modal-venue-name">{t("venues.modal.nameLabel")}</label>
            <input
              type="text"
              id="modal-venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              placeholder={t("venues.form.namePlaceholder")}
            />
            <p className="admin-form-help">{t("venues.modal.nameHelp")}</p>
          </div>

          <div className="admin-form-group">
            <label htmlFor="modal-venue-address">{t("venues.modal.addressLabel")}</label>
            <input
              type="text"
              id="modal-venue-address"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              className="admin-input"
              placeholder={t("venues.form.addressPlaceholder")}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="modal-venue-website">{t("venues.modal.websiteLabel")}</label>
            <input
              type="url"
              id="modal-venue-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="admin-input"
              placeholder={t("venues.form.websitePlaceholder")}
            />
          </div>

          <div className="admin-form-group">
            <label>{t("venues.modal.mapLabel")}</label>
            <p className="admin-form-help" style={{ marginBottom: "12px" }}>
              {t("venues.modal.mapHelp")}
            </p>
            <LocationMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="250px"
              centerOnLocation={addressDetails || name}
              autoFillFromLocation
            />
          </div>
        </div>

        <div className="create-venue-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-save-shortcut
          >
            {isSubmitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                {t("common.creating")}...
              </>
            ) : (
              <>
                <i className="bx bx-plus" />
                {t("venues.modal.submitButton")}
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  )
}
