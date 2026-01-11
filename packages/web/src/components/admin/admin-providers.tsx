"use client"

import type { ReactNode } from "react"
import { ToastProvider, ToastContainer } from "./toast"
import AdminSaveShortcut from "./admin-save-shortcut"

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
