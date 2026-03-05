import { NextRequest, NextResponse } from "next/server"
import { isAdminUid } from "@/lib/admin-auth"

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid")

  if (!uid) {
    return NextResponse.json({ isAdmin: false }, { status: 400 })
  }

  const isAdmin = await isAdminUid(uid)
  return NextResponse.json({ isAdmin })
}
