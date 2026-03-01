"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { ChevronRight, ChevronDown, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

interface StatsData {
  totalPlays: number
  completionRate: number
  avgMistakes: number
}

interface PuzzleTableDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar: Record<string, string>
}

function getAuthorUsername(email: string): string {
  return email.split("@")[0]
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

function getPuzzleStatus(
  puzzle: ConnectionsPuzzle,
  pastCalendarPuzzleIds: Set<string>
): "Draft" | "Published" | "Played" {
  if (puzzle.status === "draft") return "Draft"
  if (pastCalendarPuzzleIds.has(puzzle.id)) return "Played"
  return "Published"
}

export function PuzzleTableDrawer({ open, onOpenChange, calendar }: PuzzleTableDrawerProps) {
  const [puzzles, setPuzzles] = useState<ConnectionsPuzzle[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConnectionsPuzzle | null>(null)

  // Compute which puzzle IDs have been assigned to past dates
  const pastCalendarPuzzleIds = useMemo(() => {
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const ids = new Set<string>()
    for (const [date, puzzleId] of Object.entries(calendar)) {
      if (date <= todayKey) {
        ids.add(puzzleId)
      }
    }
    return ids
  }, [calendar])

  const fetchPuzzles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter === "draft" || statusFilter === "published") {
        params.set("status", statusFilter)
      }
      const res = await fetch(`/api/admin/connections/puzzles?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPuzzles(data.puzzles)
      }
    } catch {
      toast.error("Failed to fetch puzzles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchPuzzles()
  }, [open, statusFilter])

  // Client-side filter for "played" status
  const filteredPuzzles = useMemo(() => {
    if (statusFilter === "played") {
      return puzzles.filter(
        (p) => p.status === "published" && pastCalendarPuzzleIds.has(p.id)
      )
    }
    return puzzles
  }, [puzzles, statusFilter, pastCalendarPuzzleIds])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(
        `/api/admin/connections/puzzles/${deleteTarget.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Puzzle deleted")
      setDeleteTarget(null)
      fetchPuzzles()
    } catch {
      toast.error("Failed to delete puzzle")
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-xl font-bold">All Puzzles</DrawerTitle>
          </DrawerHeader>

          {/* Controls row */}
          <div className="flex items-center justify-between px-4 pb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="played">Played</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/admin/connections/new" onClick={() => onOpenChange(false)}>
              <Button className="btn-chamfer">
                <Plus className="h-4 w-4 mr-2" />
                New Puzzle
              </Button>
            </Link>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="border-3 border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-3 border-border bg-muted/30">
                    <th className="w-8" />
                    <th className="text-left px-4 py-2 font-semibold">Title</th>
                    <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                      Categories
                    </th>
                    <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">
                      Author
                    </th>
                    <th className="text-left px-4 py-2 font-semibold w-24">Status</th>
                    <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell w-28">
                      Created
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-2 py-3" />
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-48" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-2 py-3" />
                        </tr>
                      ))
                    : filteredPuzzles.map((puzzle) => {
                        const isExpanded = expandedId === puzzle.id
                        const displayStatus = getPuzzleStatus(puzzle, pastCalendarPuzzleIds)
                        const isExpandable = displayStatus === "Played" || puzzle.status === "published"
                        return (
                          <tr key={puzzle.id} className="border-b border-border/50 group">
                            <td colSpan={7} className="p-0">
                              {/* Main row */}
                              <div className="flex items-center hover:bg-muted/20 transition-colors">
                                <button
                                  onClick={() =>
                                    setExpandedId(isExpanded ? null : puzzle.id)
                                  }
                                  className="px-2 py-2.5 text-muted-foreground hover:text-foreground"
                                  title={isExpandable ? "Show stats" : ""}
                                  disabled={!isExpandable}
                                >
                                  {isExpandable ? (
                                    isExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )
                                  ) : (
                                    <span className="inline-block w-3.5" />
                                  )}
                                </button>

                                <Link
                                  href={`/admin/connections/${puzzle.id}`}
                                  onClick={() => onOpenChange(false)}
                                  className="flex-1 flex items-center min-w-0"
                                >
                                  <span className="px-4 py-2.5 font-medium flex-1 text-left truncate">
                                    {puzzle.title || (
                                      <span className="text-muted-foreground italic">
                                        Untitled
                                      </span>
                                    )}
                                  </span>

                                  <span className="px-4 py-2.5 hidden md:flex gap-1 flex-wrap flex-1">
                                    {puzzle.categories?.map((cat) => {
                                      const colors = DIFFICULTY_COLORS[cat.difficulty]
                                      return (
                                        <span
                                          key={cat.difficulty}
                                          className={`${colors.bg} ${colors.text} text-xs font-bold px-2 py-0.5 truncate max-w-[100px]`}
                                          title={cat.name}
                                        >
                                          {cat.name || "—"}
                                        </span>
                                      )
                                    })}
                                  </span>

                                  <span className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:block w-28 truncate text-left">
                                    {puzzle.createdBy?.email
                                      ? getAuthorUsername(puzzle.createdBy.email)
                                      : "—"}
                                  </span>

                                  <span className="px-4 py-2.5 w-24">
                                    <Badge
                                      variant="outline"
                                      className={
                                        displayStatus === "Played"
                                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                          : displayStatus === "Published"
                                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                                            : "bg-muted text-muted-foreground border-border"
                                      }
                                    >
                                      {displayStatus}
                                    </Badge>
                                  </span>

                                  <span className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:block text-left w-28">
                                    {puzzle.createdAt
                                      ? new Date(puzzle.createdAt).toLocaleDateString()
                                      : "—"}
                                  </span>
                                </Link>

                                <Link
                                  href={`/admin/connections/${puzzle.id}`}
                                  onClick={() => onOpenChange(false)}
                                  className="px-2 py-2.5 text-muted-foreground hover:text-foreground"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </div>

                              {/* Expanded stats row */}
                              {isExpanded && isExpandable && (
                                <div className="bg-muted/10 border-t border-border/30">
                                  <InlineStats puzzleId={puzzle.id} />
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>

              {!loading && filteredPuzzles.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No puzzles found
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Puzzle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title || "Untitled"}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
