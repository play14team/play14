/**
 * Invoice generation library using PDFKit
 * Generates professional PDF invoices for ticket orders
 */

import PDFDocument from "pdfkit"
import { Readable } from "stream"

export interface InvoiceData {
  orderNumber: string
  invoiceNumber: string // Can be same as order number or custom format
  invoiceDate: string // ISO date string
  purchaserName: string
  purchaserEmail: string
  eventName: string
  eventDate: string
  eventLocation: string
  tickets: Array<{
    description: string // e.g., "Early Bird Ticket x 2"
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  discountAmount?: number
  totalAmount: number
  currency: string
  paymentMethod: string // e.g., "Stripe"
  notes?: string
}

export interface InvoiceOptions {
  organizationName?: string
  organizationAddress?: string
  organizationEmail?: string
  organizationWebsite?: string
  logoPath?: string // Local file path to logo image (PNG/JPEG)
  taxId?: string // Optional tax identification number
}

/**
 * Generate a PDF invoice and return it as a Buffer
 */
export async function generateInvoicePDF(
  data: InvoiceData,
  options: InvoiceOptions = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: options.organizationName || "#play14",
          Subject: `Invoice for order ${data.orderNumber}`,
        },
      })

      const chunks: Buffer[] = []

      // Collect PDF chunks
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // PDF Layout constants
      const pageWidth = 595.28 // A4 width in points
      const pageHeight = 841.89 // A4 height in points
      const margin = 50
      const contentWidth = pageWidth - 2 * margin

      // Colors
      const primaryColor = "#f47920" // #play14 orange
      const darkColor = "#1a1a1a"
      const grayColor = "#666666"
      const lightGray = "#f5f5f5"

      // Current Y position tracker
      let currentY = margin

      // Helper functions
      const drawLine = (y: number, color = "#e0e0e0") => {
        doc
          .strokeColor(color)
          .lineWidth(1)
          .moveTo(margin, y)
          .lineTo(pageWidth - margin, y)
          .stroke()
      }

      const drawBox = (x: number, y: number, width: number, height: number, color: string) => {
        doc.rect(x, y, width, height).fill(color)
      }

      // Header - Logo or Organization Name
      if (options.logoPath) {
        try {
          // Embed logo image (PNG/JPEG)
          // Logo is 600x200 px, using fit to maintain aspect ratio
          doc.image(options.logoPath, margin, currentY, {
            fit: [150, 50], // Fit within 150x50 points while maintaining aspect ratio
          })
          currentY += 60
        } catch (logoError) {
          // Fallback to text if logo fails to load
          strapi.log.error(`[Invoice] Failed to load logo: ${logoError.message}`)
          doc.fontSize(24).fillColor(darkColor).font("Helvetica-Bold").text(options.organizationName || "#play14", margin, currentY)
          currentY += 30
        }
      } else {
        // No logo provided, use text
        doc.fontSize(24).fillColor(darkColor).font("Helvetica-Bold").text(options.organizationName || "#play14", margin, currentY)
        currentY += 30
      }

      doc.fontSize(9).fillColor(grayColor).font("Helvetica")

      if (options.organizationAddress) {
        doc.text(options.organizationAddress, margin, currentY)
        currentY += 12
      }
      if (options.organizationEmail) {
        doc.text(options.organizationEmail, margin, currentY)
        currentY += 12
      }
      if (options.organizationWebsite) {
        doc.text(options.organizationWebsite, margin, currentY)
        currentY += 12
      }
      if (options.taxId) {
        doc.text(`Tax ID: ${options.taxId}`, margin, currentY)
        currentY += 12
      }

      currentY += 20

      // Invoice Title and Number
      doc
        .fontSize(32)
        .fillColor(primaryColor)
        .font("Helvetica-Bold")
        .text("INVOICE", pageWidth - margin - 200, margin, {
          width: 200,
          align: "right",
        })

      doc
        .fontSize(11)
        .fillColor(darkColor)
        .font("Helvetica")
        .text(`Invoice #: ${data.invoiceNumber}`, pageWidth - margin - 200, margin + 45, {
          width: 200,
          align: "right",
        })

      doc
        .fontSize(9)
        .fillColor(grayColor)
        .text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`, pageWidth - margin - 200, margin + 62, {
          width: 200,
          align: "right",
        })

      doc.text(`Order #: ${data.orderNumber}`, pageWidth - margin - 200, margin + 77, {
        width: 200,
        align: "right",
      })

      currentY += 20
      drawLine(currentY)
      currentY += 30

      // Bill To Section
      doc.fontSize(10).fillColor(grayColor).font("Helvetica-Bold").text("BILL TO:", margin, currentY)

      currentY += 18

      doc.fontSize(11).fillColor(darkColor).font("Helvetica-Bold").text(data.purchaserName, margin, currentY)

      currentY += 16

      doc.fontSize(9).fillColor(grayColor).font("Helvetica").text(data.purchaserEmail, margin, currentY)

      currentY += 30

      // Event Details Box
      drawBox(margin, currentY, contentWidth, 60, lightGray)

      doc.fontSize(9).fillColor(grayColor).font("Helvetica-Bold").text("EVENT DETAILS", margin + 15, currentY + 12)

      doc
        .fontSize(11)
        .fillColor(darkColor)
        .font("Helvetica-Bold")
        .text(data.eventName, margin + 15, currentY + 26, { width: contentWidth - 30 })

      doc.fontSize(9).fillColor(grayColor).font("Helvetica").text(`Date: ${data.eventDate}`, margin + 15, currentY + 41)

      doc.text(`Location: ${data.eventLocation}`, margin + 15, currentY + 53)

      currentY += 75

      // Items Table Header
      const tableTop = currentY
      const descriptionX = margin
      const quantityX = pageWidth - margin - 240
      const priceX = pageWidth - margin - 160
      const totalX = pageWidth - margin - 80

      // Table header background
      drawBox(margin, tableTop, contentWidth, 25, primaryColor)

      doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold")

      doc.text("DESCRIPTION", descriptionX + 10, tableTop + 8)
      doc.text("QTY", quantityX, tableTop + 8, { width: 60, align: "center" })
      doc.text("PRICE", priceX, tableTop + 8, { width: 70, align: "right" })
      doc.text("TOTAL", totalX, tableTop + 8, { width: 70, align: "right" })

      currentY = tableTop + 25

      // Table Items - Draw backgrounds first, then text
      // First pass: Draw all row backgrounds
      let tempY = tableTop + 25
      for (let i = 0; i < data.tickets.length; i++) {
        if (i % 2 === 0) {
          drawBox(margin, tempY, contentWidth, 30, "#fafafa")
        }
        tempY += 30
      }

      // Second pass: Draw all text on top
      doc.fillColor(darkColor).font("Helvetica")
      currentY = tableTop + 25

      for (let i = 0; i < data.tickets.length; i++) {
        const item = data.tickets[i]

        doc.fontSize(9).text(item.description, descriptionX + 10, currentY + 10, {
          width: quantityX - descriptionX - 20,
        })

        doc.text(item.quantity.toString(), quantityX, currentY + 10, { width: 60, align: "center" })

        doc.text(`${data.currency} ${item.unitPrice.toFixed(2)}`, priceX, currentY + 10, {
          width: 70,
          align: "right",
        })

        doc.text(`${data.currency} ${item.totalPrice.toFixed(2)}`, totalX, currentY + 10, {
          width: 70,
          align: "right",
        })

        currentY += 30
      }

      drawLine(currentY)
      currentY += 15

      // Totals Section
      const totalsX = pageWidth - margin - 200

      doc.fontSize(9).fillColor(grayColor).font("Helvetica")

      // Subtotal
      doc.text("Subtotal:", totalsX, currentY, { width: 120, align: "right" })
      doc.text(`${data.currency} ${data.subtotal.toFixed(2)}`, totalsX + 120, currentY, {
        width: 80,
        align: "right",
      })

      currentY += 18

      // Discount (if applicable)
      if (data.discountAmount && data.discountAmount > 0) {
        doc.fillColor(primaryColor)
        doc.text("Discount:", totalsX, currentY, { width: 120, align: "right" })
        doc.text(`-${data.currency} ${data.discountAmount.toFixed(2)}`, totalsX + 120, currentY, {
          width: 80,
          align: "right",
        })

        currentY += 18
      }

      // Total
      drawLine(currentY - 5, primaryColor)
      currentY += 10

      doc.fontSize(12).fillColor(darkColor).font("Helvetica-Bold")

      doc.text("TOTAL:", totalsX, currentY, { width: 120, align: "right" })
      doc.text(`${data.currency} ${data.totalAmount.toFixed(2)}`, totalsX + 120, currentY, {
        width: 80,
        align: "right",
      })

      currentY += 30

      // Payment Info
      doc
        .fontSize(9)
        .fillColor(grayColor)
        .font("Helvetica")
        .text(`Payment Method: ${data.paymentMethod}`, margin, currentY)

      doc.fillColor(primaryColor).font("Helvetica-Bold").text("PAID", totalsX + 80, currentY, {
        width: 120,
        align: "right",
      })

      currentY += 30

      // Notes Section
      if (data.notes) {
        drawLine(currentY)
        currentY += 20

        doc.fontSize(9).fillColor(grayColor).font("Helvetica-Bold").text("NOTES:", margin, currentY)

        currentY += 15

        doc
          .fontSize(8)
          .fillColor(darkColor)
          .font("Helvetica")
          .text(data.notes, margin, currentY, { width: contentWidth })

        currentY += 40
      }

      // Footer
      const footerY = pageHeight - margin - 30

      drawLine(footerY - 10)

      doc
        .fontSize(8)
        .fillColor(grayColor)
        .font("Helvetica")
        .text("Thank you for your purchase!", margin, footerY, {
          width: contentWidth,
          align: "center",
        })

      doc.text(`This is an automated invoice generated on ${new Date().toLocaleString()}`, margin, footerY + 12, {
        width: contentWidth,
        align: "center",
      })

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Helper function to format ticket items from order data
 */
export function formatTicketItems(ticketDetails: any[]): InvoiceData["tickets"] {
  return ticketDetails.map((detail) => {
    const quantity = detail.quantity || 1
    const unitPrice = detail.price || 0
    const totalPrice = unitPrice * quantity

    return {
      description: `${detail.ticketTypeName}${quantity > 1 ? ` x ${quantity}` : ""}`,
      quantity,
      unitPrice,
      totalPrice,
    }
  })
}
