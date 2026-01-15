"use client"

import { useState } from "react"
import styles from "./page.module.scss"

interface DownloadInvoiceButtonProps {
  orderId: string
  orderNumber: string
}

export default function DownloadInvoiceButton({ orderId, orderNumber }: DownloadInvoiceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)

    try {
      // Use local API route which proxies to Strapi with proper authentication
      const response = await fetch(`/api/orders/${orderId}/invoice`)

      if (!response.ok) {
        throw new Error("Failed to download invoice")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download invoice:", error)
      alert("Failed to download invoice. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button onClick={handleDownload} disabled={isDownloading} className={styles.button}>
      {isDownloading ? "Downloading..." : "Download Invoice"}
    </button>
  )
}
