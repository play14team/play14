"use client"

import type { GeoLocation } from "@/models/strapi"
import dynamic from "next/dynamic"

// Lazy load the map component for better performance
const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <div className="event-profile-map__loading" />,
})

interface EventMapProps {
  location: GeoLocation
  zoom?: number
  popup?: boolean
}

export default function EventMap({ location, zoom = 12, popup = false }: EventMapProps) {
  return (
    <div className="event-profile-map">
      <div className="event-profile-map__container">
        <Map location={location} height="350px" zoom={zoom} popup={popup} />
      </div>
    </div>
  )
}
