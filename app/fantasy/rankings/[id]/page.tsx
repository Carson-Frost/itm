"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { RankingEditor } from "../components/ranking-editor"
import { UserRanking, RankedPlayer, TierSeparator } from "@/lib/types/ranking-schemas"

export default function EditRanking() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [ranking, setRanking] = useState<UserRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved")

  useEffect(() => {
    async function fetchRanking() {
      if (!user || !id) {
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, "users", user.uid, "rankings", id)
        const snapshot = await getDoc(docRef)

        if (snapshot.exists()) {
          setRanking({
            id: snapshot.id,
            ...snapshot.data(),
          } as UserRanking)
        } else {
          router.push("/fantasy/rankings")
        }
      } catch {
        router.push("/fantasy/rankings")
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchRanking()
    }
  }, [user, authLoading, id, router])

  const saveRanking = useCallback(
    async (updates: Partial<UserRanking>) => {
      if (!user || !id) return

      setSaveStatus("saving")
      try {
        const docRef = doc(db, "users", user.uid, "rankings", id)
        await updateDoc(docRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    },
    [user, id]
  )

  const handleSettingsSave = useCallback(
    (updates: Partial<UserRanking>) => {
      setRanking((prev) => prev ? { ...prev, ...updates } : prev)
      saveRanking(updates)
    },
    [saveRanking]
  )

  const handlePlayersChange = useCallback(
    (players: RankedPlayer[]) => {
      setRanking((prev) => prev ? { ...prev, players } : prev)
      saveRanking({ players })
    },
    [saveRanking]
  )

  const handleTiersChange = useCallback(
    (tiers: TierSeparator[]) => {
      setRanking((prev) => prev ? { ...prev, tiers } : prev)
      saveRanking({ tiers })
    },
    [saveRanking]
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/fantasy/rankings")
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 relative z-0">
          <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-10 w-64 mb-6" />
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!ranking) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <RankingEditor
            ranking={ranking}
            saveStatus={saveStatus}
            onSettingsSave={handleSettingsSave}
            onPlayersChange={handlePlayersChange}
            onTiersChange={handleTiersChange}
          />
        </div>
      </main>
    </div>
  )
}
