"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "true") {
      setStatus("success")
      setMessage("LinkedIn account connected successfully!")
      // Redirect to profile settings after a short delay
      setTimeout(() => {
        router.push("/admin/profile?tab=settings")
      }, 2000)
    } else if (error) {
      setStatus("error")
      setMessage(decodeURIComponent(error))
    } else {
      setStatus("error")
      setMessage("Unexpected callback state")
    }
  }, [searchParams, router])

  return (
    <div className="admin-page">
      <div className="admin-form-section" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        {status === "loading" && (
          <>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} />
            <p>Processing LinkedIn authorization...</p>
          </>
        )}

        {status === "success" && (
          <>
            <i
              className="bx bx-check-circle"
              style={{ fontSize: "3rem", color: "var(--success-color)" }}
            />
            <h2>Connected!</h2>
            <p>{message}</p>
            <p style={{ color: "var(--text-muted)" }}>Redirecting to your profile...</p>
          </>
        )}

        {status === "error" && (
          <>
            <i
              className="bx bx-error-circle"
              style={{ fontSize: "3rem", color: "var(--danger-color)" }}
            />
            <h2>Connection failed</h2>
            <p>{message}</p>
            <Link href="/admin/profile?tab=settings" className="btn btn-primary">
              Back to settings
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-page">
          <div className="admin-form-section" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} />
            <p>Processing...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
