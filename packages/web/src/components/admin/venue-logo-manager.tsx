"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import {
  uploadVenueLogo,
  removeVenueLogo,
  setVenueLogoFromLibrary,
  type VenueLogo,
} from "@/app/(admin)/admin/venues/logo.action"
import ImageCropper from "./image-cropper"
import MediaLibraryBrowser from "./media-library-browser"

// Logo aspect ratio: 1:1 (square)
const LOGO_ASPECT_RATIO = 1
const LOGO_OUTPUT_SIZE = 200

interface Props {
  venueId: string
  logo?: VenueLogo | null
  onUpdate: () => void
}

export default function VenueLogoManager({ venueId, logo, onUpdate }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const baseName = originalFile?.name?.replace(/\.[^/.]+$/, "") || "logo"
      const croppedFile = new File([blob], `${baseName}.webp`, {
        type: "image/webp",
      })

      const result = await uploadVenueLogo(venueId, croppedFile)

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to upload logo")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo")
    } finally {
      setIsUploading(false)
      setOriginalFile(null)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCancelCrop = () => {
    setShowCropper(false)
    setImageToCrop(null)
    setOriginalFile(null)
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm("Remove the venue logo?")) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await removeVenueLogo(venueId)

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to remove logo")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo")
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

  const handleMediaLibrarySelect = async (image: { id: number }) => {
    setIsUploading(true)
    setError(null)

    try {
      const result = await setVenueLogoFromLibrary(venueId, image.id)

      if (result.success) {
        onUpdate()
      } else {
        setError(result.error || "Failed to set logo from library")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set logo from library")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="venue-logo-manager">
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
          aspectRatio={LOGO_ASPECT_RATIO}
          outputWidth={LOGO_OUTPUT_SIZE}
          quality={0.9}
        />
      )}

      <MediaLibraryBrowser
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaLibrarySelect}
        title="Select Logo"
      />

      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      <div className="image-section">
        <h4>Venue Logo</h4>
        <p className="section-description">
          A square logo representing the venue (200x200 recommended).
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        {logo ? (
          <div className="image-preview-card">
            <div className="image-preview logo-preview">
              <Image
                src={logo.url}
                alt="Venue logo"
                width={120}
                height={120}
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className="image-preview-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <i className="bx bx-upload"></i>
                Upload New
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setShowMediaLibrary(true)}
                disabled={isUploading}
              >
                <i className="bx bx-images"></i>
                Browse Library
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={handleRemoveLogo}
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
              className={`image-dropzone logo-dropzone ${isDragging ? "dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploading ? (
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
                  <span className="dropzone-hint">Square image, PNG/JPG up to 10MB</span>
                </>
              )}
            </div>
            <div className="image-upload-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary image-library-btn"
              onClick={() => setShowMediaLibrary(true)}
              disabled={isUploading}
            >
              <i className="bx bx-images"></i>
              Browse Media Library
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
