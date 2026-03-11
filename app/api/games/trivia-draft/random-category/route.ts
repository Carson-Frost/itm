import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const exclude = searchParams.get("exclude")
  const excludeIds = exclude
    ? exclude.split(",").map((id) => id.trim()).filter(Boolean)
    : []

  try {
    const db = getAdminFirestore()
    const snap = await db
      .collection("trivia_categories")
      .where("status", "==", "published")
      .get()

    let candidates = snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
    }))

    if (excludeIds.length > 0) {
      candidates = candidates.filter((c) => !excludeIds.includes(c.id))
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No available categories" },
        { status: 404 }
      )
    }

    const randomIndex = Math.floor(Math.random() * candidates.length)
    const selected = candidates[randomIndex]

    return NextResponse.json({ id: selected.id, name: selected.name })
  } catch (error: unknown) {
    console.error("Random trivia category error:", error)
    return NextResponse.json(
      { error: "Failed to fetch random category" },
      { status: 500 }
    )
  }
}
