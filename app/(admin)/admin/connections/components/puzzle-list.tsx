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
import { ChevronRight, ChevronDown, Pencil, Search, X } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { PuzzleCategoryStack } from "./puzzle-category-stack"

interface StatsData {
  totalPlays: number
  completionRate: number
  avgMistakes: number
}

type DisplayStatus = "Draft" | "Published" | "Active" | "Played"

interface PuzzleListProps {
  puzzles: ConnectionsPuzzle[]
  calendar: Record<string, string>
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function InlineStats({ puzzleId }: { puzzleId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/admin/connections/puzzles/${puzzleId}/stats`
        )
        if (res.ok) setStats(await res.json())
      } catch {}
      setLoading(false)
    }
    fetchStats()
  }, [puzzleId])

  if (loading) {
    return (
      <div className="flex gap-8 px-4 py-3 items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    )
  }

  if (!stats || stats.totalPlays === 0) {
    return (
      <div className="px-4 py-3 text-xs text-muted-foreground">
        No plays recorded
      </div>
    )
  }

  return (
    <div className="flex gap-8 px-4 py-3">
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">PLAYS</span>
        <p className="text-sm font-bold tabular-nums">{stats.totalPlays}</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">COMPLETION</span>
        <p className="text-sm font-bold tabular-nums">{stats.completionRate}%</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground">AVG MISTAKES</span>
        <p className="text-sm font-bold tabular-nums">{stats.avgMistakes}</p>
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

export function PuzzleList({ puzzles, calendar }: PuzzleListProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created")
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

  function getDisplayStatus(puzzle: ConnectionsPuzzle): DisplayStatus {
    if (puzzle.status === "draft") return "Draft"
    if (puzzle.id === activePuzzleId) return "Active"
    if (pastCalendarPuzzleIds.has(puzzle.id)) return "Played"
    return "Published"
  }

  const filteredPuzzles = useMemo(() => {
    let result = puzzles

    // Status filter
    if (statusFilter === "draft") {
      result = result.filter((p) => p.status === "draft")
    } else if (statusFilter === "published") {
      result = result.filter((p) => p.status === "published" && p.id !== activePuzzleId && !pastCalendarPuzzleIds.has(p.id))
    } else if (statusFilter === "active") {
      result = result.filter((p) => p.id === activePuzzleId)
    } else if (statusFilter === "played") {
      result = result.filter((p) => p.status === "published" && pastCalendarPuzzleIds.has(p.id) && p.id !== activePuzzleId)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.createdBy?.email || "").toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortBy === "title") {
      result = [...result].sort((a, b) => (a.title || "").localeCompare(b.title || ""))
    } else if (sortBy === "status") {
      const order: Record<DisplayStatus, number> = { Active: 0, Draft: 1, Published: 2, Played: 3 }
      result = [...result].sort((a, b) => order[getDisplayStatus(a)] - order[getDisplayStatus(b)])
    } else {
      // created (newest first)
      result = [...result].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    }

    return result
  }, [puzzles, statusFilter, sortBy, searchQuery, activePuzzleId, pastCalendarPuzzleIds])

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">All Puzzles</h2>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-4">
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

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

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

      {/* Puzzle rows */}
      <div className="flex flex-col gap-0 border-3 border-border">
        {filteredPuzzles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No puzzles found
          </div>
        ) : (
          filteredPuzzles.map((puzzle) => {
            const displayStatus = getDisplayStatus(puzzle)
            const isStatsExpandable = displayStatus === "Active" || displayStatus === "Played"
            const isExpanded = expandedId === puzzle.id

            return (
              <div
                key={puzzle.id}
                className="border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                  {/* Stats toggle or spacer */}
                  <div className="w-4 shrink-0">
                    {isStatsExpandable && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : puzzle.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Category stack with title + author — clickable link to editor */}
                  <Link
                    href={`/admin/connections/${puzzle.id}`}
                    className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  >
                    <PuzzleCategoryStack puzzle={puzzle} showAuthor={false} />
                  </Link>

                  {/* Status badge */}
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${getStatusBadgeClasses(displayStatus)}`}
                  >
                    {displayStatus}
                  </Badge>

                  {/* Action: Edit for Draft/Published, nothing for Active/Played (they have stats toggle) */}
                  {(displayStatus === "Draft" || displayStatus === "Published") ? (
                    <Link
                      href={`/admin/connections/${puzzle.id}`}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <div className="w-3.5 shrink-0" />
                  )}
                </div>

                {/* Expanded stats */}
                {isExpanded && isStatsExpandable && (
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
