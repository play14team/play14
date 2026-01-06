"use client"

import { useState } from "react"
import {
  createTicketType,
  updateTicketType,
  deleteTicketType,
  toggleTicketTypeActive,
  type TicketType,
  type TicketTypeData,
} from "./ticket-type.action"
import { STRIPE_CURRENCIES, formatPrice } from "@/libs/currencies"

interface Props {
  eventId: string
  ticketTypes: TicketType[]
  onUpdate: () => void
}

interface EditingTicket extends TicketTypeData {
  documentId?: string
  soldCount?: number
}

export default function TicketTypeEditor({ eventId, ticketTypes, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form state for new/edit ticket
  const [formData, setFormData] = useState<EditingTicket>({
    name: "",
    description: "",
    price: 0,
    currency: "EUR",
    capacity: null,
    validFrom: null,
    validUntil: null,
    sortOrder: ticketTypes.length,
    isActive: true,
  })

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      currency: "EUR",
      capacity: null,
      validFrom: null,
      validUntil: null,
      sortOrder: ticketTypes.length,
      isActive: true,
    })
    setIsAdding(false)
    setEditingId(null)
    setError(null)
  }

  const startEditing = (ticket: TicketType) => {
    setFormData({
      documentId: ticket.documentId,
      name: ticket.name,
      description: ticket.description || "",
      price: ticket.price,
      currency: ticket.currency,
      capacity: ticket.capacity,
      validFrom: ticket.validFrom ? ticket.validFrom.substring(0, 16) : null,
      validUntil: ticket.validUntil ? ticket.validUntil.substring(0, 16) : null,
      sortOrder: ticket.sortOrder,
      isActive: ticket.isActive,
      soldCount: ticket.soldCount,
    })
    setEditingId(ticket.documentId)
    setIsAdding(false)
    setError(null)
  }

  const startAdding = () => {
    resetForm()
    setIsAdding(true)
    setFormData((prev) => ({
      ...prev,
      sortOrder: ticketTypes.length,
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Name is required")
      return
    }

    if (formData.price < 0) {
      setError("Price must be 0 or greater")
      return
    }

    setIsLoading(true)
    setError(null)

    const data: TicketTypeData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      price: formData.price,
      currency: formData.currency,
      capacity: formData.capacity,
      validFrom: formData.validFrom || null,
      validUntil: formData.validUntil || null,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    }

    let result
    if (editingId) {
      result = await updateTicketType(editingId, data)
    } else {
      result = await createTicketType(eventId, data)
    }

    setIsLoading(false)

    if (result.success) {
      resetForm()
      onUpdate()
    } else {
      setError(result.error || "Failed to save ticket type")
    }
  }

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket type?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await deleteTicketType(ticketId)

    setIsLoading(false)

    if (result.success) {
      onUpdate()
    } else {
      setError(result.error || "Failed to delete ticket type")
    }
  }

  const handleToggleActive = async (ticket: TicketType) => {
    setIsLoading(true)
    const result = await toggleTicketTypeActive(ticket.documentId, !ticket.isActive)
    setIsLoading(false)

    if (result.success) {
      onUpdate()
    } else {
      setError(result.error || "Failed to update ticket type")
    }
  }

  const formatTicketPrice = (price: number, currency: string) => {
    return formatPrice(price, currency)
  }

  const sortedTickets = [...ticketTypes].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="ticket-type-editor">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {/* Existing ticket types */}
      <div className="ticket-type-list">
        {sortedTickets.map((ticket) => (
          <div
            key={ticket.documentId}
            className={`ticket-type-card ${!ticket.isActive ? "ticket-inactive" : ""}`}
          >
            {editingId === ticket.documentId ? (
              // Editing mode
              <div className="ticket-type-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="admin-input"
                      placeholder="e.g., Early Bird"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="admin-input"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Price *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="admin-select"
                    >
                      {STRIPE_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.capacity ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="admin-input"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Sale Start</label>
                    <input
                      type="datetime-local"
                      value={formData.validFrom || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, validFrom: e.target.value || null })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Sale End</label>
                    <input
                      type="datetime-local"
                      value={formData.validUntil || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, validUntil: e.target.value || null })
                      }
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <label className="admin-checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active (available for purchase)</span>
                  </label>
                </div>

                <div className="ticket-type-actions">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isLoading}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="ticket-type-info">
                  <div className="ticket-type-header">
                    <h4 className="ticket-type-name">{ticket.name}</h4>
                    {!ticket.isActive && <span className="ticket-badge inactive">Inactive</span>}
                    {ticket.soldCount > 0 && (
                      <span className="ticket-badge sold">{ticket.soldCount} sold</span>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="ticket-type-description">{ticket.description}</p>
                  )}
                  <div className="ticket-type-details">
                    <span className="ticket-price">{formatTicketPrice(ticket.price, ticket.currency)}</span>
                    {ticket.capacity && (
                      <span className="ticket-capacity">
                        {ticket.capacity - ticket.soldCount} / {ticket.capacity} available
                      </span>
                    )}
                  </div>
                </div>
                <div className="ticket-type-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(ticket)}
                    className="admin-btn admin-btn-icon"
                    title="Edit"
                  >
                    <i className="bx bx-edit"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(ticket)}
                    className="admin-btn admin-btn-icon"
                    title={ticket.isActive ? "Deactivate" : "Activate"}
                  >
                    <i className={`bx ${ticket.isActive ? "bx-hide" : "bx-show"}`}></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ticket.documentId)}
                    disabled={ticket.soldCount > 0}
                    className="admin-btn admin-btn-icon admin-btn-danger"
                    title={ticket.soldCount > 0 ? "Cannot delete: tickets sold" : "Delete"}
                  >
                    <i className="bx bx-trash"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new ticket type form */}
      {isAdding && (
        <div className="ticket-type-card ticket-type-new">
          <div className="ticket-type-form">
            <h4>New Ticket Type</h4>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="admin-input"
                  placeholder="e.g., Early Bird"
                />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="admin-input"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="admin-select"
                >
                  {STRIPE_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="admin-input"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Sale Start</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom || ""}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value || null })}
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Sale End</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil || ""}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value || null })}
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <label className="admin-checkbox-option">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Active (available for purchase)</span>
              </label>
            </div>

            <div className="ticket-type-actions">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="admin-btn admin-btn-primary admin-btn-sm"
              >
                {isLoading ? "Creating..." : "Create Ticket Type"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!isAdding && !editingId && (
        <button type="button" onClick={startAdding} className="admin-btn admin-btn-secondary">
          <i className="bx bx-plus"></i>
          Add Ticket Type
        </button>
      )}
    </div>
  )
}
