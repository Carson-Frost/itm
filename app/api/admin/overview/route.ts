import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getDatabase } from "@/lib/database/connection"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getDatabase()

  // Get table row counts
  const tables = ["roster_data", "season_stats", "weekly_stats", "schedule_data", "sleeper_adp", "metadata"]
  const dbTables = tables.map((name) => {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as { count: number }
      return { name, rowCount: row.count }
    } catch {
      return { name, rowCount: 0 }
    }
  })

  // Get last updated from metadata
  let lastUpdated: string | null = null
  try {
    const meta = db
      .prepare("SELECT value FROM metadata WHERE key = 'last_import_date'")
      .get() as { value: string } | undefined
    lastUpdated = meta?.value ?? null
  } catch {
    // ignore
  }

  // User count and audit count are Firestore-dependent
  // Return 0 for now — these will work once Firebase Admin SDK is fully configured
  let userCount = 0
  let recentAuditCount = 0
  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin")
    const firestore = getAdminFirestore()

    const usersSnap = await firestore.collection("users").count().get()
    userCount = usersSnap.data().count

    const auditSnap = await firestore.collection("audit_log").count().get()
    recentAuditCount = auditSnap.data().count
  } catch {
    // Firebase Admin not configured yet — that's fine in dev
  }

  return NextResponse.json({
    userCount,
    dbTables,
    lastUpdated,
    recentAuditCount,
  })
}
