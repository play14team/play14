"use client"

import type { ReactNode } from "react"
import AdminSaveShortcut from "./admin-save-shortcut"
import { MobileSidebarProvider } from "./mobile-sidebar-context"
import { ToastContainer, ToastProvider } from "./toast"

interface AdminProvidersProps {
  children: ReactNode
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <ToastProvider>
      <MobileSidebarProvider>
        <AdminSaveShortcut />
        {children}
        <ToastContainer />
      </MobileSidebarProvider>
    </ToastProvider>
  )
}
