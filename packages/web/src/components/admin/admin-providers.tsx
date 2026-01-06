"use client"

import type { ReactNode } from "react"
import { ToastProvider, ToastContainer } from "./toast"

interface AdminProvidersProps {
  children: ReactNode
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  )
}
