import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date")
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date parameter. Use YYYY-MM-DD format." },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const scheduleDoc = await db.doc("connections_schedule/config").get()
    const schedule = scheduleDoc.data()

    if (!schedule?.calendar?.[date]) {
      return NextResponse.json(
        { error: "No puzzle assigned for this date" },
        { status: 404 }
      )
    }

    const puzzleId = schedule.calendar[date]
    const puzzleDoc = await db
      .collection("connections_puzzles")
      .doc(puzzleId)
      .get()

    if (!puzzleDoc.exists || puzzleDoc.data()?.status !== "published") {
      return NextResponse.json(
        { error: "Puzzle not available" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: puzzleDoc.id,
      date,
      ...puzzleDoc.data(),
      createdAt: puzzleDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: puzzleDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error: unknown) {
    console.error("Puzzle by date error:", error)
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    )
  }
}
