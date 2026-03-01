"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import type { ConnectionsResult } from "@/lib/types/connections"

interface StatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

  // Sort by date ascending for streak calculation
  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date))

  let currentStreak = 0
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

  // Current streak: count from the end
  currentStreak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].solved) {
      currentStreak++
    } else {
      break
    }
  }

  return { played, winPct, currentStreak, maxStreak }
}

export function StatsDialog({ open, onOpenChange }: StatsDialogProps) {
  const { user } = useAuth()
  const [results, setResults] = useState<ConnectionsResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return

    async function fetchHistory() {
      setLoading(true)
      try {
        const idToken = await user!.getIdToken()
        const res = await fetch("/api/connections/history", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          setResults(data.results)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [open, user])

  const stats = useMemo(() => computeStats(results), [results])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Statistics</DialogTitle>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sign in to track your stats.
          </p>
        ) : loading ? (
          <div className="flex justify-center gap-6 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 text-center py-2">
            <StatItem label="Played" value={stats.played} />
            <StatItem label="Win %" value={stats.winPct} />
            <StatItem label="Current Streak" value={stats.currentStreak} />
            <StatItem label="Max Streak" value={stats.maxStreak} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">
        {label}
      </span>
    </div>
  )
}
