"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import TicketSelector from "./ticket-selector"
import {
  getAvailableTickets,
  initiateTicketPurchase,
  type EventTicketsResponse,
  type TicketSelection,
} from "./purchase.action"
import styles from "./ticket-purchase-flow.module.scss"

interface TicketPurchaseFlowProps {
  eventId: string
}

export default function TicketPurchaseFlow({ eventId }: TicketPurchaseFlowProps) {
  const router = useRouter()
  const [ticketData, setTicketData] = useState<EventTicketsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTickets() {
      setLoading(true)
      const data = await getAvailableTickets(eventId)
      setTicketData(data)
      setLoading(false)
    }

    loadTickets()
  }, [eventId])

  const handlePurchase = async (tickets: TicketSelection[]) => {
    setError(null)

    const result = await initiateTicketPurchase(eventId, tickets)

    if (!result.success) {
      setError(result.error || "Failed to create order")
      return
    }

    // Redirect to Stripe checkout
    if (result.data?.checkoutUrl) {
      window.location.href = result.data.checkoutUrl
    }
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
    <div className={styles.flow}>
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <TicketSelector
        eventName={ticketData.eventName}
        ticketTypes={ticketData.ticketTypes}
        hasPaymentProvider={ticketData.hasPaymentProvider}
        onPurchase={handlePurchase}
      />
    </div>
  )
}
