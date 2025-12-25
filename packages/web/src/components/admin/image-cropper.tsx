"use client"

import { useState, useRef, useEffect } from "react"

interface ImageCropperProps {
  image: string
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

export default function ImageCropper({ image, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const imgElement = new Image()
    imgElement.onload = () => {
      setImg(imgElement)
      // Initialize crop to center square
      const minDimension = Math.min(imgElement.width, imgElement.height)
      setCrop({
        x: (imgElement.width - minDimension) / 2,
        y: (imgElement.height - minDimension) / 2,
        size: minDimension,
      })
    }
    imgElement.src = image
  }, [image])

  useEffect(() => {
    if (!img || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to fit the image while maintaining aspect ratio
    const maxWidth = 600
    const maxHeight = 400
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)

    canvas.width = img.width * scale
    canvas.height = img.height * scale

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw crop overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Clear the crop area
    const cropX = crop.x * scale
    const cropY = crop.y * scale
    const cropSize = crop.size * scale

    ctx.clearRect(cropX, cropY, cropSize, cropSize)
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      cropX,
      cropY,
      cropSize,
      cropSize
    )

    // Draw crop border
    ctx.strokeStyle = "#ff6b00"
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropSize, cropSize)

    // Draw corner handles
    const handleSize = 10
    ctx.fillStyle = "#ff6b00"
    // Top-left
    ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize)
    // Top-right
    ctx.fillRect(cropX + cropSize - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize)
    // Bottom-left
    ctx.fillRect(cropX - handleSize / 2, cropY + cropSize - handleSize / 2, handleSize, handleSize)
    // Bottom-right
    ctx.fillRect(cropX + cropSize - handleSize / 2, cropY + cropSize - handleSize / 2, handleSize, handleSize)
  }, [img, crop])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return

    const rect = canvas.getBoundingClientRect()
    const scale = img.width / canvas.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale

    setIsDragging(true)
    setDragStart({ x: x - crop.x, y: y - crop.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !img) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scale = img.width / canvas.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale

    let newX = x - dragStart.x
    let newY = y - dragStart.y

    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, img.width - crop.size))
    newY = Math.max(0, Math.min(newY, img.height - crop.size))

    setCrop({ ...crop, x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoom = (delta: number) => {
    if (!img) return

    // Zoom logic:
    // - Positive delta (zoom out): increase crop size (show more of image)
    // - Negative delta (zoom in): decrease crop size (show less of image, zoom into detail)
    // The delta is inverted here because the buttons are labeled + for zoom in (smaller crop)
    const newSize = crop.size - delta

    // Calculate constraints based on image dimensions
    const minDimension = Math.min(img.width, img.height)

    // Minimum crop size: 100px or 10% of min dimension (whichever is larger)
    const minCropSize = Math.max(100, minDimension * 0.1)

    // Maximum crop size: the full min dimension (to keep it square and within bounds)
    const maxCropSize = minDimension

    // Constrain the new size
    const constrainedSize = Math.max(minCropSize, Math.min(newSize, maxCropSize))

    // If size didn't change, no need to update
    if (constrainedSize === crop.size) return

    // Adjust position to keep crop centered on the same point
    const centerX = crop.x + crop.size / 2
    const centerY = crop.y + crop.size / 2

    let newX = centerX - constrainedSize / 2
    let newY = centerY - constrainedSize / 2

    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, img.width - constrainedSize))
    newY = Math.max(0, Math.min(newY, img.height - constrainedSize))

    setCrop({ x: newX, y: newY, size: constrainedSize })
  }

  const handleCrop = async () => {
    if (!img) return

    const canvas = document.createElement("canvas")
    canvas.width = 800
    canvas.height = 800
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw cropped and resized image
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      800,
      800
    )

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob)
        }
      },
      "image/jpeg",
      0.9
    )
  }

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <div className="image-cropper-header">
          <h3>Crop Your Image</h3>
          <p>Drag to reposition, use zoom buttons to adjust size</p>
        </div>

        <div className="image-cropper-canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          />
        </div>

        <div className="image-cropper-controls">
          <div className="image-cropper-zoom">
            <button
              type="button"
              onClick={() => handleZoom(-50)}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <i className="bx bx-minus"></i>
            </button>
            <span>Zoom</span>
            <button
              type="button"
              onClick={() => handleZoom(50)}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <i className="bx bx-plus"></i>
            </button>
          </div>
        </div>

        <div className="image-cropper-actions">
          <button
            type="button"
            onClick={onCancel}
            className="admin-btn admin-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="admin-btn admin-btn-primary"
          >
            <i className="bx bx-check"></i>
            Crop & Upload
          </button>
        </div>
      </div>
    </div>
  )
}
