"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import {
  trackAttendeeInfoSubmitted,
  trackAuthRequired,
  trackCheckoutAbandoned,
  trackCheckoutError,
  trackCheckoutFinalized,
  trackCheckoutStarted,
  trackDraftOrderCreated,
  trackTicketsViewed,
  withCheckoutSpan,
} from "@/libs/sentry-metrics"
import AttendeeForm from "./attendee-form"
import AuthGate from "./auth-gate"
import {
  type AttendeeInfo,
  type AuthStatus,
  checkAuthStatus,
  createDraftOrder,
  type DraftOrderResponse,
  type EventTicketsResponse,
  finalizeCheckout,
  getAvailableTickets,
  type TicketSelection,
  updateAttendeeInfo,
} from "./purchase.action"
import styles from "./ticket-purchase-flow.module.scss"
import TicketSelector from "./ticket-selector"

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
  const t = useTranslations("tickets")
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

      // Track tickets viewed
      if (tickets?.ticketingEnabled && tickets.ticketTypes.length > 0) {
        trackTicketsViewed(eventId, tickets.ticketTypes.length)
      }

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

    // Calculate totals for metrics
    const totalTickets = tickets.reduce((sum, t) => sum + t.quantity, 0)
    const ticketTypesMap = new Map(ticketData?.ticketTypes.map((t) => [t.documentId, t]) || [])
    const totalAmount = tickets.reduce((sum, t) => {
      const ticketType = ticketTypesMap.get(t.ticketTypeId)
      return sum + (ticketType?.price || 0) * t.quantity
    }, 0)
    const currency = ticketData?.ticketTypes[0]?.currency || "EUR"

    // Track checkout started
    trackCheckoutStarted(eventId, totalTickets, totalAmount, currency, !!discountCode)

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

    // Create draft order with tracing span
    const result = await withCheckoutSpan("create-draft-order", eventId, () =>
      createDraftOrder(eventId, tickets, discountCode)
    )

    if (!result.success) {
      trackCheckoutError(eventId, "draft_creation", result.error?.message)
      setError(result.error?.message || t("failedToCreate"))
      setFlowStep("select")
      setIsSubmitting(false)
      return
    }

    // Track draft order created
    const order = result.data!
    trackDraftOrderCreated(
      eventId,
      order.orderId,
      order.ticketCount,
      order.totalAmount,
      order.discountAmount,
      order.currency
    )

    // Move to attendee form
    setDraftOrder(order)
    setFlowStep("attendees")
    setIsSubmitting(false)
  }

  const handleAuthRequired = (quantities: Record<string, number>, discountCode?: string) => {
    // Track auth required
    trackAuthRequired(eventId, "checkout")
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

    // Save attendee info with tracing span
    const updateResult = await withCheckoutSpan("update-attendee-info", eventId, () =>
      updateAttendeeInfo(draftOrder.orderId, attendees, gdprConsent, termsAccepted)
    )

    if (!updateResult.success) {
      trackCheckoutError(eventId, "attendee_info", updateResult.error)
      setError(updateResult.error || t("failedToSaveAttendee"))
      setIsSubmitting(false)
      return
    }

    // Track attendee info submitted
    trackAttendeeInfoSubmitted(eventId, draftOrder.orderId)

    // Finalize checkout with tracing span
    const checkoutResult = await withCheckoutSpan("finalize-checkout", eventId, () =>
      finalizeCheckout(draftOrder.orderId)
    )

    if (!checkoutResult.success) {
      trackCheckoutError(eventId, "finalize", checkoutResult.error)
      setError(checkoutResult.error || t("failedToCheckout"))
      setIsSubmitting(false)
      return
    }

    // Track checkout finalized
    const isFreeOrder = !checkoutResult.data?.checkoutUrl
    trackCheckoutFinalized(eventId, draftOrder.orderId, isFreeOrder)

    // Handle free orders (no payment needed)
    if (isFreeOrder) {
      // Free order completed - redirect to order details
      router.push(`/orders/${draftOrder.orderId}`)
      return
    }

    // Redirect to Stripe checkout
    window.location.href = checkoutResult.data!.checkoutUrl!
  }

  // Go back to ticket selection
  const handleBackToSelection = () => {
    // Track abandonment when going back from attendee form
    trackCheckoutAbandoned(eventId, "attendees")
    setFlowStep("select")
    setDraftOrder(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>{t("loading")}</p>
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
              <span className={styles.stepLabel}>{t("stepTickets")}</span>
            </div>
            <div className={styles.stepDivider} />
            <div
              className={`${styles.step} ${flowStep === "attendees" || flowStep === "processing" ? styles.active : ""}`}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>{t("stepAttendees")}</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepLabel}>{t("stepPayment")}</span>
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
            <p>{t("processing")}</p>
          </div>
        )}
      </div>
    </>
  )
}
