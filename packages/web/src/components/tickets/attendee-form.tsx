"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import styles from "./attendee-form.module.scss"
import type { AttendeeInfo, DraftOrderResponse } from "./purchase.action"

const TSHIRT_SIZE_VALUES = ["none", "XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const

interface AttendeeFormProps {
  draftOrder: DraftOrderResponse
  onSubmit: (
    attendees: AttendeeInfo[],
    gdprConsent: boolean,
    termsAccepted: boolean
  ) => Promise<void>
  onBack: () => void
  isSubmitting: boolean
  error?: string | null
}

export default function AttendeeForm({
  draftOrder,
  onSubmit,
  onBack,
  isSubmitting,
  error,
}: AttendeeFormProps) {
  const t = useTranslations("tickets")
  const { ticketCount, playerDefaults, ticketDetails, totalAmount, currency, discountAmount } =
    draftOrder

  // Initialize attendees array based on ticket count
  const [attendees, setAttendees] = useState<AttendeeInfo[]>(() => {
    const initial: AttendeeInfo[] = []
    for (let i = 0; i < ticketCount; i++) {
      // Pre-fill first attendee with purchaser defaults (if available)
      if (i === 0 && playerDefaults) {
        initial.push({
          firstName: playerDefaults.firstName || "",
          lastName: playerDefaults.lastName || "",
          email: playerDefaults.email || "",
          tshirtSize: (playerDefaults.defaultTshirtSize as AttendeeInfo["tshirtSize"]) || "none",
          foodPreferences: playerDefaults.defaultFoodPreferences || "",
          photoConsent: true,
        })
      } else {
        initial.push({
          firstName: "",
          lastName: "",
          email: "",
          tshirtSize: "none",
          foodPreferences: "",
          photoConsent: true,
        })
      }
    }
    return initial
  })

  const [gdprConsent, setGdprConsent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [expandedAttendee, setExpandedAttendee] = useState(0)

  // Track which attendees have been edited
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const updateAttendee = (index: number, field: keyof AttendeeInfo, value: string | boolean) => {
    setAttendees((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    setTouchedFields((prev) => ({
      ...prev,
      [`${index}-${field}`]: true,
    }))
  }

  const isFieldTouched = (index: number, field: string) =>
    touchedFields[`${index}-${field}`] || false

  const getFieldError = (index: number, field: keyof AttendeeInfo): string | null => {
    if (!isFieldTouched(index, field)) return null

    const attendee = attendees[index]
    switch (field) {
      case "firstName":
        if (!attendee.firstName.trim()) return t("firstNameRequired")
        if (attendee.firstName.length < 2) return t("firstNameMinLength")
        break
      case "lastName":
        if (!attendee.lastName.trim()) return t("lastNameRequired")
        if (attendee.lastName.length < 2) return t("lastNameMinLength")
        break
      case "email":
        if (!attendee.email.trim()) return t("emailRequired")
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) return t("emailInvalid")
        break
    }
    return null
  }

  const isAttendeeValid = (index: number): boolean => {
    const attendee = attendees[index]
    return (
      attendee.firstName.trim().length >= 2 &&
      attendee.lastName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)
    )
  }

  const allAttendeesValid = attendees.every((_, i) => isAttendeeValid(i))
  const canSubmit = allAttendeesValid && gdprConsent && termsAccepted

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || isSubmitting) return
    await onSubmit(attendees, gdprConsent, termsAccepted)
  }

  // Get ticket type name for each attendee based on position
  const getTicketTypeForAttendee = (index: number): string => {
    let count = 0
    for (const detail of ticketDetails) {
      for (let i = 0; i < detail.quantity; i++) {
        if (count === index) {
          return detail.ticketTypeName
        }
        count++
      }
    }
    return "Ticket"
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={isSubmitting}
        >
          <i className="bx bx-arrow-back" />
          {t("backToTickets")}
        </button>
        <h3>{t("attendeeInfo")}</h3>
        <p className={styles.subtitle}>{t("attendeeInfoDescription")}</p>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      <div className={styles.attendeeList}>
        {attendees.map((attendee, index) => {
          const ticketTypeName = getTicketTypeForAttendee(index)
          const isExpanded = expandedAttendee === index
          const isValid = isAttendeeValid(index)

          return (
            <div
              key={index}
              className={`${styles.attendeeCard} ${isExpanded ? styles.expanded : ""} ${isValid ? styles.valid : ""}`}
            >
              <button
                type="button"
                className={styles.attendeeHeader}
                onClick={() => setExpandedAttendee(isExpanded ? -1 : index)}
              >
                <div className={styles.attendeeTitle}>
                  <span className={styles.attendeeNumber}>
                    {isValid ? <i className="bx bx-check-circle" /> : <span>{index + 1}</span>}
                  </span>
                  <div>
                    <strong>
                      {attendee.firstName && attendee.lastName
                        ? `${attendee.firstName} ${attendee.lastName}`
                        : t("attendee", { number: index + 1 })}
                    </strong>
                    <span className={styles.ticketType}>{ticketTypeName}</span>
                  </div>
                </div>
                <i className={`bx ${isExpanded ? "bx-chevron-up" : "bx-chevron-down"}`} />
              </button>

              {isExpanded && (
                <div className={styles.attendeeBody}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor={`firstName-${index}`}>{t("firstName")} *</label>
                      <input
                        type="text"
                        id={`firstName-${index}`}
                        value={attendee.firstName}
                        onChange={(e) => updateAttendee(index, "firstName", e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [`${index}-firstName`]: true }))
                        }
                        placeholder={t("enterFirstName")}
                        className={getFieldError(index, "firstName") ? styles.inputError : ""}
                      />
                      {getFieldError(index, "firstName") && (
                        <span className={styles.fieldError}>
                          {getFieldError(index, "firstName")}
                        </span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor={`lastName-${index}`}>{t("lastName")} *</label>
                      <input
                        type="text"
                        id={`lastName-${index}`}
                        value={attendee.lastName}
                        onChange={(e) => updateAttendee(index, "lastName", e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [`${index}-lastName`]: true }))
                        }
                        placeholder={t("enterLastName")}
                        className={getFieldError(index, "lastName") ? styles.inputError : ""}
                      />
                      {getFieldError(index, "lastName") && (
                        <span className={styles.fieldError}>
                          {getFieldError(index, "lastName")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor={`email-${index}`}>{t("email")} *</label>
                    <input
                      type="email"
                      id={`email-${index}`}
                      value={attendee.email}
                      onChange={(e) => updateAttendee(index, "email", e.target.value)}
                      onBlur={() =>
                        setTouchedFields((prev) => ({ ...prev, [`${index}-email`]: true }))
                      }
                      placeholder="attendee@example.com"
                      className={getFieldError(index, "email") ? styles.inputError : ""}
                    />
                    {getFieldError(index, "email") && (
                      <span className={styles.fieldError}>{getFieldError(index, "email")}</span>
                    )}
                    <span className={styles.helpText}>{t("ticketConfirmationEmail")}</span>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor={`tshirtSize-${index}`}>{t("tshirtSize")}</label>
                      <select
                        id={`tshirtSize-${index}`}
                        value={attendee.tshirtSize}
                        onChange={(e) =>
                          updateAttendee(
                            index,
                            "tshirtSize",
                            e.target.value as AttendeeInfo["tshirtSize"]
                          )
                        }
                      >
                        {TSHIRT_SIZE_VALUES.map((size) => (
                          <option key={size} value={size}>
                            {size === "none" ? t("noTshirt") : size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor={`foodPreferences-${index}`}>{t("foodPreferences")}</label>
                      <input
                        type="text"
                        id={`foodPreferences-${index}`}
                        value={attendee.foodPreferences}
                        onChange={(e) => updateAttendee(index, "foodPreferences", e.target.value)}
                        placeholder={t("foodPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className={styles.consentGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={attendee.photoConsent}
                        onChange={(e) => updateAttendee(index, "photoConsent", e.target.checked)}
                      />
                      <span>{t("photoConsent")}</span>
                    </label>
                    <p className={styles.consentDescription}>{t("photoConsentDescription")}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Order Summary */}
      <div className={styles.orderSummary}>
        <h4>{t("orderSummary")}</h4>
        <div className={styles.summaryItems}>
          {ticketDetails.map((detail, i) => (
            <div key={i} className={styles.summaryItem}>
              <span>
                {detail.quantity}x {detail.ticketTypeName}
              </span>
              <span>
                {currency} {(detail.quantity * detail.unitPrice).toFixed(2)}
              </span>
            </div>
          ))}
          {discountAmount > 0 && (
            <div className={styles.summaryDiscount}>
              <span>{t("discountLabel")}</span>
              <span>
                -{currency} {discountAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <div className={styles.summaryTotal}>
          <span>{t("totalLabel")}</span>
          <span>
            {currency} {totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Legal Consents */}
      <div className={styles.legalConsents}>
        <h4>{t("termsAndConditions")}</h4>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
          />
          <span>
            {t.rich("gdprConsent", {
              privacy: (chunks) => (
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </span>
        </label>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            {t.rich("termsConsent", {
              sale: (chunks) => (
                <a href="/terms-of-sale" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
              terms: (chunks) => (
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </span>
        </label>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onBack}
          disabled={isSubmitting}
        >
          {t("cancel")}
        </button>
        <button type="submit" className={styles.submitButton} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              {t("processingButton")}
            </>
          ) : totalAmount === 0 ? (
            t("completeRegistration")
          ) : (
            t("proceedToPaymentAmount", { currency, amount: totalAmount.toFixed(2) })
          )}
        </button>
      </div>
    </form>
  )
}
