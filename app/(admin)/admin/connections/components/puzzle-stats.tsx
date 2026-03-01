"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

interface StatsData {
  totalPlays: number
  completionRate: number
  avgMistakes: number
  solveOrderFrequency: Record<string, number>
}

interface PuzzleStatsProps {
  puzzleId: string
}

export function PuzzleStats({ puzzleId }: PuzzleStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/admin/connections/puzzles/${puzzleId}/stats`
        )
        if (res.ok) {
          setStats(await res.json())
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [puzzleId])

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">Analytics</h2>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats || stats.totalPlays === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">Analytics</h2>
        <p className="text-sm text-muted-foreground">No plays yet.</p>
      </div>
    )
  }

  // Parse solve order frequency into sorted entries
  const solveOrders = Object.entries(stats.solveOrderFrequency)
    .map(([key, count]) => ({
      order: key.split(",").map(Number),
      count,
      percentage: Math.round((count / stats.totalPlays) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Analytics</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border-3 border-border p-4">
          <p className="text-xs text-muted-foreground font-semibold mb-1">
            TOTAL PLAYS
          </p>
          <p className="text-2xl font-bold">{stats.totalPlays}</p>
        </div>
        <div className="border-3 border-border p-4">
          <p className="text-xs text-muted-foreground font-semibold mb-1">
            COMPLETION RATE
          </p>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
        </div>
        <div className="border-3 border-border p-4">
          <p className="text-xs text-muted-foreground font-semibold mb-1">
            AVG MISTAKES
          </p>
          <p className="text-2xl font-bold">{stats.avgMistakes}</p>
        </div>
      </div>

      {solveOrders.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-3">
            MOST COMMON SOLVE ORDERS
          </p>
          <div className="flex flex-col gap-2">
            {solveOrders.map(({ order, count, percentage }) => (
              <div key={order.join(",")} className="flex items-center gap-3">
                <div className="flex gap-1">
                  {order.map((d, i) => {
                    const colors = DIFFICULTY_COLORS[d]
                    return (
                      <span
                        key={i}
                        className={`${colors.bg} ${colors.text} text-xs font-bold w-6 h-6 flex items-center justify-center`}
                      >
                        {d}
                      </span>
                    )
                  })}
                </div>
                <div className="flex-1 h-4 bg-muted relative">
                  <div
                    className="h-full bg-primary/30 absolute left-0 top-0"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
