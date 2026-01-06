"use client"

import LocationMapPicker, { type MapLocation } from "./location-map-picker"

interface VenueMapPickerProps {
  value: MapLocation | null
  onChange: (location: MapLocation | null) => void
  height?: string
  /** Optional location name to center the map on (used for geocoding) */
  centerOnLocation?: string
  /** If true, automatically set coordinates when centerOnLocation changes */
  autoFillFromLocation?: boolean
}

/**
 * Map picker optimized for venue addresses.
 * Uses address-level precision geocoding (addresses, POIs, places)
 * instead of city-level precision.
 */
export default function VenueMapPicker({
  value,
  onChange,
  height = "400px",
  centerOnLocation,
  autoFillFromLocation = false,
}: VenueMapPickerProps) {
  return (
    <LocationMapPicker
      value={value}
      onChange={onChange}
      height={height}
      centerOnLocation={centerOnLocation}
      autoFillFromLocation={autoFillFromLocation}
      precision="address"
    />
  )
}

export type { MapLocation }
