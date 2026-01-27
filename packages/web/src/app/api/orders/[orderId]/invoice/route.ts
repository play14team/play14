import { type NextRequest, NextResponse } from "next/server"
import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  // Validate orderId format
  if (!orderId || !/^[a-zA-Z0-9_-]+$/.test(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
  }

  // Get auth token
  const jwt = await getAuthCookie()
  if (!jwt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Proxy the request to Strapi
    const response = await fetch(`${STRAPI_URL}/api/ticket-orders/${orderId}/invoice`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Invoice] Failed to fetch invoice: ${response.status} - ${errorText}`)
      return NextResponse.json({ error: "Failed to download invoice" }, { status: response.status })
    }

    // Get the PDF buffer
    const pdfBuffer = await response.arrayBuffer()

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          response.headers.get("Content-Disposition") ||
          `attachment; filename="invoice-${orderId}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[Invoice] Error proxying invoice request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
