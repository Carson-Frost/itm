import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import { FieldValue } from "firebase-admin/firestore"
import type { ConnectionsCategory } from "@/lib/types/connections"

function validatePuzzle(categories: ConnectionsCategory[]): string | null {
  if (!Array.isArray(categories) || categories.length !== 4) {
    return "Exactly 4 categories required"
  }

  const difficulties = new Set<number>()
  const allPlayerIds = new Set<string>()

  for (const cat of categories) {
    if (!cat.name || cat.name.trim().length === 0) {
      return "All categories must have a name"
    }
    if (cat.difficulty < 1 || cat.difficulty > 4) {
      return "Difficulty must be 1-4"
    }
    if (difficulties.has(cat.difficulty)) {
      return "Each category must have a unique difficulty"
    }
    difficulties.add(cat.difficulty)

    if (!Array.isArray(cat.players) || cat.players.length !== 4) {
      return `Category "${cat.name}" must have exactly 4 players`
    }
    for (const player of cat.players) {
      if (!player.name || !player.playerId) {
        return `All players in "${cat.name}" must have a name and ID`
      }
      if (allPlayerIds.has(player.playerId)) {
        return `Duplicate player: ${player.name}`
      }
      allPlayerIds.add(player.playerId)
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")

  try {
    const db = getAdminFirestore()
    const collection = db.collection("connections_puzzles")

    // where must come before orderBy for Firestore
    const baseQuery = status
      ? collection.where("status", "==", status)
      : collection

    const snap = await baseQuery.orderBy("createdAt", "desc").limit(100).get()
    const puzzles = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({ puzzles })
  } catch (error: unknown) {
    console.error("Puzzles list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch puzzles" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, categories, status, tileOrder } = body

    const validationError = validatePuzzle(categories)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const puzzleStatus = status === "published" ? "published" : "draft"
    const db = getAdminFirestore()

    // Look up admin username from Firestore
    let adminUsername: string | undefined
    try {
      const userDoc = await db.collection("users").doc(admin.uid).get()
      if (userDoc.exists) adminUsername = userDoc.data()?.username
    } catch {}

    const authorInfo = { uid: admin.uid, email: admin.email, ...(adminUsername ? { username: adminUsername } : {}) }

    const puzzleData: Record<string, unknown> = {
      title: title || "",
      categories,
      status: puzzleStatus,
      createdBy: authorInfo,
      updatedBy: authorInfo,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (Array.isArray(tileOrder) && tileOrder.length > 0) {
      puzzleData.tileOrder = tileOrder
    }

    const docRef = await db.collection("connections_puzzles").add(puzzleData)

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "CREATE_PUZZLE",
      resource: `connections_puzzles/${docRef.id}`,
      after: { title, categories, status: puzzleStatus },
    })

    return NextResponse.json({ id: docRef.id })
  } catch (error: unknown) {
    console.error("Create puzzle error:", error)
    return NextResponse.json(
      { error: "Failed to create puzzle" },
      { status: 500 }
    )
  }
}
