"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { subscribeToNewsletter } from "./subscribe.action"

interface NewsletterSignupProps {
  source?: string
}

export default function NewsletterSignup({ source = "footer" }: NewsletterSignupProps) {
  const t = useTranslations("newsletter")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setStatus("error")
      setErrorMessage(t("errorEmpty"))
      return
    }

    startTransition(async () => {
      const result = await subscribeToNewsletter(email, firstName, source)

      if (result.success) {
        setStatus("success")
        setEmail("")
        setFirstName("")
      } else {
        setStatus("error")
        setErrorMessage(result.error || t("errorGeneric"))
      }
    })
  }

  if (status === "success") {
    return (
      <div className="newsletter-signup">
        <div className="newsletter-success">
          <i className="bx bx-check-circle" aria-hidden="true" />
          <p>{t("success")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="newsletter-signup">
      <p className="newsletter-description">{t("description")}</p>
      <form onSubmit={handleSubmit} className="newsletter-form">
        <div className="newsletter-fields">
          <input
            type="text"
            placeholder={t("firstName")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="newsletter-input newsletter-input-name"
            disabled={isPending}
            aria-label={t("firstName")}
          />
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === "error") {
                setStatus("idle")
                setErrorMessage("")
              }
            }}
            className="newsletter-input newsletter-input-email"
            disabled={isPending}
            required
            aria-label={t("email")}
            aria-invalid={status === "error"}
          />
        </div>
        <button
          type="submit"
          className="newsletter-button"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
              <span>{t("subscribing")}</span>
            </>
          ) : (
            <span>{t("subscribe")}</span>
          )}
        </button>
      </form>
      {status === "error" && errorMessage && (
        <p className="newsletter-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
