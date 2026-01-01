"use client"

import { useState } from "react"
import type { TicketTypeInfo, TicketSelection } from "./purchase.action"
import styles from "./ticket-selector.module.scss"

interface TicketSelectorProps {
  eventName: string
  ticketTypes: TicketTypeInfo[]
  hasPaymentProvider: boolean
  onPurchase: (tickets: TicketSelection[]) => Promise<void>
}

export default function TicketSelector({
  eventName,
  ticketTypes,
  hasPaymentProvider,
  onPurchase,
}: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currency = ticketTypes[0]?.currency || "EUR"

  const totalAmount = ticketTypes.reduce((sum, tt) => {
    return sum + tt.price * (quantities[tt.documentId] || 0)
  }, 0)

  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  const handleQuantityChange = (ticketTypeId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[ticketTypeId] || 0
      const newValue = Math.max(0, current + delta)

      // Find ticket type to check availability
      const ticketType = ticketTypes.find((tt) => tt.documentId === ticketTypeId)
      if (ticketType?.available !== null && newValue > (ticketType?.available || 0)) {
        return prev
      }

      return {
        ...prev,
        [ticketTypeId]: newValue,
      }
    })
    setError(null)
  }

  const handlePurchase = async () => {
    const selectedTickets = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))

    if (selectedTickets.length === 0) {
      setError("Please select at least one ticket")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await onPurchase(selectedTickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process order")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!hasPaymentProvider) {
    return (
      <div className={styles.unavailable}>
        <p>Online ticketing is not available for this event.</p>
        <p>Please contact the organizers for registration details.</p>
      </div>
    )
  }

  if (ticketTypes.length === 0) {
    return (
      <div className={styles.unavailable}>
        <p>No tickets are currently available for this event.</p>
      </div>
    )
  }

  return (
    <div className={styles.selector}>
      <h3>Get Your Tickets</h3>

      <div className={styles.ticketTypes}>
        {ticketTypes.map((tt) => (
          <div
            key={tt.documentId}
            className={`${styles.ticketType} ${tt.soldOut ? styles.soldOut : ""}`}
          >
            <div className={styles.ticketInfo}>
              <h4>{tt.name}</h4>
              {tt.description && <p className={styles.description}>{tt.description}</p>}
              <div className={styles.priceRow}>
                <span className={styles.price}>
                  {tt.currency} {tt.price.toFixed(2)}
                </span>
                {tt.available !== null && (
                  <span className={styles.availability}>
                    {tt.soldOut ? "Sold out" : `${tt.available} remaining`}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.quantitySelector}>
              <button
                type="button"
                onClick={() => handleQuantityChange(tt.documentId, -1)}
                disabled={!quantities[tt.documentId] || tt.soldOut}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className={styles.quantity}>{quantities[tt.documentId] || 0}</span>
              <button
                type="button"
                onClick={() => handleQuantityChange(tt.documentId, 1)}
                disabled={tt.soldOut || (tt.available !== null && (quantities[tt.documentId] || 0) >= tt.available)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.summary}>
        <div className={styles.total}>
          <span>Total ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"}):</span>
          <span className={styles.totalAmount}>
            {currency} {totalAmount.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={totalQuantity === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Proceed to Payment"}
        </button>
      </div>
    </div>
  )
}
