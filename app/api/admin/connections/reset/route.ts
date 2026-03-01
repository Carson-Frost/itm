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
      // Reset specific user — delete from both subcollection and top-level
      const batch = db.batch()

      const subRef = db
        .collection("users")
        .doc(uid)
        .collection("connections_results")
        .doc(puzzleId)
      const topRef = db
        .collection("connections_results")
        .doc(`${uid}_${puzzleId}`)

      const subDoc = await subRef.get()
      if (subDoc.exists) batch.delete(subRef)

      const topDoc = await topRef.get()
      if (topDoc.exists) batch.delete(topRef)

      // Increment resetVersion on puzzle
      batch.update(
        db.collection("connections_puzzles").doc(puzzleId),
        { resetVersion: FieldValue.increment(1) }
      )

      await batch.commit()

      await logAudit({
        adminUid: admin.uid,
        adminEmail: admin.email,
        action: "RESET_USER_PUZZLE",
        resource: `users/${uid}/connections_results/${puzzleId}`,
        severity: "high",
      })

      return NextResponse.json({ success: true, resetCount: subDoc.exists ? 1 : 0 })
    } else {
      // Reset all users — query top-level collection (no collection group index needed)
      const resultsSnap = await db
        .collection("connections_results")
        .where("puzzleId", "==", puzzleId)
        .get()

      // Batch delete from both top-level and subcollections
      // Firestore batches limited to 500, so chunk if needed
      const docs = resultsSnap.docs
      const chunks: FirebaseFirestore.DocumentSnapshot[][] = []
      for (let i = 0; i < docs.length; i += 200) {
        chunks.push(docs.slice(i, i + 200))
      }

      for (const chunk of chunks) {
        const batch = db.batch()
        for (const doc of chunk) {
          const data = doc.data()
          // Delete top-level doc
          batch.delete(doc.ref)
          // Delete matching subcollection doc
          if (data?.uid) {
            batch.delete(
              db.collection("users").doc(data.uid).collection("connections_results").doc(puzzleId)
            )
          }
        }
        await batch.commit()
      }

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
