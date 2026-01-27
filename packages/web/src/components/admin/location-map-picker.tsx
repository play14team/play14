"use client"

import "mapbox-gl/dist/mapbox-gl.css"
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css"
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"
import mapboxgl from "mapbox-gl"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useRef, useState } from "react"
import Map, {
  FullscreenControl,
  GeolocateControl,
  Marker,
  NavigationControl,
  useControl,
} from "react-map-gl/mapbox"

export interface MapLocation {
  geometry?: {
    coordinates?: [number, number]
    type?: string
  }
  place_name?: string
}

interface LocationMapPickerProps {
  value: MapLocation | null
  onChange: (location: MapLocation | null) => void
  height?: string
  /** Optional location name to center the map on (used for geocoding) */
  centerOnLocation?: string
  /** If true, automatically set coordinates when centerOnLocation changes (not just center the map) */
  autoFillFromLocation?: boolean
  /** Callback when a country is detected from geocoding (receives ISO 3166-1 alpha-2 code, e.g., "FR", "DE") */
  onCountryDetected?: (countryCode: string) => void
  /** Geocoding precision: "city" for cities/regions (Event Locations), "address" for precise addresses (Venues) */
  precision?: "city" | "address"
}

// Geocoder control that uses the map's geocoder
interface GeocoderControlProps {
  mapboxAccessToken: string
  onResult: (result: MapLocation) => void
  position?: "top-left" | "top-right" | "bottom-right" | "bottom-left"
  /** Geocoding precision: "city" for cities/regions, "address" for precise addresses */
  precision?: "city" | "address"
}

function GeocoderControl({
  mapboxAccessToken,
  onResult,
  position = "top-left",
  precision = "city",
}: GeocoderControlProps) {
  useControl(
    () => {
      // Set types based on precision level
      // "city" = place, locality, region, country (city-level, good for Event Locations)
      // "address" = address, poi, place, locality (precise addresses, good for Venues)
      const types =
        precision === "address" ? "address,poi,place,locality" : "place,locality,region,country"

      const ctrl = new MapboxGeocoder({
        accessToken: mapboxAccessToken,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder:
          precision === "address" ? "Search for an address..." : "Search for a location...",
        types,
      })
      ctrl.on("result", (evt: { result: any }) => {
        const result = evt.result
        onResult({
          geometry: {
            coordinates: result.center as [number, number],
            type: "Point",
          },
          place_name: result.place_name,
        })
      })
      return ctrl as any
    },
    { position }
  )
  return null
}

// Helper to extract country code from Mapbox geocoding result
function extractCountryCode(feature: any): string | null {
  // Check if the feature itself is a country
  if (feature.place_type?.includes("country") && feature.properties?.short_code) {
    return feature.properties.short_code.toUpperCase()
  }
  // Otherwise look in the context array
  if (feature.context) {
    const countryContext = feature.context.find((ctx: any) => ctx.id?.startsWith("country."))
    if (countryContext?.short_code) {
      return countryContext.short_code.toUpperCase()
    }
  }
  return null
}

// Zoom levels based on precision
// City: lower zoom to show the city area
// Address: higher zoom to show the precise location
const ZOOM_LEVELS = {
  city: {
    initial: 10, // When coordinates exist
    geocode: 8, // After geocoding from centerOnLocation
    search: 12, // After using search box
  },
  address: {
    initial: 16, // When coordinates exist - street level
    geocode: 14, // After geocoding from centerOnLocation
    search: 17, // After using search box - building level
  },
}

export default function LocationMapPicker({
  value,
  onChange,
  height = "400px",
  centerOnLocation,
  autoFillFromLocation = false,
  onCountryDetected,
  precision = "city",
}: LocationMapPickerProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const zoomLevels = ZOOM_LEVELS[precision]
  const [viewState, setViewState] = useState({
    longitude: value?.geometry?.coordinates?.[0] ?? 10,
    latitude: value?.geometry?.coordinates?.[1] ?? 48,
    zoom: value?.geometry?.coordinates ? zoomLevels.initial : 3,
  })

  // Use refs for callbacks to avoid re-triggering effects when callbacks change
  const onChangeRef = useRef(onChange)
  const onCountryDetectedRef = useRef(onCountryDetected)
  useEffect(() => {
    onChangeRef.current = onChange
    onCountryDetectedRef.current = onCountryDetected
  })

  const token =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    "pk.eyJ1IjoicGxheTE0IiwiYSI6ImNsaHk1dzRlNDB6Z2szbG1kMnJybHFpeWMifQ.gRYXSA5Gjoph0caYvDvHMA"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Center map (and optionally set coordinates) when centerOnLocation changes
  useEffect(() => {
    if (!centerOnLocation || centerOnLocation.length < 2) return

    const geocodeLocation = async () => {
      try {
        // Use appropriate types based on precision level
        const types =
          precision === "address" ? "address,poi,place,locality" : "place,locality,region,country"
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(centerOnLocation)}.json?access_token=${token}&limit=1&types=${types}`
        )
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const feature = data.features[0]
          const [lng, lat] = feature.center

          setViewState((prev) => ({
            ...prev,
            longitude: lng,
            latitude: lat,
            zoom: zoomLevels.geocode,
          }))

          // If autoFillFromLocation is enabled, also set the coordinates
          if (autoFillFromLocation) {
            onChangeRef.current({
              geometry: {
                coordinates: [lng, lat],
                type: "Point",
              },
              place_name: feature.place_name,
            })

            // Extract and report country code if callback provided
            const countryCode = extractCountryCode(feature)
            if (countryCode && onCountryDetectedRef.current) {
              onCountryDetectedRef.current(countryCode)
            }
          }
        }
      } catch {
        // Silently fail if geocoding doesn't work
      }
    }

    // Debounce the geocoding request
    const timeoutId = setTimeout(geocodeLocation, 500)
    return () => clearTimeout(timeoutId)
  }, [centerOnLocation, token, autoFillFromLocation, precision, zoomLevels.geocode])

  // Update view when value changes externally
  useEffect(() => {
    if (value?.geometry?.coordinates) {
      setViewState({
        longitude: value.geometry.coordinates[0],
        latitude: value.geometry.coordinates[1],
        zoom: zoomLevels.initial,
      })
    }
  }, [value, zoomLevels.initial])

  const isDark = mounted && resolvedTheme === "dark"
  const mapStyle = isDark
    ? "mapbox://styles/mapbox/navigation-night-v1"
    : "mapbox://styles/mapbox/streets-v12"
  const markerColor = isDark ? "#ffd633" : "#ffc900"

  const handleMapClick = useCallback(
    async (evt: { lngLat: { lng: number; lat: number } }) => {
      const { lng, lat } = evt.lngLat

      // Reverse geocode to get the place name
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}`
        )
        const data = await response.json()
        const placeName = data.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`

        onChange({
          geometry: {
            coordinates: [lng, lat],
            type: "Point",
          },
          place_name: placeName,
        })
      } catch {
        // If geocoding fails, just use coordinates
        onChange({
          geometry: {
            coordinates: [lng, lat],
            type: "Point",
          },
          place_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        })
      }
    },
    [onChange, token]
  )

  const handleGeocoderResult = useCallback(
    (result: MapLocation) => {
      onChange(result)
      if (result.geometry?.coordinates) {
        setViewState({
          longitude: result.geometry.coordinates[0],
          latitude: result.geometry.coordinates[1],
          zoom: zoomLevels.search,
        })
      }
    },
    [onChange, zoomLevels.search]
  )

  const handleClearLocation = () => {
    onChange(null)
    setViewState({
      longitude: 10,
      latitude: 48,
      zoom: 3,
    })
  }

  const hasLocation = value?.geometry?.coordinates

  return (
    <div className="location-map-picker">
      <div className="location-map-picker-container" style={{ height }}>
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          mapboxAccessToken={token}
          cursor="crosshair"
        >
          <GeocoderControl
            mapboxAccessToken={token}
            onResult={handleGeocoderResult}
            precision={precision}
          />
          <GeolocateControl
            position="top-right"
            trackUserLocation={false}
            showUserHeading={false}
            showAccuracyCircle={false}
          />
          <FullscreenControl position="top-right" />
          <NavigationControl position="top-right" />

          {hasLocation && (
            <Marker
              longitude={value.geometry!.coordinates![0]}
              latitude={value.geometry!.coordinates![1]}
              color={markerColor}
              draggable
              onDragEnd={(evt) => {
                handleMapClick({ lngLat: evt.lngLat })
              }}
            />
          )}
        </Map>
      </div>

      <div className="location-map-picker-info">
        {hasLocation ? (
          <>
            <div className="location-map-picker-details">
              <div className="location-map-picker-place">
                <i className="bx bx-map-pin" />
                <span>{value.place_name || "Location selected"}</span>
              </div>
              <div className="location-map-picker-coords">
                <span>
                  {value.geometry!.coordinates![1].toFixed(6)},{" "}
                  {value.geometry!.coordinates![0].toFixed(6)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={handleClearLocation}
            >
              <i className="bx bx-x" />
              Clear
            </button>
          </>
        ) : (
          <div className="location-map-picker-hint">
            <i className="bx bx-info-circle" />
            <span>Search for a location or click on the map to set coordinates</span>
          </div>
        )}
      </div>
    </div>
  )
}
