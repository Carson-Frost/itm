"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

type SourceType = "calendar" | "backlog" | null

interface CommandStripProps {
  activePuzzle: ConnectionsPuzzle | null
  activeSource: SourceType
  tomorrowPuzzle: ConnectionsPuzzle | null
  tomorrowSource: SourceType
  onEditActive: () => void
  onEditOnDeck: () => void
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

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  calendar: { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  backlog: { label: "Backlog", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

function PuzzlePanel({
  label,
  puzzle,
  source,
  onEdit,
}: {
  label: string
  puzzle: ConnectionsPuzzle | null
  source: SourceType
  onEdit: () => void
}) {
  if (!puzzle) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
            Edit
          </Button>
        </div>
        <div className="border-3 border-dashed border-destructive p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-bold text-destructive">NO PUZZLE SCHEDULED</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Players will see an error</p>
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
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
          Edit
        </Button>
      </div>

      {/* Title + source badge */}
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-sm font-medium leading-tight truncate">
          {puzzle.title || <span className="italic text-muted-foreground">Untitled</span>}
        </p>
        {source && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${SOURCE_CONFIG[source].className}`}>
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
  onEditOnDeck,
}: CommandStripProps) {
  return (
    <div className="border-3 border-border grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
      {/* TODAY'S PUZZLE */}
      <PuzzlePanel
        label="TODAY'S PUZZLE"
        puzzle={activePuzzle}
        source={activeSource}
        onEdit={onEditActive}
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
        onEdit={onEditOnDeck}
      />
    </div>
  )
}
