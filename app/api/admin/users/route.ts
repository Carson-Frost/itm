import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin"

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const pageToken = searchParams.get("pageToken") || undefined
  const search = searchParams.get("search") || ""

  try {
    const adminAuth = getAdminAuth()
    const firestore = getAdminFirestore()

    // If searching, query Firestore users collection
    if (search) {
      const usersRef = firestore.collection("users")
      // Search by username or email
      const byUsername = await usersRef
        .where("username", ">=", search)
        .where("username", "<=", search + "\uf8ff")
        .limit(PAGE_SIZE)
        .get()

      const byEmail = await usersRef
        .where("email", ">=", search)
        .where("email", "<=", search + "\uf8ff")
        .limit(PAGE_SIZE)
        .get()

      // Deduplicate
      const userMap = new Map<string, Record<string, unknown>>()
      for (const doc of [...byUsername.docs, ...byEmail.docs]) {
        if (!userMap.has(doc.id)) {
          const data = doc.data()
          // Get auth info
          try {
            const authUser = await adminAuth.getUser(doc.id)
            userMap.set(doc.id, {
              uid: doc.id,
              email: data.email || authUser.email,
              username: data.username || authUser.displayName,
              createdAt: data.createdAt?._seconds
                ? new Date(data.createdAt._seconds * 1000).toISOString()
                : null,
              lastLogin: authUser.metadata.lastSignInTime || null,
              disabled: authUser.disabled,
            })
          } catch {
            userMap.set(doc.id, {
              uid: doc.id,
              email: data.email,
              username: data.username,
              createdAt: data.createdAt?._seconds
                ? new Date(data.createdAt._seconds * 1000).toISOString()
                : null,
              lastLogin: null,
              disabled: false,
            })
          }
        }
      }

      return NextResponse.json({
        users: Array.from(userMap.values()),
        nextPageToken: null,
      })
    }

    // List users from Firebase Auth
    const listResult = await adminAuth.listUsers(PAGE_SIZE, pageToken)
    const users = await Promise.all(
      listResult.users.map(async (authUser) => {
        // Get Firestore profile data
        let firestoreData: Record<string, unknown> = {}
        try {
          const doc = await firestore.collection("users").doc(authUser.uid).get()
          if (doc.exists) {
            firestoreData = doc.data() || {}
          }
        } catch {
          // ignore
        }

        // Count rankings
        let rankingCount = 0
        try {
          const rankingsSnap = await firestore
            .collection("users")
            .doc(authUser.uid)
            .collection("rankings")
            .count()
            .get()
          rankingCount = rankingsSnap.data().count
        } catch {
          // ignore
        }

        return {
          uid: authUser.uid,
          email: authUser.email,
          username:
            (firestoreData.username as string) ||
            authUser.displayName ||
            "—",
          createdAt: firestoreData.createdAt
            ? new Date(
                ((firestoreData.createdAt as { _seconds: number })._seconds ||
                  0) * 1000
              ).toISOString()
            : authUser.metadata.creationTime || null,
          lastLogin: authUser.metadata.lastSignInTime || null,
          disabled: authUser.disabled,
          rankingCount,
        }
      })
    )

    return NextResponse.json({
      users,
      nextPageToken: listResult.pageToken || null,
    })
  } catch (error: unknown) {
    console.error("Users list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
