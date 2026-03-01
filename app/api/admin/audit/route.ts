import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const adminFilter = searchParams.get("admin") || ""
  const actionFilter = searchParams.get("action") || ""
  const startCursor = searchParams.get("cursor") || ""

  try {
    const firestore = getAdminFirestore()
    let query = firestore
      .collection("audit_log")
      .orderBy("timestamp", "desc")
      .limit(PAGE_SIZE)

    if (adminFilter) {
      query = query.where("adminEmail", "==", adminFilter)
    }
    if (actionFilter) {
      query = query.where("action", "==", actionFilter)
    }

    // Cursor-based pagination
    if (startCursor) {
      const cursorDoc = await firestore
        .collection("audit_log")
        .doc(startCursor)
        .get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    const snapshot = await query.get()

    const entries = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        adminUid: data.adminUid,
        adminEmail: data.adminEmail,
        action: data.action,
        resource: data.resource,
        before: data.before,
        after: data.after,
        ip: data.ip,
        severity: data.severity || "low",
        timestamp: data.timestamp?._seconds
          ? new Date(data.timestamp._seconds * 1000).toISOString()
          : null,
      }
    })

    const lastDoc = snapshot.docs[snapshot.docs.length - 1]

    return NextResponse.json({
      entries,
      nextCursor: snapshot.docs.length === PAGE_SIZE ? lastDoc?.id : null,
    })
  } catch (error: unknown) {
    console.error("Audit log error:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    )
  }
}
