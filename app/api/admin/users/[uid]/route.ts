import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin"
import { logAudit } from "@/lib/audit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params

  try {
    const adminAuth = getAdminAuth()
    const firestore = getAdminFirestore()

    const authUser = await adminAuth.getUser(uid)

    // Get Firestore profile
    const profileDoc = await firestore.collection("users").doc(uid).get()
    const profile = profileDoc.exists ? profileDoc.data() : null

    // Get rankings
    const rankingsSnap = await firestore
      .collection("users")
      .doc(uid)
      .collection("rankings")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get()

    const rankings = rankingsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        scoring: data.scoring,
        qbFormat: data.qbFormat,
        playerCount: data.players?.length || 0,
        createdAt: data.createdAt?._seconds
          ? new Date(data.createdAt._seconds * 1000).toISOString()
          : null,
        updatedAt: data.updatedAt?._seconds
          ? new Date(data.updatedAt._seconds * 1000).toISOString()
          : null,
      }
    })

    return NextResponse.json({
      user: {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        disabled: authUser.disabled,
        creationTime: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
        providerData: authUser.providerData.map((p) => ({
          providerId: p.providerId,
        })),
      },
      profile: profile
        ? {
            username: profile.username,
            avatarConfig: profile.avatarConfig,
            createdAt: profile.createdAt?._seconds
              ? new Date(profile.createdAt._seconds * 1000).toISOString()
              : null,
            updatedAt: profile.updatedAt?._seconds
              ? new Date(profile.updatedAt._seconds * 1000).toISOString()
              : null,
          }
        : null,
      rankings,
    })
  } catch (error: unknown) {
    console.error("User detail error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params
  const { action } = await req.json()

  if (action !== "disable" && action !== "enable") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for") ||
    "unknown"

  try {
    const adminAuth = getAdminAuth()

    // Get current state for audit
    const currentUser = await adminAuth.getUser(uid)
    const wasDisabled = currentUser.disabled

    // Log audit BEFORE the change
    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: action === "disable" ? "DISABLE_USER" : "ENABLE_USER",
      resource: `users/${uid}`,
      before: { disabled: wasDisabled },
      after: { disabled: action === "disable" },
      ip,
      severity: "high",
    })

    // Perform the action
    await adminAuth.updateUser(uid, { disabled: action === "disable" })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("User update error:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
