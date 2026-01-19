"use client"

import { type ReactNode, createContext, useCallback, useContext, useState } from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const toast: Toast = { id, message, type, duration }

      setToasts((prev) => [...prev, toast])

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }

      return id
    },
    [removeToast]
  )

  const success = useCallback(
    (message: string, duration?: number) => addToast(message, "success", duration),
    [addToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => addToast(message, "error", duration ?? 6000),
    [addToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, "info", duration),
    [addToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => addToast(message, "warning", duration ?? 5000),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
