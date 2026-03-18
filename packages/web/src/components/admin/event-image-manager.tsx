"use client"

import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import {
  type EventImage,
  removeEventImage,
  setEventImageFromLibrary,
  uploadEventImage,
} from "@/app/[locale]/(admin)/admin/events/[slug]/images.action"
import EventDefaultImageManager from "./event-default-image-manager"
import ImageCropper from "./image-cropper"
import MediaLibraryBrowser from "./media-library-browser"

// Gallery images: free aspect ratio, max 1920px on longest edge
// Optimized for web: max dimension 1920px, quality 85% for <200KB file size
const GALLERY_IMAGE_ASPECT_RATIO = 0 // 0 = free aspect ratio
const GALLERY_IMAGE_MAX_DIMENSION = 1920
const GALLERY_IMAGE_QUALITY = 0.85

interface Props {
  eventSlug: string
  eventName: string
  defaultImage?: EventImage | null
  galleryImages: EventImage[]
  onUpdate: () => void
}

export default function EventImageManager({
  eventSlug,
  eventName,
  defaultImage,
  galleryImages,
  onUpdate,
}: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return
    }

    setError(null)
    setOriginalFile(file)

    // Load image for cropper preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleCroppedImage = async (blob: Blob) => {
    setShowCropper(false)
    setImageToCrop(null)
    setIsUploading(true)
    setError(null)

    try {
      // Replace extension with .webp for optimized file size
      const baseName = originalFile?.name?.replace(/\.[^/.]+$/, "") || "cropped"
      const croppedFile = new File([blob], `${baseName}.webp`, {
        type: "image/webp",
      })

      const result = await uploadEventImage(eventSlug, croppedFile, "images")

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to upload image")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
      setOriginalFile(null)
      // Reset file input so the same file can be selected again
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ""
      }
    }
  }

  const handleCancelCrop = () => {
    setShowCropper(false)
    setImageToCrop(null)
    setOriginalFile(null)
    // Reset file input so the same file can be selected again
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ""
    }
  }

  const handleRemoveGalleryImage = async (fileId: number) => {
    if (!confirm("Remove this image from the gallery?")) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await removeEventImage(eventSlug, fileId, "images")

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to remove image")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleMediaLibrarySelect = async (image: EventImage) => {
    setIsUploading(true)
    setError(null)

    try {
      const result = await setEventImageFromLibrary(eventSlug, image.id, "images")

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to set image from library")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set image from library")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="event-image-manager">
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
          aspectRatio={GALLERY_IMAGE_ASPECT_RATIO}
          outputWidth={GALLERY_IMAGE_MAX_DIMENSION}
          quality={GALLERY_IMAGE_QUALITY}
        />
      )}

      <MediaLibraryBrowser
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaLibrarySelect}
        title="Add Gallery Image"
      />

      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      {/* Default Image Section - using reusable ImageManager */}
      <EventDefaultImageManager
        eventSlug={eventSlug}
        eventName={eventName}
        defaultImage={defaultImage}
        onUpdate={onUpdate}
      />

      {/* Gallery Section */}
      <div className="image-section">
        <h4>Event Gallery</h4>
        <p className="section-description">Additional images shown in the event gallery section.</p>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        <div className="gallery-grid">
          {galleryImages.map((img) => (
            <div key={img.id} className="gallery-item">
              <Image
                src={img.formats?.thumbnail?.url || img.url}
                alt={img.name}
                width={120}
                height={120}
                style={{ objectFit: "cover" }}
              />
              <button
                type="button"
                className="gallery-item-remove"
                onClick={() => handleRemoveGalleryImage(img.id)}
                disabled={isUploading}
                title="Remove image"
              >
                <i className="bx bx-x" />
              </button>
            </div>
          ))}

          <div
            className={`gallery-add ${isDragging ? "dragging" : ""}`}
            onClick={() => galleryInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Upload new image"
          >
            {isUploading ? (
              <i className="bx bx-loader-alt bx-spin" />
            ) : (
              <>
                <i className="bx bx-plus" />
                <span>Upload</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="gallery-add gallery-library-btn"
            onClick={() => setShowMediaLibrary(true)}
            disabled={isUploading}
            title="Browse media library"
          >
            <i className="bx bx-images" />
            <span>Library</span>
          </button>
        </div>
      </div>
    </div>
  )
}
