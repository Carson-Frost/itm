import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import type { ConnectionsScheduleConfig } from "@/lib/types/connections"

const SCHEDULE_DOC = "connections_schedule/config"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminFirestore()
    const doc = await db.doc(SCHEDULE_DOC).get()

    if (!doc.exists) {
      const defaultConfig: ConnectionsScheduleConfig = {
        calendar: {},
        stack: [],
        stackPointer: 0,
      }
      return NextResponse.json(defaultConfig)
    }

    return NextResponse.json(doc.data())
  } catch (error: unknown) {
    console.error("Schedule fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { calendar, stack, stackPointer } = body as ConnectionsScheduleConfig

    const db = getAdminFirestore()
    const docRef = db.doc(SCHEDULE_DOC)
    const existing = await docRef.get()

    const data: ConnectionsScheduleConfig = {
      calendar: calendar || {},
      stack: stack || [],
      stackPointer: stackPointer ?? 0,
    }

    await docRef.set(data)

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "UPDATE_SCHEDULE",
      resource: "connections_schedule/config",
      before: existing.exists ? existing.data() : null,
      after: data,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Schedule update error:", error)
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    )
  }
}
