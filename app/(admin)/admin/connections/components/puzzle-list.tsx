"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, ChevronUp, ChevronDown, Pencil } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

interface StatsData {
  totalPlays: number
  completionRate: number
  avgMistakes: number
}

type DisplayStatus = "Draft" | "Published" | "Active" | "Played"

interface PuzzleListProps {
  puzzles: ConnectionsPuzzle[]
  calendar: Record<string, string>
  stack: string[]
  stackPointer: number
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function InlineStats({ puzzleId }: { puzzleId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/admin/connections/puzzles/${puzzleId}/stats`
        )
        if (res.ok) {
          setStats(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    fetchStats()
  }, [puzzleId])

  if (loading) {
    return (
      <div className="flex gap-8 px-6 py-3 items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-3 text-xs text-destructive">
        Failed to load stats
      </div>
    )
  }

  if (!stats || stats.totalPlays === 0) {
    return (
      <div className="px-6 py-3 text-xs text-muted-foreground">
        No plays recorded
      </div>
    )
  }

  return (
    <div className="flex gap-8 px-6 py-3">
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">PLAYS</span>
        <p className="text-sm font-bold">{stats.totalPlays}</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">COMPLETION</span>
        <p className="text-sm font-bold">{stats.completionRate}%</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">AVG MISTAKES</span>
        <p className="text-sm font-bold">{stats.avgMistakes}</p>
      </div>
    </div>
  )
}

function getStatusBadgeClasses(status: DisplayStatus): string {
  switch (status) {
    case "Active":
      return "bg-primary/10 text-primary border-primary/30"
    case "Played":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
    case "Published":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
    case "Draft":
      return "bg-muted text-muted-foreground border-border"
  }
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function PuzzleList({ puzzles, calendar, stack, stackPointer }: PuzzleListProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [authorFilter, setAuthorFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const todayKey = useMemo(getTodayKey, [])

  const activePuzzleId = calendar[todayKey] || null

  const pastCalendarPuzzleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [date, puzzleId] of Object.entries(calendar)) {
      if (date < todayKey) {
        ids.add(puzzleId)
      }
    }
    return ids
  }, [calendar, todayKey])

  // Build a map from puzzleId -> scheduled info
  const scheduledMap = useMemo(() => {
    const map = new Map<string, string>()

    // Calendar assignments — find the next scheduled date for each puzzle
    for (const [date, puzzleId] of Object.entries(calendar)) {
      if (date >= todayKey) {
        const existing = map.get(puzzleId)
        // Keep the earliest future date
        if (!existing || !existing.startsWith("Stack")) {
          const d = new Date(date + "T00:00:00")
          map.set(puzzleId, d.toLocaleDateString("default", { month: "short", day: "numeric" }))
        }
      }
    }

    // Stack positions (only items at or after stackPointer)
    for (let i = stackPointer; i < stack.length; i++) {
      const puzzleId = stack[i]
      if (!map.has(puzzleId)) {
        const position = i - stackPointer + 1
        map.set(puzzleId, `${getOrdinal(position)} in Stack`)
      }
    }

    return map
  }, [calendar, stack, stackPointer, todayKey])

  // Build unique author list for the author filter dropdown
  const authorOptions = useMemo(() => {
    const authors = new Map<string, string>() // uid -> display name
    for (const p of puzzles) {
      if (p.createdBy?.uid) {
        authors.set(p.createdBy.uid, getAuthorDisplay(p.createdBy))
      }
    }
    return Array.from(authors.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
  }, [puzzles])

  function getDisplayStatus(puzzle: ConnectionsPuzzle): DisplayStatus {
    if (puzzle.status === "draft") return "Draft"
    if (puzzle.id === activePuzzleId) return "Active"
    if (pastCalendarPuzzleIds.has(puzzle.id)) return "Played"
    return "Published"
  }

  const filteredPuzzles = useMemo(() => {
    let result = puzzles

    if (statusFilter === "draft") {
      result = result.filter((p) => p.status === "draft")
    } else if (statusFilter === "published") {
      result = result.filter((p) => p.status === "published" && p.id !== activePuzzleId && !pastCalendarPuzzleIds.has(p.id))
    } else if (statusFilter === "active") {
      result = result.filter((p) => p.id === activePuzzleId)
    } else if (statusFilter === "played") {
      result = result.filter((p) => p.status === "published" && pastCalendarPuzzleIds.has(p.id) && p.id !== activePuzzleId)
    }

    if (authorFilter !== "all") {
      result = result.filter((p) => p.createdBy?.uid === authorFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        getAuthorDisplay(p.createdBy || { email: "" }).toLowerCase().includes(q)
      )
    }

    // Newest first
    result = [...result].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    return result
  }, [puzzles, statusFilter, authorFilter, searchQuery, activePuzzleId, pastCalendarPuzzleIds])

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-end gap-3 mb-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground">STATUS</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="played">Played</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground">AUTHOR</label>
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {authorOptions.map(([uid, name]) => (
                <SelectItem key={uid} value={uid}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            autoComplete="off"
            className="pl-8 h-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border-3 border-border">
        {filteredPuzzles.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No puzzles found
          </div>
        ) : (
          filteredPuzzles.map((puzzle) => {
            const displayStatus = getDisplayStatus(puzzle)
            const isExpanded = expandedId === puzzle.id
            const hasStats = displayStatus === "Active" || displayStatus === "Played"
            const isEditable = displayStatus === "Draft" || displayStatus === "Published"
            const sorted = [...(puzzle.categories || [])].sort((a, b) => a.difficulty - b.difficulty)
            const scheduled = scheduledMap.get(puzzle.id)

            return (
              <div key={puzzle.id} className="border-b border-border/50 group/row">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-4 hover:bg-muted/20 transition-colors">
                  {/* Left: title block with author + status below */}
                  <div className="w-44 shrink-0 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/connections/${puzzle.id}`}
                        className="text-sm font-medium truncate hover:underline"
                      >
                        {puzzle.title || (
                          <span className="text-muted-foreground italic">Untitled</span>
                        )}
                      </Link>
                      {isEditable && (
                        <Link
                          href={`/admin/connections/${puzzle.id}`}
                          className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate">
                        {puzzle.createdBy?.email
                          ? getAuthorDisplay(puzzle.createdBy)
                          : "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] leading-none py-0 px-1.5 ${getStatusBadgeClasses(displayStatus)}`}
                      >
                        {displayStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Date Created */}
                  <div className="hidden lg:block w-20 shrink-0">
                    <p className="text-[10px] font-semibold text-muted-foreground">CREATED</p>
                    <p className="text-xs text-muted-foreground">
                      {puzzle.createdAt
                        ? new Date(puzzle.createdAt).toLocaleDateString("default", { month: "short", day: "numeric" })
                        : "—"}
                    </p>
                  </div>

                  {/* Scheduled */}
                  <div className="hidden lg:block w-24 shrink-0">
                    <p className="text-[10px] font-semibold text-muted-foreground">SCHEDULED</p>
                    <p className="text-xs text-muted-foreground">
                      {displayStatus === "Active"
                        ? "Today"
                        : scheduled || "None"}
                    </p>
                  </div>

                  {/* Categories — 2x2 grid */}
                  <div className="hidden md:grid grid-cols-2 gap-1 flex-1 min-w-0">
                    {sorted.map((cat) => {
                      const colors = DIFFICULTY_COLORS[cat.difficulty]
                      return (
                        <span
                          key={cat.difficulty}
                          className={`${colors.bg} ${colors.text} text-[11px] font-bold px-2 py-1 truncate block`}
                          title={cat.name}
                        >
                          {cat.name || "—"}
                        </span>
                      )
                    })}
                  </div>

                  {/* Action: expand stats */}
                  {hasStats ? (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : puzzle.id)}
                      className="w-8 h-8 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                      title={isExpanded ? "Hide stats" : "Show stats"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                </div>

                {/* Expanded stats row */}
                {isExpanded && hasStats && (
                  <div className="bg-muted/10 border-t border-border/30">
                    <InlineStats puzzleId={puzzle.id} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
