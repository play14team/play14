"use client"

import { useRouter } from "next/navigation"
import {
  removeVenueLogo,
  setVenueLogoFromLibrary,
  uploadVenueLogo,
  type VenueLogo,
} from "@/app/(admin)/admin/venues/logo.action"
import { useToast } from "@/components/admin/toast"
import ImageManager from "./image-manager"

const LOGO_OUTPUT_SIZE = 200

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
}

interface Props {
  venueId: string
  venueName: string
  logo?: VenueLogo | null
  onUpdate: () => void
}

export default function VenueLogoManager({ venueId, venueName, logo, onUpdate }: Props) {
  const router = useRouter()
  const toast = useToast()

  const handleUpload = async (blob: Blob) => {
    const croppedFile = new File([blob], `${slugify(venueName)}.webp`, {
      type: "image/webp",
    })

    const result = await uploadVenueLogo(venueId, croppedFile)

    if (result.success) {
      toast.success("Logo uploaded successfully!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to upload logo")
    }
  }

  const handleRemove = async () => {
    const result = await removeVenueLogo(venueId)

    if (result.success) {
      toast.success("Logo removed successfully!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to remove logo")
    }
  }

  const handleLibrarySelect = async (imageId: number, _imageUrl: string) => {
    const result = await setVenueLogoFromLibrary(venueId, imageId)

    if (result.success) {
      toast.success("Logo updated from library!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to set logo from library")
    }
  }

  return (
    <ImageManager
      image={logo ? { url: logo.url } : null}
      onUpload={handleUpload}
      onRemove={handleRemove}
      onLibrarySelect={handleLibrarySelect}
      outputSize={LOGO_OUTPUT_SIZE}
      title="Venue Logo"
      description="A square logo representing the venue (200x200 recommended)."
      libraryTitle="Select Logo"
    />
  )
}
