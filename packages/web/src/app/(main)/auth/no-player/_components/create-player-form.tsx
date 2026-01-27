"use client"

import { useState } from "react"
import Logo from "@/components/layout/logo"

interface CreatePlayerFormProps {
  defaultName: string
  onSubmit: (name: string, company: string) => Promise<void>
  onBack: () => void
  isSubmitting: boolean
}

export default function CreatePlayerForm({
  defaultName,
  onSubmit,
  onBack,
  isSubmitting,
}: CreatePlayerFormProps) {
  const [name, setName] = useState(defaultName)
  const [company, setCompany] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.length < 2) {
      setError("Name must be at least 2 characters.")
      return
    }

    await onSubmit(name, company)
  }

  return (
    <div className="player-linking-create">
      <Logo width={120} height={40} />
      <h1>Create Your Profile</h1>
      <p>Create a new player profile to join the #play14 community.</p>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="name">Your Name *</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="company">Company (optional)</label>
          <input
            type="text"
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your company or organization"
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="player-linking-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <i className="bx bx-arrow-back" /> Back
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || name.length < 2}
          >
            {isSubmitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" /> Creating...
              </>
            ) : (
              "Create Profile"
            )}
          </button>
        </div>
      </form>

      <p className="text-muted create-note">
        You&apos;ll be able to add more details like your bio, avatar, and social links after your
        profile is created.
      </p>
    </div>
  )
}
