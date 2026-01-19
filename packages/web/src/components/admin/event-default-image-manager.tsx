"use client"

import {
  type EventImage,
  removeEventImage,
  setEventImageFromLibrary,
  uploadEventImage,
} from "@/app/(admin)/admin/events/[slug]/images.action"
import { useToast } from "@/components/admin/toast"
import { useRouter } from "next/navigation"
import ImageManager from "./image-manager"

// Default image aspect ratio: 6:5 (e.g., 600x500)
const DEFAULT_IMAGE_ASPECT_RATIO = 6 / 5
const DEFAULT_IMAGE_OUTPUT_WIDTH = 600

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
}

interface Props {
  eventSlug: string
  eventName: string
  defaultImage?: EventImage | null
  onUpdate: () => void
}

export default function EventDefaultImageManager({
  eventSlug,
  eventName,
  defaultImage,
  onUpdate,
}: Props) {
  const router = useRouter()
  const toast = useToast()

  const handleUpload = async (blob: Blob) => {
    const croppedFile = new File([blob], `${slugify(eventName)}.webp`, {
      type: "image/webp",
    })

    const result = await uploadEventImage(eventSlug, croppedFile, "defaultImage")

    if (result.success) {
      toast.success("Default image uploaded!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to upload image")
    }
  }

  const handleRemove = async () => {
    if (!defaultImage) return

    const result = await removeEventImage(eventSlug, defaultImage.id, "defaultImage")

    if (result.success) {
      toast.success("Default image removed!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to remove image")
    }
  }

  const handleLibrarySelect = async (imageId: number, _imageUrl: string) => {
    const result = await setEventImageFromLibrary(eventSlug, imageId, "defaultImage")

    if (result.success) {
      toast.success("Default image updated!")
      onUpdate()
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to set image from library")
    }
  }

  return (
    <ImageManager
      image={defaultImage ? { url: defaultImage.url } : null}
      onUpload={handleUpload}
      onRemove={handleRemove}
      onLibrarySelect={handleLibrarySelect}
      outputSize={DEFAULT_IMAGE_OUTPUT_WIDTH}
      aspectRatio={DEFAULT_IMAGE_ASPECT_RATIO}
      title="Default Image"
      description="The main image displayed on event cards and listings (600x500 recommended)."
      libraryTitle="Select Default Image"
    />
  )
}
