"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { ConnectionsResult } from "@/lib/types/connections"

interface PuzzleCalendarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentDate: string
  onSelectDate: (date: string) => void
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function PuzzleCalendar({
  open,
  onOpenChange,
  currentDate,
  onSelectDate,
}: PuzzleCalendarProps) {
  const { user } = useAuth()
  const [history, setHistory] = useState<ConnectionsResult[]>([])

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  useEffect(() => {
    if (!open || !user) return

    async function fetchHistory() {
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
      }
    }
    fetchHistory()
  }, [open, user])

  // Build a map of date -> result
  const historyMap = useMemo(() => {
    const map = new Map<string, ConnectionsResult>()
    for (const r of history) {
      map.set(r.date, r)
    }
    return map
  }, [history])

  // Also check localStorage for game states
  const localStates = useMemo(() => {
    const map = new Map<string, { isComplete: boolean; solved: boolean }>()
    if (typeof window === "undefined") return map
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("connections-game-")) {
        const date = key.replace("connections-game-", "")
        try {
          const state = JSON.parse(localStorage.getItem(key) || "{}")
          if (state.isComplete) {
            map.set(date, { isComplete: true, solved: state.solved })
          }
        } catch {}
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleDayClick = (dateKey: string) => {
    onSelectDate(dateKey)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Puzzle History</DialogTitle>
        </DialogHeader>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-bold">{monthName}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div
              key={i}
              className="text-[10px] font-semibold text-muted-foreground text-center py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateKey = formatDateKey(viewYear, viewMonth, day)
            const isFuture = dateKey > todayKey
            const isToday = dateKey === todayKey
            const isCurrent = dateKey === currentDate

            // Check play status from server history + localStorage
            const serverResult = historyMap.get(dateKey)
            const localResult = localStates.get(dateKey)
            const hasPlayed = !!serverResult || !!localResult
            const hasSolved = serverResult?.solved ?? localResult?.solved ?? false

            // Block unplayed past dates (only allow today and played dates)
            const isPast = dateKey < todayKey
            const isDisabled = isFuture || (isPast && !hasPlayed)

            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateKey)}
                disabled={isDisabled}
                className={`
                  h-9 w-full flex flex-col items-center justify-center gap-0.5
                  text-xs transition-colors relative
                  ${isDisabled ? "text-muted-foreground/30 cursor-default" : "hover:bg-muted/50 cursor-pointer"}
                  ${isToday ? "font-bold text-primary" : ""}
                  ${isCurrent ? "bg-muted" : ""}
                `}
              >
                <span>{day}</span>
                {hasPlayed && (
                  <span
                    className={`h-1 w-1 rounded-full ${
                      hasSolved ? "bg-green-500" : "bg-destructive"
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
