"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { GameBoard } from "@/app/connections/components/game-board"
import { DraftBadge, ReadyBadge } from "@/components/ui/status-badge"
import type { ConnectionsPuzzle } from "@/lib/types/connections"

export default function ConnectionsTestPage() {
  const searchParams = useSearchParams()
  const puzzleId = searchParams.get("puzzleId")

  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const fetchPuzzle = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    setPuzzle(null)

    try {
      const res = await fetch(`/api/admin/connections/puzzles/${id}`)
      if (!res.ok) {
        setError("Failed to load puzzle")
        return
      }
      const data = await res.json()
      // Add a mock date for the game components
      setPuzzle({
        ...data,
        date: new Date().toISOString().split("T")[0],
      })
    } catch {
      setError("Failed to load puzzle")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (puzzleId) {
      fetchPuzzle(puzzleId)
    } else {
      setLoading(false)
      setError("No puzzle ID provided")
    }
  }, [puzzleId, fetchPuzzle])

  const handleReset = () => {
    setResetKey((prev) => prev + 1)
  }

  const currentDate = puzzle?.date || new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Test mode banner */}
      <div className="border-b-3 border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Test Mode badge */}
        <span className="text-[10px] font-medium text-primary uppercase tracking-wide border border-primary/30 px-2 py-0.5 rounded-sm">
          Test Mode
        </span>

        {/* Center: Puzzle info */}
        {puzzle && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{puzzle.title || <span className="italic">Untitled</span>}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              {puzzle.createdBy && (
                <span>{puzzle.createdBy.username || puzzle.createdBy.email?.split("@")[0]}</span>
              )}
              {puzzle.status === "published" ? (
                <ReadyBadge>Ready</ReadyBadge>
              ) : (
                <DraftBadge>Draft</DraftBadge>
              )}
            </div>
          </div>
        )}

        {/* Right: Reset button */}
        {puzzle && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

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
              key={resetKey}
              puzzle={puzzle}
              currentDate={currentDate}
              onSelectDate={() => {}}
              testMode
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}
