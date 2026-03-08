"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { LinkedInAccountStatus } from "@/app/(admin)/admin/linkedin/linkedin.action"
import { getLinkedInAccountStatus } from "@/app/(admin)/admin/linkedin/linkedin.action"
import { useToast } from "@/components/admin/toast"
import {
  getLinkedInPostHistory,
  type LinkedInPostHistoryItem,
  type LinkedInPostPreview,
  postToLinkedIn,
  previewLinkedInPost,
  regenerateLinkedInContent,
} from "../linkedin.action"

interface LinkedInTabProps {
  eventSlug: string
}

const POST_TYPES = [
  { value: "announcement", label: "Event announcement" },
  { value: "reminder30days", label: "30-day reminder" },
  { value: "reminder7days", label: "7-day reminder" },
] as const

export default function LinkedInTab({ eventSlug }: LinkedInTabProps) {
  const toast = useToast()

  // Connection status
  const [account, setAccount] = useState<LinkedInAccountStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  // Post composer
  const [postType, setPostType] = useState("announcement")
  const [preview, setPreview] = useState<LinkedInPostPreview | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [showPostConfirm, setShowPostConfirm] = useState(false)

  // Post history
  const [history, setHistory] = useState<LinkedInPostHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Load account status and history on mount
  useEffect(() => {
    async function loadData() {
      const [statusResult, historyResult] = await Promise.all([
        getLinkedInAccountStatus(),
        getLinkedInPostHistory(eventSlug),
      ])

      if (statusResult.success) {
        setAccount(statusResult.data)
      }
      setIsLoadingStatus(false)

      if (historyResult.success) {
        setHistory(historyResult.data ?? [])
      }
      setIsLoadingHistory(false)
    }

    loadData()
  }, [eventSlug])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const result = await previewLinkedInPost(eventSlug, postType)

    if (result.success && result.data) {
      setPreview(result.data)
      setEditedContent(result.data.text)
    } else {
      toast.error(result.error || "Failed to generate content")
    }
    setIsGenerating(false)
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    const result = await regenerateLinkedInContent(eventSlug, postType)

    if (result.success && result.data) {
      setPreview(result.data)
      setEditedContent(result.data.text)
    } else {
      toast.error(result.error || "Failed to regenerate content")
    }
    setIsGenerating(false)
  }

  const handlePost = async () => {
    setIsPosting(true)
    setShowPostConfirm(false)

    const result = await postToLinkedIn(eventSlug, postType, editedContent)

    if (result.success) {
      toast.success("Posted to LinkedIn!")
      setPreview(null)
      setEditedContent("")

      // Refresh history
      const historyResult = await getLinkedInPostHistory(eventSlug)
      if (historyResult.success) {
        setHistory(historyResult.data ?? [])
      }
    } else {
      toast.error(result.error || "Failed to post to LinkedIn")
    }
    setIsPosting(false)
  }

  if (isLoadingStatus) {
    return (
      <div className="admin-form-section">
        <i className="bx bx-loader-alt bx-spin" /> Loading...
      </div>
    )
  }

  return (
    <>
      {/* Connection status */}
      <div className="admin-form-section">
        <h2>LinkedIn connection</h2>
        {!account || account.accountStatus !== "active" ? (
          <div>
            <p className="admin-form-section-description">
              You need to connect your LinkedIn account before you can post.
            </p>
            <Link href="/admin/profile?tab=settings" className="btn btn-primary">
              <i className="bx bxl-linkedin-square" /> Connect LinkedIn in settings
            </Link>
          </div>
        ) : (
          <div className="linkedin-account-info">
            <i
              className="bx bxl-linkedin-square"
              style={{ fontSize: "1.2rem", color: "#0077b5" }}
            />
            <span>
              Connected as <strong>{account.displayName || "LinkedIn user"}</strong>
            </span>
            <span className="badge badge-success">active</span>
          </div>
        )}
      </div>

      {/* Post composer */}
      {account?.accountStatus === "active" && (
        <div className="admin-form-section">
          <h2>Compose post</h2>
          <p className="admin-form-section-description">
            Generate AI content, edit it, then post to your LinkedIn profile.
          </p>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="postType">Post type</label>
              <select
                id="postType"
                value={postType}
                onChange={(e) => {
                  setPostType(e.target.value)
                  setPreview(null)
                  setEditedContent("")
                }}
                className="admin-select"
              >
                {POST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Generating...
                </>
              ) : (
                <>
                  <i className="bx bx-magic-wand" /> Generate with AI
                </>
              )}
            </button>

            {preview && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <i className="bx bx-refresh" /> Regenerate
              </button>
            )}
          </div>

          {preview && (
            <>
              <div className="admin-form-group">
                <label htmlFor="postContent">Post content</label>
                <textarea
                  id="postContent"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="admin-input"
                  rows={10}
                  style={{ fontFamily: "inherit" }}
                />
                <small style={{ color: "var(--text-muted)" }}>
                  {editedContent.length} characters
                  {preview.hashtags.length > 0 && ` · Hashtags: ${preview.hashtags.join(" ")}`}
                </small>
              </div>

              {showPostConfirm ? (
                <div style={{ marginTop: "1rem" }}>
                  <p>
                    <strong>Post this to your LinkedIn profile?</strong> This action cannot be
                    undone.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handlePost}
                      disabled={isPosting}
                    >
                      {isPosting ? (
                        <>
                          <i className="bx bx-loader-alt bx-spin" /> Posting...
                        </>
                      ) : (
                        <>
                          <i className="bx bxl-linkedin-square" /> Yes, post now
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowPostConfirm(false)}
                      disabled={isPosting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowPostConfirm(true)}
                  disabled={!editedContent.trim()}
                  style={{ marginTop: "0.5rem" }}
                >
                  <i className="bx bxl-linkedin-square" /> Post to LinkedIn
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Post history */}
      <div className="admin-form-section">
        <h2>Post history</h2>
        {isLoadingHistory ? (
          <p>
            <i className="bx bx-loader-alt bx-spin" /> Loading history...
          </p>
        ) : history.length === 0 ? (
          <p className="admin-form-section-description">No LinkedIn posts yet for this event.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Posted by</th>
                  <th>Content</th>
                </tr>
              </thead>
              <tbody>
                {history.map((post) => (
                  <tr key={post.documentId}>
                    <td>
                      {post.postedAt
                        ? new Date(post.postedAt).toLocaleDateString()
                        : new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td>{post.postType}</td>
                    <td>
                      <span
                        className={`badge ${
                          post.postStatus === "published"
                            ? "badge-success"
                            : post.postStatus === "failed"
                              ? "badge-danger"
                              : "badge-secondary"
                        }`}
                      >
                        {post.postStatus}
                      </span>
                    </td>
                    <td>{post.playerName || "—"}</td>
                    <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {post.postStatus === "failed"
                        ? post.errorMessage
                        : post.content?.substring(0, 100)}
                      {post.content && post.content.length > 100 ? "..." : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
