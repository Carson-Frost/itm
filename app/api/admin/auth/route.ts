import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase-admin"
import {
  isAdminUid,
  createAdminSession,
  verifyAdminSession,
  getSessionCookieOptions,
} from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing ID token" },
        { status: 400 }
      )
    }

    // Verify the Firebase ID token
    const decodedToken = await getAdminAuth().verifyIdToken(idToken)
    const { uid, email } = decodedToken

    if (!email) {
      return NextResponse.json(
        { error: "Account has no email" },
        { status: 400 }
      )
    }

    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown"

    // Check if this UID is in the admin list
    const isAdmin = await isAdminUid(uid)
    if (!isAdmin) {
      // Log the failed attempt
      try {
        await logAudit({
          adminUid: uid,
          adminEmail: email,
          action: "ADMIN_LOGIN_DENIED",
          resource: `auth/${uid}`,
          after: { reason: "UID not in admin list" },
          ip,
          severity: "high",
        })
      } catch {
        // Don't block the response if audit fails
      }

      return NextResponse.json(
        { error: "Access denied. You are not an admin." },
        { status: 403 }
      )
    }

    // Log successful login
    try {
      await logAudit({
        adminUid: uid,
        adminEmail: email,
        action: "ADMIN_LOGIN",
        resource: `auth/${uid}`,
        ip,
      })
    } catch {
      // Don't block login if audit fails in dev
    }

    // Create a signed admin session token
    const sessionToken = await createAdminSession(uid, email)
    const cookieOptions = getSessionCookieOptions()

    const response = NextResponse.json({ success: true })
    response.cookies.set(cookieOptions.name, sessionToken, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    })

    return response
  } catch (error: unknown) {
    console.error("Admin auth error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  // Log the logout before clearing the cookie
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (admin) {
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown"
    try {
      await logAudit({
        adminUid: admin.uid,
        adminEmail: admin.email,
        action: "ADMIN_LOGOUT",
        resource: `auth/${admin.uid}`,
        ip,
      })
    } catch {
      // Don't block logout if audit fails
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete("admin-session")
  return response
}
