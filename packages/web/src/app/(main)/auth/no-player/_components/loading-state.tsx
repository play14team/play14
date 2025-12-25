"use client"

import Logo from "@/components/layout/logo"

export default function LoadingState() {
  return (
    <div className="player-linking-loading">
      <Logo width={120} height={40} />
      <div className="player-linking-spinner">
        <i className="bx bx-loader-alt bx-spin"></i>
      </div>
      <p>Checking for matching player profile...</p>
    </div>
  )
}
