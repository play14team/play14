"use client"

import type { ReactNode } from "react"
import AdminSaveShortcut from "./admin-save-shortcut"
import { ToastContainer, ToastProvider } from "./toast"

interface AdminProvidersProps {
  children: ReactNode
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <ToastProvider>
      <AdminSaveShortcut />
      {children}
      <ToastContainer />
    </ToastProvider>
  )
}
