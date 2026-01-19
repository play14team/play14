/**
 * Script to generate a sample invoice PDF for visual inspection
 * Run with: bun run src/scripts/generate-sample-invoice.ts
 */

import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { type InvoiceData, generateInvoicePDF } from "../libs/invoice"

async function main() {
  console.log("Generating sample invoice...")

  const invoiceData: InvoiceData = {
    orderNumber: "ORD-2024-12345",
    invoiceNumber: "INV-2024-12345",
    invoiceDate: new Date().toISOString(),
    purchaserName: "Alice Johnson",
    purchaserEmail: "alice.johnson@example.com",
    eventName: "#play14 Luxembourg 2024",
    eventDate: "Saturday, December 14, 2024 at 09:00 AM",
    eventLocation: "Luxembourg Learning Hub - 23 Rue de la Paix, Luxembourg",
    tickets: [
      {
        description: "Early Bird Ticket x 2",
        quantity: 2,
        unitPrice: 45,
        totalPrice: 90,
      },
      {
        description: "Regular Ticket",
        quantity: 1,
        unitPrice: 60,
        totalPrice: 60,
      },
      {
        description: "Workshop Pass",
        quantity: 1,
        unitPrice: 30,
        totalPrice: 30,
      },
    ],
    subtotal: 180,
    discountAmount: 20,
    totalAmount: 160,
    currency: "EUR",
    paymentMethod: "Stripe",
    notes:
      "Thank you for your purchase! This invoice is for your records. If you have any questions about your order, please contact the event organizers.",
  }

  // Use local logo copy in public/images (white background version for invoices)
  const logoPath = join(process.cwd(), "public/images/play14_600x200_transparent-light.png")

  const pdfBuffer = await generateInvoicePDF(invoiceData, {
    organizationName: "#play14",
    organizationWebsite: "https://play14.org",
    organizationEmail: "team@play14.org",
    logoPath, // Add logo to invoice
    // taxId is optional - not included for #play14 non-profit
  })

  const outputPath = join(process.cwd(), "sample-invoice.pdf")
  writeFileSync(outputPath, pdfBuffer)

  console.log("✓ Sample invoice generated successfully!")
  console.log(`  Location: ${outputPath}`)
  console.log(`  Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
}

main().catch((error) => {
  console.error("Error generating sample invoice:", error)
  process.exit(1)
})
