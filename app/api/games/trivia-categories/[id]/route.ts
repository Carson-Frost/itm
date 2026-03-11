import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = getAdminFirestore()
    const doc = await db.collection("trivia_categories").doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const data = doc.data()!
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error: unknown) {
    console.error("Get trivia category error:", error)
    return NextResponse.json(
      { error: "Failed to fetch category" },
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
    const { name, description, status, validPlayers, filters } = body

    const db = getAdminFirestore()
    const docRef = db.collection("trivia_categories").doc(id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      updatedBy: { uid: admin.uid, email: admin.email },
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description
    if (status !== undefined) {
      updateData.status = status === "published" ? "published" : "draft"
    }
    if (validPlayers !== undefined) updateData.validPlayers = validPlayers
    if (filters !== undefined) updateData.filters = filters

    await docRef.update(updateData)

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "UPDATE_TRIVIA_CATEGORY",
      resource: `trivia_categories/${id}`,
      before: existing.data(),
      after: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Update trivia category error:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
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
    const docRef = db.collection("trivia_categories").doc(id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    await docRef.delete()

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "DELETE_TRIVIA_CATEGORY",
      resource: `trivia_categories/${id}`,
      before: existing.data(),
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Delete trivia category error:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}
