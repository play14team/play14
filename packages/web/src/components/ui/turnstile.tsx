"use client"

import { useCallback, useEffect, useRef } from "react"

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact"
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact"
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

/**
 * Cloudflare Turnstile CAPTCHA component
 *
 * Renders an invisible or interactive CAPTCHA challenge to verify users are human.
 * Automatically loads the Turnstile script and handles widget lifecycle.
 */
export default function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  const scriptLoadedRef = useRef(false)
  const widgetRenderedRef = useRef(false)

  // Stable callback refs to prevent re-renders
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const onExpireRef = useRef(onExpire)

  // Update callback refs when they change
  useEffect(() => {
    onVerifyRef.current = onVerify
    onErrorRef.current = onError
    onExpireRef.current = onExpire
  }, [onVerify, onError, onExpire])

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetRenderedRef.current) {
      return
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerifyRef.current(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => onExpireRef.current?.(),
        theme,
        size,
      })
      widgetRenderedRef.current = true
    } catch (error) {
      console.error("Turnstile render error:", error)
    }
  }, [siteKey, theme, size])

  useEffect(() => {
    if (!siteKey) {
      console.error("Turnstile: siteKey is required")
      return
    }

    // Check if script is already loaded
    if (window.turnstile) {
      renderWidget()
      return
    }

    // Load Turnstile script if not already loaded or loading
    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      script.onload = () => renderWidget()
      document.body.appendChild(script)
    }

    // Cleanup
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
          widgetRenderedRef.current = false
        } catch (error) {
          console.error("Turnstile cleanup error:", error)
        }
      }
    }
  }, [siteKey, renderWidget])

  return <div ref={containerRef} />
}
