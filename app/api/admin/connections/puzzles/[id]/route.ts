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
    const doc = await db.collection("connections_puzzles").doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 })
    }

    const data = doc.data()!
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error: unknown) {
    console.error("Get puzzle error:", error)
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await req.json()
    const { title, categories, status, tileOrder } = body

    const validationError = validatePuzzle(categories)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const db = getAdminFirestore()
    const docRef = db.collection("connections_puzzles").doc(id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 })
    }

    // Look up admin username from Firestore
    let adminUsername: string | undefined
    try {
      const userDoc = await db.collection("users").doc(admin.uid).get()
      if (userDoc.exists) adminUsername = userDoc.data()?.username
    } catch {}

    const authorInfo = { uid: admin.uid, email: admin.email, ...(adminUsername ? { username: adminUsername } : {}) }

    const newStatus = status === "published" ? "published" : "draft"
    const oldStatus = existing.data()?.status as string | undefined

    const updateData: Record<string, unknown> = {
      title: title || "",
      categories,
      status: newStatus,
      updatedBy: authorInfo,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (Array.isArray(tileOrder)) {
      updateData.tileOrder = tileOrder.length > 0 ? tileOrder : FieldValue.delete()
    }

    await docRef.update(updateData)

    // High severity if status is changing (affects active days)
    const isStatusChange = oldStatus && oldStatus !== newStatus

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "UPDATE_PUZZLE",
      resource: `connections_puzzles/${id}`,
      before: existing.data(),
      after: updateData,
      severity: isStatusChange ? "high" : "medium",
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Update puzzle error:", error)
    return NextResponse.json(
      { error: "Failed to update puzzle" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const docRef = db.collection("connections_puzzles").doc(id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 })
    }

    await docRef.delete()

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "DELETE_PUZZLE",
      resource: `connections_puzzles/${id}`,
      before: existing.data(),
      severity: "medium",
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Delete puzzle error:", error)
    return NextResponse.json(
      { error: "Failed to delete puzzle" },
      { status: 500 }
    )
  }
}
