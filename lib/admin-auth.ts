import { SignJWT, jwtVerify } from "jose"
import { getAdminFirestore } from "./firebase-admin"

const SESSION_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "dev-admin-secret-change-in-production"
)

const SESSION_DURATION_HOURS = parseInt(
  process.env.ADMIN_SESSION_DURATION_HOURS || "8",
  10
)

// In development, you can set this env var to bypass the Firestore check
// ADMIN_UIDS=uid1,uid2
const DEV_ADMIN_UIDS = process.env.ADMIN_UIDS?.split(",").map((s) => s.trim()) || []

interface AdminSession {
  uid: string
  email: string
}

export async function isAdminUid(uid: string): Promise<boolean> {
  // Check env-based admin list first (works without Firestore admin SDK in dev)
  if (DEV_ADMIN_UIDS.includes(uid)) {
    return true
  }

  try {
    const db = getAdminFirestore()
    const adminDoc = await db.collection("admins").doc(uid).get()
    return adminDoc.exists
  } catch {
    // If Firestore admin SDK is not configured, fall back to env list only
    return false
  }
}

export async function createAdminSession(
  uid: string,
  email: string
): Promise<string> {
  const token = await new SignJWT({ uid, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(SESSION_SECRET)

  return token
}

export async function verifyAdminSession(
  token: string | undefined
): Promise<AdminSession | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return {
      uid: payload.uid as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}

export function getSessionCookieOptions() {
  return {
    name: "admin-session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    path: "/",
  }
}
