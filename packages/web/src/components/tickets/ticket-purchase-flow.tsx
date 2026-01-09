"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import TicketSelector from "./ticket-selector"
import AuthGate from "./auth-gate"
import AttendeeForm from "./attendee-form"
import {
  getAvailableTickets,
  checkAuthStatus,
  createDraftOrder,
  updateAttendeeInfo,
  finalizeCheckout,
  type EventTicketsResponse,
  type TicketSelection,
  type AuthStatus,
  type DraftOrderResponse,
  type AttendeeInfo,
} from "./purchase.action"
import styles from "./ticket-purchase-flow.module.scss"

const TICKET_SELECTION_KEY = "pending_ticket_selection"

interface SavedTicketState {
  eventId: string
  quantities: Record<string, number>
  discountCode?: string
}

type FlowStep = "select" | "auth" | "attendees" | "processing"

interface TicketPurchaseFlowProps {
  eventId: string
}

export default function TicketPurchaseFlow({ eventId }: TicketPurchaseFlowProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [ticketData, setTicketData] = useState<EventTicketsResponse | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [initialQuantities, setInitialQuantities] = useState<Record<string, number> | undefined>(
    undefined
  )
  const [initialDiscountCode, setInitialDiscountCode] = useState<string | undefined>(undefined)

  // Multi-step flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("select")
  const [draftOrder, setDraftOrder] = useState<DraftOrderResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [tickets, auth] = await Promise.all([getAvailableTickets(eventId), checkAuthStatus()])
      setTicketData(tickets)
      setAuthStatus(auth)

      // Check for saved ticket selection (from before OAuth redirect)
      try {
        const savedState = sessionStorage.getItem(TICKET_SELECTION_KEY)
        if (savedState) {
          const parsed: SavedTicketState = JSON.parse(savedState)
          // Only restore if it's for the same event
          if (parsed.eventId === eventId) {
            setInitialQuantities(parsed.quantities)
            setInitialDiscountCode(parsed.discountCode)
          }
          // Clear the saved state
          sessionStorage.removeItem(TICKET_SELECTION_KEY)
        }
      } catch {
        // Ignore parsing errors
      }

      setLoading(false)
    }

    loadData()
  }, [eventId])

  // Save ticket selection to sessionStorage when auth is required
  const saveTicketSelection = useCallback(
    (quantities: Record<string, number>, discountCode?: string) => {
      const state: SavedTicketState = {
        eventId,
        quantities,
        discountCode,
      }
      sessionStorage.setItem(TICKET_SELECTION_KEY, JSON.stringify(state))
    },
    [eventId]
  )

  // Step 1: Handle ticket selection and create draft order
  const handlePurchase = async (tickets: TicketSelection[], discountCode?: string) => {
    setError(null)

    // Check if user is authenticated
    if (!authStatus?.isAuthenticated) {
      // This shouldn't happen as onAuthRequired is called first, but handle it anyway
      setShowAuthGate(true)
      return
    }

    // Check if user has a player profile
    if (!authStatus.hasPlayer) {
      router.push(`/auth/no-player?callbackUrl=${encodeURIComponent(pathname)}`)
      return
    }

    setFlowStep("processing")
    setIsSubmitting(true)

    // Create draft order
    const result = await createDraftOrder(eventId, tickets, discountCode)

    if (!result.success) {
      setError(result.error?.message || "Failed to create order")
      setFlowStep("select")
      setIsSubmitting(false)
      return
    }

    // Move to attendee form
    setDraftOrder(result.data!)
    setFlowStep("attendees")
    setIsSubmitting(false)
  }

  const handleAuthRequired = (quantities: Record<string, number>, discountCode?: string) => {
    // Save the ticket selection before showing auth gate
    saveTicketSelection(quantities, discountCode)
    setShowAuthGate(true)
  }

  const handleAuthDismiss = () => {
    setShowAuthGate(false)
  }

  // Step 2: Handle attendee form submission
  const handleAttendeeSubmit = async (
    attendees: AttendeeInfo[],
    gdprConsent: boolean,
    termsAccepted: boolean
  ) => {
    if (!draftOrder) return

    setError(null)
    setIsSubmitting(true)

    // Save attendee info
    const updateResult = await updateAttendeeInfo(
      draftOrder.orderId,
      attendees,
      gdprConsent,
      termsAccepted
    )

    if (!updateResult.success) {
      setError(updateResult.error || "Failed to save attendee information")
      setIsSubmitting(false)
      return
    }

    // Finalize checkout
    const checkoutResult = await finalizeCheckout(draftOrder.orderId)

    if (!checkoutResult.success) {
      setError(checkoutResult.error || "Failed to create checkout session")
      setIsSubmitting(false)
      return
    }

    // Handle free orders (no payment needed)
    if (!checkoutResult.data?.checkoutUrl) {
      // Free order completed - redirect to confirmation
      router.push(`/tickets/confirmation?order=${draftOrder.orderNumber}`)
      return
    }

    // Redirect to Stripe checkout
    window.location.href = checkoutResult.data.checkoutUrl
  }

  // Go back to ticket selection
  const handleBackToSelection = () => {
    setFlowStep("select")
    setDraftOrder(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading tickets...</p>
      </div>
    )
  }

  if (!ticketData || !ticketData.ticketingEnabled) {
    return null
  }

  return (
    <>
      {showAuthGate && <AuthGate callbackUrl={pathname} onDismiss={handleAuthDismiss} />}

      <div className={styles.flow}>
        {/* Step indicator for multi-step flow */}
        {flowStep !== "select" && (
          <div className={styles.stepIndicator}>
            <div className={`${styles.step} ${styles.completed}`}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepLabel}>Tickets</span>
            </div>
            <div className={styles.stepDivider} />
            <div
              className={`${styles.step} ${flowStep === "attendees" || flowStep === "processing" ? styles.active : ""}`}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>Attendees</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepLabel}>Payment</span>
            </div>
          </div>
        )}

        {error && flowStep === "select" && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Ticket Selection */}
        {flowStep === "select" && (
          <TicketSelector
            eventId={eventId}
            eventName={ticketData.eventName}
            ticketTypes={ticketData.ticketTypes}
            hasPaymentProvider={ticketData.hasPaymentProvider}
            authStatus={authStatus}
            onPurchase={handlePurchase}
            onAuthRequired={handleAuthRequired}
            initialQuantities={initialQuantities}
            initialDiscountCode={initialDiscountCode}
          />
        )}

        {/* Step 2: Attendee Information */}
        {flowStep === "attendees" && draftOrder && (
          <AttendeeForm
            draftOrder={draftOrder}
            onSubmit={handleAttendeeSubmit}
            onBack={handleBackToSelection}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}

        {/* Processing state */}
        {flowStep === "processing" && (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Processing your order...</p>
          </div>
        )}
      </div>
    </>
  )
}
