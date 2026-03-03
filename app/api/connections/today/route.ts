import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function GET() {
  try {
    const db = getAdminFirestore()
    const today = new Date()
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    // 1. Check calendar
    const scheduleDoc = await db.doc("connections_schedule/config").get()
    const schedule = scheduleDoc.data()

    if (schedule) {
      // Calendar assignment
      const calendarPuzzleId = schedule.calendar?.[dateKey]
      if (calendarPuzzleId) {
        const puzzle = await db
          .collection("connections_puzzles")
          .doc(calendarPuzzleId)
          .get()
        if (puzzle.exists && puzzle.data()?.status === "published") {
          return NextResponse.json({
            id: puzzle.id,
            date: dateKey,
            ...puzzle.data(),
            createdAt: puzzle.data()?.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: puzzle.data()?.updatedAt?.toDate?.()?.toISOString() || null,
          })
        }
      }

      // 2. Stack queue — use Firestore transaction to increment pointer
      if (schedule.stack?.length > 0) {
        const stackResult = await db.runTransaction(async (tx) => {
          const schedRef = db.doc("connections_schedule/config")
          const snap = await tx.get(schedRef)
          const data = snap.data()
          if (!data) return null

          const pointer = data.stackPointer ?? 0
          if (pointer < data.stack.length) {
            const puzzleId = data.stack[pointer]
            tx.update(schedRef, { stackPointer: FieldValue.increment(1) })
            return puzzleId
          }
          return null
        })

        if (stackResult) {
          const puzzle = await db
            .collection("connections_puzzles")
            .doc(stackResult)
            .get()
          if (puzzle.exists && puzzle.data()?.status === "published") {
            // Also assign to calendar so we don't consume another stack slot on re-fetch
            await db.doc("connections_schedule/config").update({
              [`calendar.${dateKey}`]: stackResult,
            })
            return NextResponse.json({
              id: puzzle.id,
              date: dateKey,
              ...puzzle.data(),
              createdAt: puzzle.data()?.createdAt?.toDate?.()?.toISOString() || null,
              updatedAt: puzzle.data()?.updatedAt?.toDate?.()?.toISOString() || null,
            })
          }
        }
      }

    }

    return NextResponse.json(
      { error: "No puzzle available today" },
      { status: 404 }
    )
  } catch (error: unknown) {
    console.error("Today puzzle error:", error)
    return NextResponse.json(
      { error: "Failed to fetch today's puzzle" },
      { status: 500 }
    )
  }
}
