"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import type { ConnectionsCategory, ConnectionsResult } from "@/lib/types/connections"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface GameResultsProps {
  solved: boolean
  mistakes: number
  solveOrder: number[]
  guessHistory: number[][]
  categories: ConnectionsCategory[]
  date: string
}

const EMOJI_MAP: Record<number, string> = {
  1: "\ud83d\udfe8", // yellow square
  2: "\ud83d\udfe9", // green square
  3: "\ud83d\udfe6", // blue square
  4: "\ud83d\udfea", // purple square
}

const SQUARE_COLORS: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-green-500",
  3: "bg-blue-500",
  4: "bg-purple-600",
}

function getResultMessage(solved: boolean, mistakes: number): string {
  if (!solved) return "Next Time!"
  if (mistakes === 0) return "Perfect!"
  if (mistakes === 1) return "Great!"
  if (mistakes === 2) return "Solid!"
  return "Phew!"
}

interface Stats {
  played: number
  winPct: number
  currentStreak: number
  maxStreak: number
}

function computeStats(results: ConnectionsResult[]): Stats {
  if (results.length === 0) {
    return { played: 0, winPct: 0, currentStreak: 0, maxStreak: 0 }
  }

  const played = results.length
  const wins = results.filter((r) => r.solved).length
  const winPct = Math.round((wins / played) * 100)

  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date))

  let maxStreak = 0
  let streak = 0

  for (const r of sorted) {
    if (r.solved) {
      streak++
      maxStreak = Math.max(maxStreak, streak)
    } else {
      streak = 0
    }
  }

  let currentStreak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].solved) {
      currentStreak++
    } else {
      break
    }
  }

  return { played, winPct, currentStreak, maxStreak }
}

export function GameResults({
  solved,
  mistakes,
  solveOrder,
  guessHistory,
  categories,
  date,
}: GameResultsProps) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [countdown, setCountdown] = useState("")
  const [history, setHistory] = useState<ConnectionsResult[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      )
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch history for stats
  useEffect(() => {
    if (!user) return

    async function fetchHistory() {
      setLoadingStats(true)
      try {
        const idToken = await user!.getIdToken()
        const res = await fetch("/api/connections/history", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          setHistory(data.results)
        }
      } catch {
        // silently fail
      } finally {
        setLoadingStats(false)
      }
    }
    fetchHistory()
  }, [user])

  const stats = useMemo(() => computeStats(history), [history])

  // Build emoji grid for clipboard
  const emojiGrid = guessHistory
    .map((guess) => guess.map((d) => EMOJI_MAP[d] || "\u2b1c").join(""))
    .join("\n")

  const shareText = `ITM Connections ${date}\n\n${emojiGrid}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const resultMessage = getResultMessage(solved, mistakes)

  return (
    <>
      {/* Inline fallback when dialog is closed */}
      {!isOpen && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <p className="text-sm text-muted-foreground">
            {resultMessage} — {solved ? `${mistakes} mistake${mistakes !== 1 ? "s" : ""}` : "Better luck next time"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              View Results
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Next puzzle in</p>
            <p className="text-lg font-mono font-bold">{countdown}</p>
          </div>
        </div>
      )}

      {/* Results dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{resultMessage}</DialogTitle>
          </DialogHeader>

          <Separator />

          {/* Stats row */}
          {user && (
            <>
              {loadingStats ? (
                <div className="flex justify-center gap-6 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-8" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 text-center py-1">
                  <StatItem label="Played" value={stats.played} />
                  <StatItem label="Win %" value={stats.winPct} />
                  <StatItem label="Current Streak" value={stats.currentStreak} />
                  <StatItem label="Max Streak" value={stats.maxStreak} />
                </div>
              )}

              <Separator />
            </>
          )}

          {/* Emoji grid as colored squares */}
          <div className="flex flex-col items-center gap-1 py-2">
            {guessHistory.map((guess, rowIdx) => (
              <div key={rowIdx} className="flex gap-1">
                {guess.map((d, colIdx) => (
                  <div
                    key={colIdx}
                    className={`h-6 w-6 ${SQUARE_COLORS[d] || "bg-muted"}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Share button */}
          <Button className="btn-chamfer w-full" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Share Your Results"}
          </Button>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Next puzzle in</p>
            <p className="text-lg font-mono font-bold">{countdown}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">
        {label}
      </span>
    </div>
  )
}
