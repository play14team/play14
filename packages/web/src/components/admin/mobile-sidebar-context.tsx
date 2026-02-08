"use client"

import { usePathname } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

interface MobileSidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  triggerRef: { current: null },
})

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Close on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when open (iOS-safe approach)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = "0"
      document.body.style.right = "0"
      document.body.style.overflow = "hidden"

      return () => {
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.left = ""
        document.body.style.right = ""
        document.body.style.overflow = ""
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  return (
    <MobileSidebarContext.Provider value={{ isOpen, open, close, triggerRef }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}
