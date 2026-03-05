"use client"

import { useEffect, useState } from "react"

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    async function checkAdmin() {
      try {
        const res = await fetch(`/api/admin/check?uid=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.isAdmin)
        }
      } catch {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [userId])

  return { isAdmin, loading }
}
