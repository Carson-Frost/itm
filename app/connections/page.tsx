"use client"

import { useState, useEffect, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { GameBoard } from "./components/game-board"
import type { ConnectionsPuzzle } from "@/lib/types/connections"

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export default function ConnectionsPage() {
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState<string>(getTodayKey())

  const fetchPuzzle = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    setPuzzle(null)

    try {
      const isToday = date === getTodayKey()
      const url = isToday
        ? "/api/connections/today"
        : `/api/connections/puzzle?date=${date}`

      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 404) {
          const isToday = date === getTodayKey()
          setError(
            isToday
              ? "Connections is currently unavailable. Check back later!"
              : "No puzzle available for this date"
          )
        } else {
          setError("Failed to load puzzle")
        }
        return
      }
      const data = await res.json()
      setPuzzle(data)
    } catch {
      setError("Failed to load puzzle")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPuzzle(activeDate)
  }, [activeDate, fetchPuzzle])

  const handleDateSelect = (date: string) => {
    setActiveDate(date)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-2xl mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="grid grid-cols-4 gap-1 w-full max-w-lg mt-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 sm:h-20" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-lg font-semibold text-foreground mb-1">{error}</p>
            </div>
          ) : puzzle ? (
            <GameBoard
              puzzle={puzzle}
              currentDate={activeDate}
              onSelectDate={handleDateSelect}
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}
