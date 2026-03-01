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
import { Search, X, ChevronRight, ChevronDown } from "lucide-react"
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
      <div className="flex gap-8 px-12 py-3 items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-12 py-3 text-xs text-destructive">
        Failed to load stats
      </div>
    )
  }

  if (!stats || stats.totalPlays === 0) {
    return (
      <div className="px-12 py-3 text-xs text-muted-foreground">
        No plays recorded
      </div>
    )
  }

  return (
    <div className="flex gap-8 px-12 py-3">
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

export function PuzzleList({ puzzles, calendar }: PuzzleListProps) {
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
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
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

        <div className="flex items-center gap-1.5">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-3 border-border bg-muted/30 text-xs">
              <th className="text-left px-4 py-2.5 font-semibold">Title</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell w-32">
                Categories
              </th>
              <th className="text-left px-4 py-2.5 font-semibold hidden lg:table-cell w-28">
                Author
              </th>
              <th className="text-left px-4 py-2.5 font-semibold w-24">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden lg:table-cell w-28">
                Created
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filteredPuzzles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  No puzzles found
                </td>
              </tr>
            ) : (
              filteredPuzzles.map((puzzle) => {
                const displayStatus = getDisplayStatus(puzzle)
                const isExpanded = expandedId === puzzle.id
                const hasStats = displayStatus === "Active" || displayStatus === "Played"
                const sorted = [...(puzzle.categories || [])].sort((a, b) => a.difficulty - b.difficulty)

                return (
                  <tr key={puzzle.id} className="border-b border-border/50 group">
                    <td colSpan={6} className="p-0">
                      {/* Main row */}
                      <div className="flex items-center hover:bg-muted/20 transition-colors">
                        {/* Title */}
                        <Link
                          href={`/admin/connections/${puzzle.id}`}
                          className="flex-1 px-4 py-2.5 font-medium truncate min-w-0"
                        >
                          {puzzle.title || (
                            <span className="text-muted-foreground italic">Untitled</span>
                          )}
                        </Link>

                        {/* Categories — vertical pills */}
                        <div className="px-4 py-2 hidden md:flex flex-col gap-px w-32 shrink-0">
                          {sorted.map((cat) => {
                            const colors = DIFFICULTY_COLORS[cat.difficulty]
                            return (
                              <span
                                key={cat.difficulty}
                                className={`${colors.bg} ${colors.text} text-[9px] font-bold px-1.5 py-px truncate block`}
                                title={cat.name}
                              >
                                {cat.name || "—"}
                              </span>
                            )
                          })}
                        </div>

                        {/* Author */}
                        <span className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:block w-28 truncate shrink-0">
                          {puzzle.createdBy?.email
                            ? getAuthorDisplay(puzzle.createdBy)
                            : "—"}
                        </span>

                        {/* Status */}
                        <span className="px-4 py-2.5 w-24 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getStatusBadgeClasses(displayStatus)}`}
                          >
                            {displayStatus}
                          </Badge>
                        </span>

                        {/* Created */}
                        <span className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:block w-28 shrink-0">
                          {puzzle.createdAt
                            ? new Date(puzzle.createdAt).toLocaleDateString()
                            : "—"}
                        </span>

                        {/* Action: expand stats OR navigate to editor */}
                        <div className="w-10 shrink-0 flex items-center justify-center">
                          {hasStats ? (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : puzzle.id)}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Show stats"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <Link
                              href={`/admin/connections/${puzzle.id}`}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit puzzle"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Expanded stats row */}
                      {isExpanded && hasStats && (
                        <div className="bg-muted/10 border-t border-border/30">
                          <InlineStats puzzleId={puzzle.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
