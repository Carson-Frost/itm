import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const db = getAdminFirestore()
    const docRef = db.collection("codenames_content").doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const data = doc.data()!
    await docRef.delete()

    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "DELETE_CODENAMES_CONTENT",
      resource: `codenames_content/${id}`,
      before: { name: data.name, type: data.type },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Delete codenames content error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
