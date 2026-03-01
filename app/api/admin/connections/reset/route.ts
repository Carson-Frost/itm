import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { puzzleId, uid } = body

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    if (uid && typeof uid === "string") {
      // Reset specific user
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("connections_results")
        .doc(puzzleId)

      const doc = await docRef.get()
      if (doc.exists) {
        await docRef.delete()
      }

      await logAudit({
        adminUid: admin.uid,
        adminEmail: admin.email,
        action: "RESET_USER_PUZZLE",
        resource: `users/${uid}/connections_results/${puzzleId}`,
        severity: "high",
      })

      // Increment resetVersion on puzzle
      await db
        .collection("connections_puzzles")
        .doc(puzzleId)
        .update({ resetVersion: FieldValue.increment(1) })

      return NextResponse.json({ success: true, resetCount: doc.exists ? 1 : 0 })
    } else {
      // Reset all users for this puzzle
      const resultsSnap = await db
        .collectionGroup("connections_results")
        .where("puzzleId", "==", puzzleId)
        .get()

      const batch = db.batch()
      for (const doc of resultsSnap.docs) {
        batch.delete(doc.ref)
      }
      await batch.commit()

      // Increment resetVersion on puzzle
      await db
        .collection("connections_puzzles")
        .doc(puzzleId)
        .update({ resetVersion: FieldValue.increment(1) })

      await logAudit({
        adminUid: admin.uid,
        adminEmail: admin.email,
        action: "RESET_ALL_PUZZLE",
        resource: `connections_puzzles/${puzzleId}`,
        after: { deletedCount: resultsSnap.size },
        severity: "high",
      })

      return NextResponse.json({
        success: true,
        resetCount: resultsSnap.size,
      })
    }
  } catch (error: unknown) {
    console.error("Reset error:", error)
    return NextResponse.json(
      { error: "Failed to reset puzzle data" },
      { status: 500 }
    )
  }
}
