"use client"

import { useEffect, useRef, useState } from "react"

interface ImageCropperProps {
  image: string
  onCrop: (blob: Blob) => void
  onCancel: () => void
  /** Aspect ratio as width/height (e.g., 6/5 = 1.2 for 600x500). Use 0 for free aspect ratio. Default is 1 (square). */
  aspectRatio?: number
  /** Output width in pixels. Height is calculated from aspect ratio. Default is 600. For free aspect ratio, this is the max dimension on the longest edge. */
  outputWidth?: number
  /** WebP quality (0-1). Default is 0.9. Use lower values like 0.85 for smaller file sizes. */
  quality?: number
}

export default function ImageCropper({
  image,
  onCrop,
  onCancel,
  aspectRatio = 1,
  outputWidth = 600,
  quality = 0.9,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  // Crop area defined by x, y, width, height
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Free aspect ratio mode when aspectRatio is 0
  const isFreeAspect = aspectRatio === 0

  useEffect(() => {
    const imgElement = new Image()
    imgElement.onload = () => {
      setImg(imgElement)

      if (isFreeAspect) {
        // Free aspect ratio: use full image as initial crop
        setCrop({
          x: 0,
          y: 0,
          width: imgElement.width,
          height: imgElement.height,
        })
      } else {
        // Fixed aspect ratio: find the largest crop area that fits within the image
        const imgRatio = imgElement.width / imgElement.height

        let cropWidth: number
        let cropHeight: number

        if (imgRatio > aspectRatio) {
          // Image is wider than crop area - constrain by height
          cropHeight = imgElement.height
          cropWidth = cropHeight * aspectRatio
        } else {
          // Image is taller than crop area - constrain by width
          cropWidth = imgElement.width
          cropHeight = cropWidth / aspectRatio
        }

        setCrop({
          x: (imgElement.width - cropWidth) / 2,
          y: (imgElement.height - cropHeight) / 2,
          width: cropWidth,
          height: cropHeight,
        })
      }
    }
    imgElement.src = image
  }, [image, aspectRatio, isFreeAspect])

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
    const cropWidth = crop.width * scale
    const cropHeight = crop.height * scale

    ctx.clearRect(cropX, cropY, cropWidth, cropHeight)
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, cropX, cropY, cropWidth, cropHeight)

    // Draw crop border
    ctx.strokeStyle = "#ff6b00"
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight)

    // Draw corner handles
    const handleSize = 10
    ctx.fillStyle = "#ff6b00"
    // Top-left
    ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize)
    // Top-right
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize)
    // Bottom-left
    ctx.fillRect(
      cropX - handleSize / 2,
      cropY + cropHeight - handleSize / 2,
      handleSize,
      handleSize
    )
    // Bottom-right
    ctx.fillRect(
      cropX + cropWidth - handleSize / 2,
      cropY + cropHeight - handleSize / 2,
      handleSize,
      handleSize
    )
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
    newX = Math.max(0, Math.min(newX, img.width - crop.width))
    newY = Math.max(0, Math.min(newY, img.height - crop.height))

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

    if (isFreeAspect) {
      // For free aspect ratio, scale both dimensions proportionally
      const currentRatio = crop.width / crop.height
      const newWidth = crop.width - delta
      const newHeight = newWidth / currentRatio

      // Calculate constraints
      const minWidth = Math.max(100, img.width * 0.1)
      const minHeight = Math.max(100, img.height * 0.1)

      // Constrain the new dimensions
      const constrainedWidth = Math.max(minWidth, Math.min(newWidth, img.width))
      const constrainedHeight = Math.max(minHeight, Math.min(newHeight, img.height))

      if (constrainedWidth === crop.width && constrainedHeight === crop.height) return

      // Adjust position to keep crop centered
      const centerX = crop.x + crop.width / 2
      const centerY = crop.y + crop.height / 2

      let newX = centerX - constrainedWidth / 2
      let newY = centerY - constrainedHeight / 2

      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, img.width - constrainedWidth))
      newY = Math.max(0, Math.min(newY, img.height - constrainedHeight))

      setCrop({ x: newX, y: newY, width: constrainedWidth, height: constrainedHeight })
    } else {
      // Fixed aspect ratio zoom
      const newWidth = crop.width - delta
      const _newHeight = newWidth / aspectRatio

      // Calculate constraints based on image dimensions
      const minWidth = Math.max(100, img.width * 0.1)

      // Maximum size that fits within image bounds
      const maxByWidth = img.width
      const maxByHeight = img.height * aspectRatio
      const maxWidth = Math.min(maxByWidth, maxByHeight)

      // Constrain the new width
      const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth))
      const constrainedHeight = constrainedWidth / aspectRatio

      // Verify it fits within image bounds
      if (constrainedWidth > img.width || constrainedHeight > img.height) return
      if (constrainedWidth === crop.width) return

      // Adjust position to keep crop centered on the same point
      const centerX = crop.x + crop.width / 2
      const centerY = crop.y + crop.height / 2

      let newX = centerX - constrainedWidth / 2
      let newY = centerY - constrainedHeight / 2

      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, img.width - constrainedWidth))
      newY = Math.max(0, Math.min(newY, img.height - constrainedHeight))

      setCrop({ x: newX, y: newY, width: constrainedWidth, height: constrainedHeight })
    }
  }

  const handleCrop = async () => {
    if (!img) return

    // Calculate output dimensions
    let finalWidth: number
    let finalHeight: number

    if (isFreeAspect) {
      // For free aspect ratio, outputWidth is the max dimension on the longest edge
      const maxDimension = outputWidth
      if (crop.width >= crop.height) {
        // Landscape or square
        finalWidth = Math.min(crop.width, maxDimension)
        finalHeight = Math.round((finalWidth / crop.width) * crop.height)
      } else {
        // Portrait
        finalHeight = Math.min(crop.height, maxDimension)
        finalWidth = Math.round((finalHeight / crop.height) * crop.width)
      }
    } else {
      // Fixed aspect ratio: use outputWidth and calculate height from ratio
      finalWidth = outputWidth
      finalHeight = Math.round(outputWidth / aspectRatio)
    }

    const canvas = document.createElement("canvas")
    canvas.width = finalWidth
    canvas.height = finalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw cropped and resized image
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, finalWidth, finalHeight)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob)
        }
      },
      "image/webp",
      quality
    )
  }

  // Format aspect ratio for display
  const formatRatio = () => {
    if (isFreeAspect) return "Free"
    if (aspectRatio === 1) return "1:1 (Square)"
    if (Math.abs(aspectRatio - 6 / 5) < 0.01) return "6:5"
    return `${aspectRatio.toFixed(2)}:1`
  }

  // Format output dimensions for display
  const formatOutput = () => {
    if (isFreeAspect) {
      return `Max ${outputWidth}px`
    }
    const outputHeight = Math.round(outputWidth / aspectRatio)
    return `${outputWidth}×${outputHeight}px`
  }

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <div className="image-cropper-header">
          <h3>Crop Your Image</h3>
          <p>Drag to reposition, use zoom buttons to adjust size</p>
          <p className="image-cropper-ratio">
            Aspect ratio: {formatRatio()} • Output: {formatOutput()}
          </p>
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
              <i className="bx bx-minus" />
            </button>
            <span>Zoom</span>
            <button
              type="button"
              onClick={() => handleZoom(50)}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <i className="bx bx-plus" />
            </button>
          </div>
        </div>

        <div className="image-cropper-actions">
          <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleCrop} className="admin-btn admin-btn-primary">
            <i className="bx bx-check" />
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}
