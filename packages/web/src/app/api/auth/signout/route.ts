import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/libs/auth"

export async function POST() {
  await clearAuthCookie()
  return NextResponse.json({ success: true })
}
