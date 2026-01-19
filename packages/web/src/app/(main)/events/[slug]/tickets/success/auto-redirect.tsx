"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AutoRedirectProps {
  orderId: string
}

export default function AutoRedirect({ orderId }: AutoRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/orders/${orderId}`)
    }, 3000) // Redirect after 3 seconds

    return () => clearTimeout(timer)
  }, [orderId, router])

  return null
}
