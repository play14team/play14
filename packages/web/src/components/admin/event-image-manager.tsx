"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import {
  uploadEventImage,
  removeEventImage,
  setEventImageFromLibrary,
  type EventImage,
} from "@/app/(admin)/admin/events/[slug]/images.action"
import ImageCropper from "./image-cropper"
import MediaLibraryBrowser from "./media-library-browser"

// Default image aspect ratio: 6:5 (e.g., 600x500)
const DEFAULT_IMAGE_ASPECT_RATIO = 6 / 5
const DEFAULT_IMAGE_OUTPUT_WIDTH = 600

// Gallery images: free aspect ratio, max 1920px on longest edge
// Optimized for web: max dimension 1920px, quality 85% for <200KB file size
const GALLERY_IMAGE_ASPECT_RATIO = 0 // 0 = free aspect ratio
const GALLERY_IMAGE_MAX_DIMENSION = 1920
const GALLERY_IMAGE_QUALITY = 0.85

interface Props {
  eventSlug: string
  defaultImage?: EventImage | null
  galleryImages: EventImage[]
  onUpdate: () => void
}

export default function EventImageManager({
  eventSlug,
  defaultImage,
  galleryImages,
  onUpdate,
}: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingField, setUploadingField] = useState<"defaultImage" | "images" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<"defaultImage" | "images">("defaultImage")
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [mediaLibraryTarget, setMediaLibraryTarget] = useState<"defaultImage" | "images">("defaultImage")
  const defaultImageInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (file: File, field: "defaultImage" | "images") => {
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
      setCropTarget(field)
      setOriginalFile(file)

      // Load image for cropper preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageToCrop(e.target?.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    },
    []
  )

  const handleCroppedImage = async (blob: Blob) => {
    setShowCropper(false)
    setImageToCrop(null)
    setIsUploading(true)
    setUploadingField(cropTarget)
    setError(null)

    try {
      // Replace extension with .webp for optimized file size
      const baseName = originalFile?.name?.replace(/\.[^/.]+$/, "") || "cropped"
      const croppedFile = new File([blob], `${baseName}.webp`, {
        type: "image/webp",
      })

      const result = await uploadEventImage(eventSlug, croppedFile, cropTarget)

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to upload image")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
      setUploadingField(null)
      setOriginalFile(null)
      // Reset file inputs so the same file can be selected again
      if (defaultImageInputRef.current) {
        defaultImageInputRef.current.value = ""
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ""
      }
    }
  }

  const handleCancelCrop = () => {
    setShowCropper(false)
    setImageToCrop(null)
    setOriginalFile(null)
    // Reset file inputs so the same file can be selected again
    if (defaultImageInputRef.current) {
      defaultImageInputRef.current.value = ""
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ""
    }
  }

  const handleRemoveImage = async (fileId: number, field: "defaultImage" | "images") => {
    if (field === "defaultImage" && !confirm("Remove the default event image?")) {
      return
    }
    if (field === "images" && !confirm("Remove this image from the gallery?")) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await removeEventImage(eventSlug, fileId, field)

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

  const handleDrop = (e: React.DragEvent, field: "defaultImage" | "images") => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file, field)
    }
  }

  const openMediaLibrary = (field: "defaultImage" | "images") => {
    setMediaLibraryTarget(field)
    setShowMediaLibrary(true)
  }

  const handleMediaLibrarySelect = async (image: EventImage) => {
    setIsUploading(true)
    setUploadingField(mediaLibraryTarget)
    setError(null)

    try {
      const result = await setEventImageFromLibrary(eventSlug, image.id, mediaLibraryTarget)

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to set image from library")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set image from library")
    } finally {
      setIsUploading(false)
      setUploadingField(null)
    }
  }

  return (
    <div className="event-image-manager">
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
          aspectRatio={cropTarget === "defaultImage" ? DEFAULT_IMAGE_ASPECT_RATIO : GALLERY_IMAGE_ASPECT_RATIO}
          outputWidth={cropTarget === "defaultImage" ? DEFAULT_IMAGE_OUTPUT_WIDTH : GALLERY_IMAGE_MAX_DIMENSION}
          quality={cropTarget === "defaultImage" ? 0.9 : GALLERY_IMAGE_QUALITY}
        />
      )}

      <MediaLibraryBrowser
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaLibrarySelect}
        title={mediaLibraryTarget === "defaultImage" ? "Select Default Image" : "Add Gallery Image"}
      />

      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {/* Default Image Section */}
      <div className="image-section">
        <h4>Default Image *</h4>
        <p className="section-description">
          The main image displayed on event cards and at the top of the event page.
        </p>

        <input
          ref={defaultImageInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file, "defaultImage")
          }}
        />

        {defaultImage ? (
          <div className="image-preview-card">
            <div className="image-preview">
              <Image
                src={defaultImage.url}
                alt="Default event image"
                width={200}
                height={200}
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="image-preview-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => defaultImageInputRef.current?.click()}
                disabled={isUploading}
              >
                <i className="bx bx-upload"></i>
                Upload New
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => openMediaLibrary("defaultImage")}
                disabled={isUploading}
              >
                <i className="bx bx-images"></i>
                Browse Library
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => handleRemoveImage(defaultImage.id, "defaultImage")}
                disabled={isUploading}
              >
                <i className="bx bx-trash"></i>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-options">
            <div
              className={`image-dropzone ${isDragging ? "dragging" : ""}`}
              onClick={() => defaultImageInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "defaultImage")}
            >
              {isUploading && uploadingField === "defaultImage" ? (
                <div className="dropzone-uploading">
                  <i className="bx bx-loader-alt bx-spin"></i>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <i className="bx bx-image-add"></i>
                  <p>
                    <strong>Click to upload</strong> or drag and drop
                  </p>
                  <span className="dropzone-hint">PNG, JPG up to 10MB</span>
                </>
              )}
            </div>
            <div className="image-upload-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary image-library-btn"
              onClick={() => openMediaLibrary("defaultImage")}
              disabled={isUploading}
            >
              <i className="bx bx-images"></i>
              Browse Media Library
            </button>
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div className="image-section">
        <h4>Event Gallery</h4>
        <p className="section-description">
          Additional images shown in the event gallery section.
        </p>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file, "images")
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
                onClick={() => handleRemoveImage(img.id, "images")}
                disabled={isUploading}
                title="Remove image"
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
          ))}

          <div
            className={`gallery-add ${isDragging ? "dragging" : ""}`}
            onClick={() => galleryInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "images")}
            title="Upload new image"
          >
            {isUploading && uploadingField === "images" ? (
              <i className="bx bx-loader-alt bx-spin"></i>
            ) : (
              <>
                <i className="bx bx-plus"></i>
                <span>Upload</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="gallery-add gallery-library-btn"
            onClick={() => openMediaLibrary("images")}
            disabled={isUploading}
            title="Browse media library"
          >
            <i className="bx bx-images"></i>
            <span>Library</span>
          </button>
        </div>
      </div>
    </div>
  )
}
