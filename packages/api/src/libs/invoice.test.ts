/**
 * Tests for invoice generation
 */

import { describe, it, expect } from "vitest"
import { generateInvoicePDF, formatTicketItems, type InvoiceData } from "./invoice"
import { writeFileSync } from "fs"
import { join } from "path"

describe("Invoice Generation", () => {
  it("should generate a valid PDF buffer", async () => {
    const invoiceData: InvoiceData = {
      orderNumber: "ORD-2024-001",
      invoiceNumber: "INV-2024-001",
      invoiceDate: new Date().toISOString(),
      purchaserName: "John Doe",
      purchaserEmail: "john.doe@example.com",
      eventName: "#play14 Luxembourg 2024",
      eventDate: "Saturday, December 14, 2024 at 09:00 AM",
      eventLocation: "Luxembourg City, Luxembourg",
      tickets: [
        {
          description: "Early Bird Ticket",
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
        },
        {
          description: "Regular Ticket",
          quantity: 1,
          unitPrice: 75,
          totalPrice: 75,
        },
      ],
      subtotal: 175,
      discountAmount: 25,
      totalAmount: 150,
      currency: "EUR",
      paymentMethod: "Stripe",
      notes: "Thank you for supporting #play14!",
    }

    const pdfBuffer = await generateInvoicePDF(invoiceData, {
      organizationName: "#play14",
      organizationWebsite: "https://play14.org",
      organizationEmail: "contact@play14.org",
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(0)

    // Verify PDF magic number (PDF files start with %PDF-)
    const pdfHeader = pdfBuffer.subarray(0, 5).toString()
    expect(pdfHeader).toBe("%PDF-")

    // Optional: Write test PDF to inspect manually
    // Uncomment the following lines to generate a test PDF file
    // const testPdfPath = join(__dirname, "test-invoice.pdf")
    // writeFileSync(testPdfPath, pdfBuffer)
    // console.log(`Test invoice written to: ${testPdfPath}`)
  })

  it("should format ticket items correctly", () => {
    const ticketDetails = [
      {
        ticketTypeName: "Early Bird",
        quantity: 2,
        price: 50,
      },
      {
        ticketTypeName: "Regular",
        quantity: 1,
        price: 75,
      },
    ]

    const formatted = formatTicketItems(ticketDetails)

    expect(formatted).toHaveLength(2)
    expect(formatted[0]).toEqual({
      description: "Early Bird x 2",
      quantity: 2,
      unitPrice: 50,
      totalPrice: 100,
    })
    expect(formatted[1]).toEqual({
      description: "Regular",
      quantity: 1,
      unitPrice: 75,
      totalPrice: 75,
    })
  })

  it("should handle invoice without discount", async () => {
    const invoiceData: InvoiceData = {
      orderNumber: "ORD-2024-002",
      invoiceNumber: "INV-2024-002",
      invoiceDate: new Date().toISOString(),
      purchaserName: "Jane Smith",
      purchaserEmail: "jane.smith@example.com",
      eventName: "#play14 Paris 2024",
      eventDate: "Friday, November 15, 2024 at 02:00 PM",
      eventLocation: "Paris, France",
      tickets: [
        {
          description: "Standard Ticket",
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        },
      ],
      subtotal: 100,
      totalAmount: 100,
      currency: "EUR",
      paymentMethod: "Stripe",
    }

    const pdfBuffer = await generateInvoicePDF(invoiceData)

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })

  it("should handle invoice with notes", async () => {
    const invoiceData: InvoiceData = {
      orderNumber: "ORD-2024-003",
      invoiceNumber: "INV-2024-003",
      invoiceDate: new Date().toISOString(),
      purchaserName: "Bob Johnson",
      purchaserEmail: "bob@example.com",
      eventName: "#play14 Berlin 2024",
      eventDate: "Monday, January 20, 2025 at 10:00 AM",
      eventLocation: "Berlin, Germany",
      tickets: [
        {
          description: "Workshop Pass",
          quantity: 1,
          unitPrice: 200,
          totalPrice: 200,
        },
      ],
      subtotal: 200,
      totalAmount: 200,
      currency: "EUR",
      paymentMethod: "Stripe",
      notes: "This is a special corporate booking. Please contact us for invoice requirements.",
    }

    const pdfBuffer = await generateInvoicePDF(invoiceData, {
      organizationName: "#play14",
      organizationAddress: "123 Play Street, Game City",
      organizationEmail: "billing@play14.org",
      organizationWebsite: "https://play14.org",
      taxId: "EU123456789",
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })
})
