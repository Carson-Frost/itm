import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = req.nextUrl
    const typeFilter = searchParams.get("type")

    const db = getAdminFirestore()
    let query = db.collection("codenames_content").orderBy("name", "asc") as FirebaseFirestore.Query

    if (typeFilter && (typeFilter === "college" || typeFilter === "coach")) {
      query = db.collection("codenames_content")
        .where("type", "==", typeFilter)
        .orderBy("name", "asc")
    }

    const snap = await query.get()
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Codenames content list error:", error)
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 })
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
    const { name, imageUrl, type, subtitle } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (type !== "college" && type !== "coach") {
      return NextResponse.json({ error: "Type must be college or coach" }, { status: 400 })
    }

    const db = getAdminFirestore()
    const docRef = await db.collection("codenames_content").add({
      name: name.trim(),
      imageUrl: imageUrl?.trim() || null,
      type,
      subtitle: subtitle?.trim() || null,
      createdBy: { uid: admin.uid, email: admin.email },
      createdAt: FieldValue.serverTimestamp(),
    })

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "CREATE_CODENAMES_CONTENT",
      resource: `codenames_content/${docRef.id}`,
      after: { name: name.trim(), type },
    })

    return NextResponse.json({ id: docRef.id })
  } catch (error) {
    console.error("Create codenames content error:", error)
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 })
  }
}
