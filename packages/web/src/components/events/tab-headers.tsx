"use client"

import openTabSection from "@/libs/tabs"
import type { Event } from "@/models/strapi"

export default function TabHeaders({
  event,
  participantCount,
}: {
  event: Event
  participantCount?: number
}) {
  return (
    <ul className="nav nav-tabs" id="myTab" role="tablist">
      {/* Overview */}
      <li className="current" onClick={(e) => openTabSection(e, "overviewTab")} aria-hidden="true">
        <i className="bx bx-info-circle" /> Overview
      </li>

      {/* Schedule */}
      <li onClick={(e) => openTabSection(e, "scheduleTab")} aria-hidden="true">
        <i className="bx bx-time" /> Schedule
      </li>

      {/* Players */}
      <li onClick={(e) => openTabSection(e, "playersTab")} aria-hidden="true">
        <i className="bx bx-group" /> Players{" "}
        {participantCount && participantCount > 0 ? `(${participantCount})` : ""}
      </li>

      {/* Photos */}
      <li onClick={(e) => openTabSection(e, "photosTab")} aria-hidden="true">
        <i className="bx bx-images" /> Photos{" "}
        {event.images && event.images.length > 0 ? `(${event.images.length})` : ""}
      </li>
    </ul>
  )
}
