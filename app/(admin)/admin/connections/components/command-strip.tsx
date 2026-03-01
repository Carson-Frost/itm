"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

type SourceType = "calendar" | "stack" | "fallback" | null

interface CommandStripProps {
  activePuzzle: ConnectionsPuzzle | null
  activeSource: SourceType
  tomorrowPuzzle: ConnectionsPuzzle | null
  tomorrowSource: SourceType
  onEditActive: () => void
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return timeLeft
}

const SOURCE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  calendar: { label: "Scheduled", variant: "default" },
  stack: { label: "From Stack", variant: "secondary" },
  fallback: { label: "Fallback", variant: "destructive" },
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

function PuzzlePanel({
  label,
  puzzle,
  source,
  editAction,
}: {
  label: string
  puzzle: ConnectionsPuzzle | null
  source: SourceType
  editAction?: { type: "button"; onClick: () => void } | { type: "link"; href: string }
}) {
  if (!puzzle) {
    return (
      <div className="p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">{label}</p>
        <div className="border-3 border-dashed border-destructive/30 p-3 text-center">
          <p className="text-sm font-medium text-destructive">No Puzzle</p>
          <p className="text-[10px] text-muted-foreground">Add puzzles to the calendar or stack</p>
        </div>
      </div>
    )
  }

  const sorted = [...(puzzle.categories || [])].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {label === "TODAY'S PUZZLE" && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          )}
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        </div>
        {editAction && (
          editAction.type === "button" ? (
            <button
              onClick={editAction.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href={editAction.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          )
        )}
      </div>

      {/* Title + source badge */}
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-sm font-medium leading-tight truncate">
          {puzzle.title || <span className="italic text-muted-foreground">Untitled</span>}
        </p>
        {source && (
          <Badge variant={SOURCE_CONFIG[source].variant} className="text-[10px] shrink-0">
            {SOURCE_CONFIG[source].label}
          </Badge>
        )}
      </div>

      {/* Author */}
      {puzzle.createdBy?.email && (
        <p className="text-[11px] text-muted-foreground mb-2 truncate">
          {getAuthorDisplay(puzzle.createdBy)}
        </p>
      )}

      {/* Category pills — 2x2 grid */}
      <div className="grid grid-cols-2 gap-1">
        {sorted.map((cat) => {
          const colors = DIFFICULTY_COLORS[cat.difficulty]
          return (
            <span
              key={cat.difficulty}
              className={`${colors.bg} ${colors.text} px-2 py-0.5 text-[11px] font-semibold truncate block`}
            >
              {cat.name || "—"}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function CommandStrip({
  activePuzzle,
  activeSource,
  tomorrowPuzzle,
  tomorrowSource,
  onEditActive,
}: CommandStripProps) {
  return (
    <div className="border-3 border-border grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
      {/* TODAY'S PUZZLE */}
      <PuzzlePanel
        label="TODAY'S PUZZLE"
        puzzle={activePuzzle}
        source={activeSource}
        editAction={activePuzzle ? { type: "button", onClick: onEditActive } : undefined}
      />

      {/* COUNTDOWN */}
      <div className="p-4 flex flex-col items-center justify-center">
        <p className="text-xs font-semibold text-muted-foreground mb-1">RESET COUNTDOWN</p>
        <p className="text-3xl font-mono font-bold tracking-wider">
          <Countdown />
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date().toLocaleDateString("default", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ON DECK */}
      <PuzzlePanel
        label="ON DECK"
        puzzle={tomorrowPuzzle}
        source={tomorrowSource}
        editAction={tomorrowPuzzle ? { type: "link", href: `/admin/connections/${tomorrowPuzzle.id}` } : undefined}
      />
    </div>
  )
}
