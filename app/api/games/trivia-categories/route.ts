import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const statusFilter = searchParams.get("status")

    const db = getAdminFirestore()

    // If status=all, check admin session and return all categories
    let isAdmin = false
    if (statusFilter === "all") {
      const token = req.cookies.get("admin-session")?.value
      const admin = await verifyAdminSession(token)
      if (admin) isAdmin = true
    }

    const collRef = db.collection("trivia_categories")
    const query = isAdmin
      ? collRef.orderBy("createdAt", "desc")
      : collRef.where("status", "==", "published").orderBy("createdAt", "desc")

    const snap = await query.get()

    const categories = snap.docs.map((doc) => {
      const data = doc.data()
      const base: Record<string, unknown> = {
        id: doc.id,
        name: data.name as string,
        description: (data.description as string) || "",
      }

      // Include full data for admin
      if (isAdmin) {
        base.status = data.status
        base.validPlayers = data.validPlayers || []
        base.filters = data.filters || null
        base.createdBy = data.createdBy || null
        base.updatedBy = data.updatedBy || null
        base.createdAt = data.createdAt?.toDate?.()?.toISOString() || null
        base.updatedAt = data.updatedAt?.toDate?.()?.toISOString() || null
      }

      return base
    })

    return NextResponse.json({ categories })
  } catch (error: unknown) {
    console.error("Trivia categories list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
    const { name, description, status, validPlayers, filters } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(validPlayers)) {
      return NextResponse.json(
        { error: "validPlayers must be an array" },
        { status: 400 }
      )
    }

    const categoryStatus =
      status === "published" ? "published" : "draft"

    const db = getAdminFirestore()
    const authorInfo = { uid: admin.uid, email: admin.email }

    const categoryData: Record<string, unknown> = {
      name: name.trim(),
      description: description || "",
      status: categoryStatus,
      validPlayers,
      createdBy: authorInfo,
      updatedBy: authorInfo,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (filters && typeof filters === "object") {
      categoryData.filters = filters
    }

    const docRef = await db.collection("trivia_categories").add(categoryData)

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "CREATE_TRIVIA_CATEGORY",
      resource: `trivia_categories/${docRef.id}`,
      after: { name: name.trim(), status: categoryStatus, playerCount: validPlayers.length },
    })

    return NextResponse.json({ id: docRef.id })
  } catch (error: unknown) {
    console.error("Create trivia category error:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
