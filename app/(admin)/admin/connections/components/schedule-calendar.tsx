"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { PuzzleCategoryStack, MiniCategoryPills } from "./puzzle-category-stack"

interface ScheduleCalendarProps {
  calendar: Record<string, string>
  puzzles: ConnectionsPuzzle[]
  onAssign: (date: string, puzzleId: string | null) => void
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function ScheduleCalendar({
  calendar,
  puzzles,
  onAssign,
}: ScheduleCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const puzzleMap = useMemo(() => {
    const map = new Map<string, ConnectionsPuzzle>()
    for (const p of puzzles) {
      map.set(p.id, p)
    }
    return map
  }, [puzzles])

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

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const isPastDate = (dateKey: string) => dateKey < todayKey

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-bold">{monthName}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-xs font-semibold text-muted-foreground text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border/50">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-background h-24" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateKey = formatDateKey(viewYear, viewMonth, day)
          const puzzleId = calendar[dateKey]
          const puzzle = puzzleId ? puzzleMap.get(puzzleId) : null
          const isToday = dateKey === todayKey

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateKey)}
              className={`
                bg-background h-24 p-1.5 text-left flex flex-col cursor-pointer
                transition-colors hover:ring-1 hover:ring-primary hover:ring-inset
                ${isToday ? "ring-2 ring-primary ring-inset" : ""}
              `}
            >
              <span
                className={`text-xs font-medium ${
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {day}
              </span>
              {puzzle && (
                <div className="mt-1 w-full px-0.5">
                  <MiniCategoryPills puzzle={puzzle} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Assign dialog */}
      <Dialog
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                    "default",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {selectedDate && calendar[selectedDate] && (
              <Link href={`/admin/connections/${calendar[selectedDate]}`}>
                <Button variant="outline" className="justify-start w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Editor
                </Button>
              </Link>
            )}

            {selectedDate && calendar[selectedDate] && !isPastDate(selectedDate) && (
              <Button
                variant="outline"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  onAssign(selectedDate, null)
                  setSelectedDate(null)
                }}
              >
                Clear Assignment
              </Button>
            )}

            {selectedDate && isPastDate(selectedDate) && (
              <p className="text-xs text-muted-foreground py-2">
                Past dates cannot be modified.
              </p>
            )}

            {selectedDate && !isPastDate(selectedDate) && (
              <>
                {puzzles.map((puzzle) => {
                  const isAssigned = calendar[selectedDate] === puzzle.id
                  return (
                    <button
                      key={puzzle.id}
                      className={`border-3 p-3 text-left transition-colors hover:bg-muted/20 ${
                        isAssigned
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => {
                        onAssign(selectedDate, puzzle.id)
                        setSelectedDate(null)
                      }}
                    >
                      <PuzzleCategoryStack puzzle={puzzle} />
                    </button>
                  )
                })}

                {puzzles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No published puzzles available
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
