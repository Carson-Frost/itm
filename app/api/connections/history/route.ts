import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.slice(7)
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const uid = decoded.uid

    const db = getAdminFirestore()
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("connections_results")
      .orderBy("completedAt", "desc")
      .limit(50)
      .get()

    const results = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ results })
  } catch (error: unknown) {
    console.error("History error:", error)
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    )
  }
}
