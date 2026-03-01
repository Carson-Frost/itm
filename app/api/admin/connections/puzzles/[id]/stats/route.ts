import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const db = getAdminFirestore()

    // Collection group query on connections_results
    const resultsSnap = await db
      .collectionGroup("connections_results")
      .where("puzzleId", "==", id)
      .get()

    if (resultsSnap.empty) {
      return NextResponse.json({
        totalPlays: 0,
        completionRate: 0,
        avgMistakes: 0,
        solveOrderFrequency: {},
      })
    }

    let totalPlays = 0
    let totalSolved = 0
    let totalMistakes = 0
    const solveOrderCounts: Record<string, number> = {}

    for (const doc of resultsSnap.docs) {
      const data = doc.data()
      totalPlays++
      if (data.solved) totalSolved++
      totalMistakes += data.mistakes || 0

      if (data.solveOrder && Array.isArray(data.solveOrder)) {
        const key = data.solveOrder.join(",")
        solveOrderCounts[key] = (solveOrderCounts[key] || 0) + 1
      }
    }

    return NextResponse.json({
      totalPlays,
      completionRate: totalPlays > 0 ? Math.round((totalSolved / totalPlays) * 100) : 0,
      avgMistakes: totalPlays > 0 ? Math.round((totalMistakes / totalPlays) * 10) / 10 : 0,
      solveOrderFrequency: solveOrderCounts,
    })
  } catch (error: unknown) {
    console.error("Puzzle stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
