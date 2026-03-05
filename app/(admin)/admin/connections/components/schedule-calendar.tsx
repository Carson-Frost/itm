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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, X as XIcon } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import { PuzzleCategoryStack } from "./puzzle-category-stack"

interface ScheduleCalendarProps {
  calendar: Record<string, string>
  puzzles: ConnectionsPuzzle[]
  onAssign: (date: string, puzzleId: string | null) => void
  onRequestChange: (date: string) => void
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

export function ScheduleCalendar({
  calendar,
  puzzles,
  onAssign,
  onRequestChange,
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
  const isDialogOpen = !!selectedDate

  // Dialog data
  const selectedPuzzle = selectedDate && calendar[selectedDate]
    ? puzzleMap.get(calendar[selectedDate]) ?? null
    : null
  const selectedIsPast = selectedDate ? isPastDate(selectedDate) : false

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
      <div className="grid grid-cols-7 gap-px border-3 border-border/50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-background text-xs font-semibold text-muted-foreground text-center py-2"
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

          const dayCell = (
            <button
              key={day}
              onClick={() => setSelectedDate(dateKey)}
              className={`
                bg-background h-24 p-1.5 text-left flex flex-col cursor-pointer w-full
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
                <div className="mt-1 w-full min-w-0">
                  <p className="text-[11px] font-medium leading-tight truncate">
                    {puzzle.title || <span className="italic text-muted-foreground">Untitled</span>}
                  </p>
                  {puzzle.createdBy?.email && (
                    <p className="text-[9px] text-muted-foreground leading-tight truncate mt-px">
                      {getAuthorDisplay(puzzle.createdBy)}
                    </p>
                  )}
                </div>
              )}
            </button>
          )

          // Don't render hover cards when dialog is open
          if (!puzzle || isDialogOpen) return dayCell

          const sorted = [...(puzzle.categories || [])].sort((a, b) => a.difficulty - b.difficulty)
          const dateLabel = new Date(dateKey + "T12:00:00").toLocaleDateString("default", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })

          return (
            <HoverCard key={day} openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                {dayCell}
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-72 p-0 border-3 border-border"
              >
                {/* Header */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {puzzle.title || <span className="italic text-muted-foreground">Untitled</span>}
                    </p>
                    <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                      {isToday ? "Today" : dateLabel}
                    </Badge>
                  </div>
                  {puzzle.createdBy?.email && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {getAuthorDisplay(puzzle.createdBy)}
                    </p>
                  )}
                </div>

                {/* Categories with players */}
                <div className="flex flex-col">
                  {sorted.map((cat) => {
                    const colors = DIFFICULTY_COLORS[cat.difficulty]
                    return (
                      <div key={cat.difficulty} className="border-t border-border">
                        <div className={`${colors.bg} ${colors.text} px-3 py-1`}>
                          <p className="text-[11px] font-bold">{cat.name || "—"}</p>
                        </div>
                        <div className="px-3 py-1.5">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {cat.players?.map((p) => p.name).join(", ") || "No players"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        })}

        {/* Empty cells to complete the last row */}
        {(() => {
          const totalCells = firstDay + daysInMonth
          const remainingCells = (7 - (totalCells % 7)) % 7
          return Array.from({ length: remainingCells }).map((_, i) => (
            <div key={`after-${i}`} className="bg-background h-24" />
          ))
        })()}
      </div>

      {/* Day management dialog */}
      <Dialog
        open={isDialogOpen}
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

          <div className="flex flex-col gap-4">
            {/* Puzzle info block */}
            {selectedPuzzle ? (
              <div className="border-3 border-border p-3">
                <PuzzleCategoryStack puzzle={selectedPuzzle} />
              </div>
            ) : (
              <div className="border-3 border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No puzzle scheduled</p>
              </div>
            )}

            {/* Actions */}
            {selectedIsPast ? (
              <>
                <p className="text-xs text-muted-foreground">Past dates cannot be modified.</p>
                {selectedPuzzle && (
                  <Link href={`/admin/connections/${selectedPuzzle.id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Puzzle
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedPuzzle ? (
                  <>
                    <Link href={`/admin/connections/${selectedPuzzle.id}`}>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Edit Puzzle
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        if (!selectedDate) return
                        setSelectedDate(null)
                        onRequestChange(selectedDate)
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Puzzle
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!selectedDate) return
                        onAssign(selectedDate, null)
                        setSelectedDate(null)
                      }}
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Remove Puzzle
                    </Button>
                  </>
                ) : (
                  <Button
                    className="btn-chamfer"
                    onClick={() => {
                      if (!selectedDate) return
                      setSelectedDate(null)
                      onRequestChange(selectedDate)
                    }}
                  >
                    Assign Puzzle
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
