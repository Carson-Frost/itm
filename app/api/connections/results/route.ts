import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.slice(7)
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const uid = decoded.uid

    const body = await req.json()
    const { puzzleId, date, solved, mistakes, solveOrder } = body

    if (!puzzleId || typeof solved !== "boolean" || typeof mistakes !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const db = getAdminFirestore()
    await db
      .collection("users")
      .doc(uid)
      .collection("connections_results")
      .doc(puzzleId)
      .set({
        puzzleId,
        date: date || new Date().toISOString().split("T")[0],
        solved,
        mistakes,
        solveOrder: solveOrder || [],
        completedAt: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Save result error:", error)
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    )
  }
}
