"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AvatarConfig } from "@/lib/avatar-utils"

interface UserData {
  uid: string
  email: string
  username: string
  avatarConfig?: AvatarConfig
  createdAt: any
  updatedAt: any
}

export function useUserData(userId: string | undefined) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setUserData(null)
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData)
        } else {
          setUserData(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching user data:", error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [userId])

  return { userData, loading }
}
