"use client"

import {
  type EventImage,
  type MediaFolder,
  listMediaLibraryFiles,
  listMediaLibraryFolders,
} from "@/app/(admin)/admin/events/[slug]/images.action"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface MediaLibraryBrowserProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (image: EventImage) => void
  title?: string
}

const PAGE_SIZE = 24

/**
 * Get the best available thumbnail URL for an image
 * URLs are already normalized by the server action
 */
function getImageThumbnailUrl(file: EventImage): string {
  // Prefer thumbnail if available
  if (file.formats?.thumbnail?.url) {
    return file.formats.thumbnail.url
  }
  // Fall back to small format
  if (file.formats?.small?.url) {
    return file.formats.small.url
  }
  // Use original URL as last resort
  return file.url
}

/**
 * Check if a file format is supported for display in browser
 */
function isWebDisplayableImage(file: EventImage): boolean {
  const webDisplayableMimes = [
    "image/jpeg", // Standard JPEG mime type
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/avif",
  ]

  // Return false if no mime type (safer default)
  if (!file.mime) return false

  const mime = file.mime.toLowerCase()
  return webDisplayableMimes.includes(mime)
}

export default function MediaLibraryBrowser({
  isOpen,
  onClose,
  onSelect,
  title = "Media Library",
}: MediaLibraryBrowserProps) {
  const [files, setFiles] = useState<EventImage[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [selectedImage, setSelectedImage] = useState<EventImage | null>(null)
  const [mounted, setMounted] = useState(false)
  // Folder navigation: undefined = all files, null = root level only, number = specific folder
  const [currentFolderId, setCurrentFolderId] = useState<number | null | undefined>(undefined)
  const [folderPath, setFolderPath] = useState<{ id: number | null; name: string }[]>([])

  // Refs for infinite scroll
  const modalBodyRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Custom intersection observer for modal scroll container
  useEffect(() => {
    const sentinel = loadMoreRef.current
    const root = modalBodyRef.current

    if (!sentinel || !root || !isOpen) {
      setIsLoadMoreVisible(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLoadMoreVisible(entry.isIntersecting)
      },
      {
        root, // Use modal body as scroll container
        rootMargin: "100px",
        threshold: 0,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [isOpen, files.length, hasMore]) // Re-observe when files change

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
      setFiles([])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load folders when entering a directory
  const loadFolders = useCallback(
    async (parentId: number | null | undefined) => {
      // Don't load folders when searching or showing all files
      if (searchDebounced || parentId === undefined) {
        setFolders([])
        return
      }

      const result = await listMediaLibraryFolders(parentId)
      if (result.success && result.data) {
        setFolders(result.data.folders)
      } else {
        setFolders([])
      }
    },
    [searchDebounced]
  )

  // Load files when modal opens, search changes, or folder changes
  const loadFiles = useCallback(
    async (pageNum: number, append = false) => {
      setIsLoading(true)
      setError(null)

      const result = await listMediaLibraryFiles(
        pageNum,
        PAGE_SIZE,
        searchDebounced || undefined,
        searchDebounced ? undefined : currentFolderId // Don't filter by folder when searching
      )

      if (result.success && result.data) {
        const newFiles = result.data.files
        setFiles((prev) => (append ? [...prev, ...newFiles] : newFiles))
        setHasMore(newFiles.length === PAGE_SIZE)
      } else {
        setError(result.error || "Failed to load files")
      }

      setIsLoading(false)
    },
    [searchDebounced, currentFolderId]
  )

  useEffect(() => {
    if (isOpen) {
      loadFiles(page, page > 1)
      if (page === 1) {
        loadFolders(currentFolderId)
      }
    }
  }, [isOpen, page, loadFiles, loadFolders, currentFolderId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPage(1)
      setFiles([])
      setFolders([])
      setSearch("")
      setSearchDebounced("")
      setSelectedImage(null)
      setError(null)
      setCurrentFolderId(undefined)
      setFolderPath([])
    }
  }, [isOpen])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }, [isLoading, hasMore])

  // Auto-load more when sentinel becomes visible (infinite scroll)
  useEffect(() => {
    if (isLoadMoreVisible && hasMore && !isLoading && files.length > 0) {
      handleLoadMore()
    }
  }, [isLoadMoreVisible, hasMore, isLoading, files.length, handleLoadMore])

  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage)
      onClose()
    }
  }

  const navigateToFolder = (folder: MediaFolder) => {
    setPage(1)
    setFiles([])
    setSelectedImage(null)
    setCurrentFolderId(folder.id)
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const navigateUp = () => {
    if (folderPath.length === 0) {
      // Already at root, go back to "all files" view
      setCurrentFolderId(undefined)
      return
    }

    setPage(1)
    setFiles([])
    setSelectedImage(null)

    if (folderPath.length === 1) {
      // Going back to root level
      setCurrentFolderId(null)
      setFolderPath([])
    } else {
      // Going to parent folder
      const newPath = folderPath.slice(0, -1)
      setFolderPath(newPath)
      setCurrentFolderId(newPath[newPath.length - 1]?.id ?? null)
    }
  }

  const navigateToRoot = () => {
    setPage(1)
    setFiles([])
    setSelectedImage(null)
    setCurrentFolderId(null)
    setFolderPath([])
  }

  const showAllFiles = () => {
    setPage(1)
    setFiles([])
    setFolders([])
    setSelectedImage(null)
    setCurrentFolderId(undefined)
    setFolderPath([])
  }

  if (!isOpen || !mounted) return null

  const isInFolderView = currentFolderId !== undefined
  const canNavigateUp = isInFolderView

  const modalContent = (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal media-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="media-library-toolbar">
          <div className="media-library-toolbar-row">
            <div className="search-input-wrapper">
              <i className="bx bx-search" />
              <input
                type="text"
                className="search-input"
                placeholder="Search images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="search-clear" onClick={() => setSearch("")}>
                  <i className="bx bx-x" />
                </button>
              )}
            </div>
            <div className="media-library-view-toggle">
              <button
                type="button"
                className={`admin-btn admin-btn-sm ${!isInFolderView ? "admin-btn-primary" : "admin-btn-secondary"}`}
                onClick={showAllFiles}
                title="Show all images"
              >
                <i className="bx bx-grid-alt" />
                All
              </button>
              <button
                type="button"
                className={`admin-btn admin-btn-sm ${isInFolderView ? "admin-btn-primary" : "admin-btn-secondary"}`}
                onClick={navigateToRoot}
                title="Browse folders"
              >
                <i className="bx bx-folder" />
                Folders
              </button>
            </div>
          </div>

          {/* Breadcrumb navigation */}
          {isInFolderView && !searchDebounced && (
            <div className="media-library-breadcrumb">
              {canNavigateUp && (
                <button
                  type="button"
                  className="breadcrumb-back"
                  onClick={navigateUp}
                  title="Go back"
                >
                  <i className="bx bx-arrow-back" />
                </button>
              )}
              <button type="button" className="breadcrumb-item" onClick={navigateToRoot}>
                <i className="bx bx-home" />
                Root
              </button>
              {folderPath.map((folder, index) => (
                <span key={folder.id} className="breadcrumb-segment">
                  <i className="bx bx-chevron-right" />
                  <button
                    type="button"
                    className="breadcrumb-item"
                    onClick={() => {
                      const newPath = folderPath.slice(0, index + 1)
                      setFolderPath(newPath)
                      setCurrentFolderId(folder.id)
                      setPage(1)
                      setFiles([])
                      setSelectedImage(null)
                    }}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div ref={modalBodyRef} className="admin-modal-body">
          {error && (
            <div className="admin-alert admin-alert-error admin-alert-sm">
              <i className="bx bx-error-circle" />
              {error}
            </div>
          )}

          {/* Folders grid */}
          {folders.length > 0 && !searchDebounced && (
            <div className="media-library-folders">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="media-library-folder"
                  onClick={() => navigateToFolder(folder)}
                >
                  <i className="bx bx-folder" />
                  <span className="folder-name">{folder.name}</span>
                  <div className="folder-counts">
                    {folder.children?.count !== undefined && folder.children.count > 0 && (
                      <span className="folder-count" title="Subfolders">
                        <i className="bx bx-folder" />
                        {folder.children.count}
                      </span>
                    )}
                    {folder.files?.count !== undefined && (
                      <span className="folder-count" title="Images">
                        <i className="bx bx-image" />
                        {folder.files.count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {files.length === 0 && folders.length === 0 && !isLoading && (
            <div className="media-library-empty">
              <i className="bx bx-image" />
              <p>
                {searchDebounced
                  ? "No images found matching your search"
                  : isInFolderView
                    ? "This folder is empty"
                    : "No images in your media library"}
              </p>
            </div>
          )}

          <div className="media-library-grid">
            {files.map((file) => {
              const thumbnailUrl = getImageThumbnailUrl(file)
              const isDisplayable = isWebDisplayableImage(file)

              return (
                <button
                  key={file.id}
                  type="button"
                  className={`media-library-item ${
                    selectedImage?.id === file.id ? "selected" : ""
                  } ${!isDisplayable ? "non-displayable" : ""}`}
                  onClick={() => setSelectedImage(file)}
                  title={file.name}
                >
                  {isDisplayable ? (
                    // Use native img to avoid Next.js Image optimization issues with various formats
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt={file.name} loading="lazy" />
                  ) : (
                    <div className="media-library-item-placeholder">
                      <i className="bx bx-image" />
                      <span>{file.ext || file.mime?.split("/")[1] || "image"}</span>
                    </div>
                  )}
                  {selectedImage?.id === file.id && (
                    <div className="media-library-item-check">
                      <i className="bx bx-check" />
                    </div>
                  )}
                  <div className="media-library-item-name">{file.name}</div>
                </button>
              )
            })}
          </div>

          {/* Infinite scroll sentinel - triggers loading when visible */}
          {hasMore && files.length > 0 && (
            <div ref={loadMoreRef} className="media-library-load-more">
              {isLoading ? (
                <div className="media-library-loading">
                  <i className="bx bx-loader-alt bx-spin" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={handleLoadMore}
                >
                  Load More
                </button>
              )}
            </div>
          )}

          {/* Initial loading state */}
          {isLoading && files.length === 0 && (
            <div className="media-library-loading">
              <i className="bx bx-loader-alt bx-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSelect}
            disabled={!selectedImage}
          >
            <i className="bx bx-check" />
            Select Image
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
