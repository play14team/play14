"use client"

import Image from "next/image"
import Link from "next/link"
import Logo from "@/components/layout/logo"
import type { PendingClaim } from "@/components/auth/player-linking/types"
import DefaultPlayerImage from "@/components/ui/default-player-image"

interface ClaimPendingProps {
  claim: PendingClaim
  onCancel: () => Promise<void>
  onRefresh: () => void
  isCancelling: boolean
}

export default function ClaimPending({
  claim,
  onCancel,
  onRefresh,
  isCancelling,
}: ClaimPendingProps) {
  return (
    <div className="player-linking-pending">
      <Logo width={120} height={40} />
      <div className="player-linking-icon pending">
        <i className="bx bx-time-five"></i>
      </div>
      <h1>Claim Submitted</h1>
      <p>Your claim is being reviewed by our administrators.</p>
      <p className="text-muted">
        You&apos;ll receive an email once your claim has been processed.
      </p>

      <div className="player-linking-player-card">
        <div className="player-avatar">
          {claim.player.avatar ? (
            <Image
              src={claim.player.avatar.url}
              alt={claim.player.name}
              width={60}
              height={60}
              style={{ objectFit: "cover", borderRadius: "50%" }}
              unoptimized
            />
          ) : (
            <DefaultPlayerImage
              alt="default"
              width={60}
              height={60}
              style={{ objectFit: "cover", borderRadius: "50%" }}
            />
          )}
        </div>
        <div className="player-info">
          <h3>{claim.player.name}</h3>
          <span className="position">{claim.player.position}</span>
          <span className="status pending">
            <i className="bx bx-time-five"></i> Pending Review
          </span>
        </div>
      </div>

      <div className="claim-details">
        <h4>Your reason:</h4>
        <p className="reason">{claim.reason}</p>
        <p className="submitted-at">
          Submitted on{" "}
          {new Date(claim.createdAt).toLocaleDateString("en-US", {
            dateStyle: "long",
          })}
        </p>
      </div>

      <div className="player-linking-actions">
        <button className="btn btn-outline" onClick={onRefresh}>
          <i className="bx bx-refresh"></i> Check Status
        </button>
        <button
          className="btn btn-danger-outline"
          onClick={onCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i> Cancelling...
            </>
          ) : (
            "Cancel Claim"
          )}
        </button>
      </div>

      <div className="player-linking-footer">
        <p>
          Need help?{" "}
          <Link href="/contact">Contact us</Link>
        </p>
      </div>
    </div>
  )
}
