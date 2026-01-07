"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import ImageCropper from "./image-cropper"
import MediaLibraryBrowser from "./media-library-browser"

interface ImageManagerProps {
  // Core props
  image: { url: string } | null | undefined
  onUpload: (blob: Blob) => Promise<void>
  onRemove: () => Promise<void>
  onLibrarySelect?: (imageId: number, imageUrl: string) => Promise<void>

  // Configuration
  outputSize: number
  title: string
  description?: string

  // Optional
  aspectRatio?: number // Default: 1 (square). Use 6/5 for event images, etc.
  showLibraryButton?: boolean
  disabled?: boolean
  libraryTitle?: string
}

export default function ImageManager({
  image,
  onUpload,
  onRemove,
  onLibrarySelect,
  outputSize,
  title,
  description,
  aspectRatio = 1,
  showLibraryButton = true,
  disabled = false,
  libraryTitle = "Select Image",
}: ImageManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
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
    setIsLoading(true)
    setError(null)

    try {
      await onUpload(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setIsLoading(false)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCancelCrop = () => {
    setShowCropper(false)
    setImageToCrop(null)
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemove = async () => {
    if (!confirm("Remove this image?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image")
    } finally {
      setIsLoading(false)
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

  const handleMediaLibrarySelect = async (selectedImage: { id: number; url: string }) => {
    if (!onLibrarySelect) return

    setIsLoading(true)
    setError(null)

    try {
      await onLibrarySelect(selectedImage.id, selectedImage.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set image from library")
    } finally {
      setIsLoading(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const canShowLibrary = showLibraryButton && onLibrarySelect

  return (
    <div className="image-manager">
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
          aspectRatio={aspectRatio}
          outputWidth={outputSize}
          quality={0.9}
        />
      )}

      {canShowLibrary && (
        <MediaLibraryBrowser
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleMediaLibrarySelect}
          title={libraryTitle}
        />
      )}

      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      <div className="image-section">
        <h4>{title}</h4>
        {description && (
          <p className="section-description">{description}</p>
        )}

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

        {image ? (
          // Has image - show preview with action buttons
          <div className="image-manager-preview">
            <div className="image-manager-image">
              <Image
                src={image.url}
                alt={title}
                width={Math.min(outputSize, 160)}
                height={Math.min(outputSize / aspectRatio, 160)}
                style={{ objectFit: "contain" }}
              />
            </div>
            {isLoading && (
              <div className="image-manager-loading">
                <i className="bx bx-loader-alt bx-spin"></i>
                Processing...
              </div>
            )}
            <div className="image-manager-actions">
              <button
                type="button"
                className="admin-btn-icon admin-btn-secondary"
                onClick={triggerFileUpload}
                disabled={disabled || isLoading}
                title="Upload new image"
              >
                <i className="bx bx-upload"></i>
              </button>
              {canShowLibrary && (
                <button
                  type="button"
                  className="admin-btn-icon admin-btn-secondary"
                  onClick={() => setShowMediaLibrary(true)}
                  disabled={disabled || isLoading}
                  title="Select from media library"
                >
                  <i className="bx bx-images"></i>
                </button>
              )}
              <button
                type="button"
                className="admin-btn-icon admin-btn-danger"
                onClick={handleRemove}
                disabled={disabled || isLoading}
                title="Remove image"
              >
                <i className="bx bx-trash"></i>
              </button>
            </div>
          </div>
        ) : (
          // No image - show drop zone + library button
          <div className="image-upload-options">
            <div
              className={`image-dropzone ${isDragging ? "dragging" : ""}`}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isLoading ? (
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
                  <span className="dropzone-hint">
                    {aspectRatio === 1 ? "Square image" : `${Math.round(aspectRatio * 100) / 100}:1 aspect ratio`}, PNG/JPG up to 10MB
                  </span>
                </>
              )}
            </div>
            {canShowLibrary && (
              <>
                <div className="image-upload-divider">
                  <span>or</span>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary image-library-btn"
                  onClick={() => setShowMediaLibrary(true)}
                  disabled={disabled || isLoading}
                >
                  <i className="bx bx-images"></i>
                  Browse Media Library
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
