"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import { CategoryBuilder } from "./category-builder"
import { BoardLayout } from "./board-layout"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2, Save, Send, Trash2, CalendarDays, Layers, Check, Play } from "lucide-react"
import { toast } from "sonner"
import type { ConnectionsCategory, ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import { StatusBadge, type PuzzleStatus } from "@/components/ui/status-badge"

type DisplayStatus = "Draft" | "Scheduled" | "On Deck" | "Ready" | "Active" | "Archived"

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function getStatusBadge(displayStatus: DisplayStatus): React.ReactNode {
  const statusMap: Record<DisplayStatus, PuzzleStatus> = {
    Draft: "draft",
    Scheduled: "scheduled",
    "On Deck": "ondeck",
    Ready: "ready",
    Active: "active",
    Archived: "archived",
  }
  return <StatusBadge status={statusMap[displayStatus]} />
}

function getAuthorDisplay(createdBy: { email: string; username?: string } | undefined): string {
  if (!createdBy) return "—"
  return createdBy.username || createdBy.email.split("@")[0]
}

function emptyCategory(difficulty: 1 | 2 | 3 | 4): ConnectionsCategory {
  return { name: "", difficulty, players: [] }
}

interface PuzzleEditorProps {
  puzzle?: ConnectionsPuzzle
  calendar?: Record<string, string>
}

export function PuzzleEditor({ puzzle, calendar }: PuzzleEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(puzzle?.title || "")
  const [categories, setCategories] = useState<ConnectionsCategory[]>(
    puzzle?.categories || [
      emptyCategory(1),
      emptyCategory(2),
      emptyCategory(3),
      emptyCategory(4),
    ]
  )
  const [tileOrder, setTileOrder] = useState<string[]>(puzzle?.tileOrder || [])
  const [saving, setSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [publishScheduleDate, setPublishScheduleDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"categories" | "board">("categories")

  const isExisting = !!puzzle
  const isDraft = !puzzle || puzzle.status === "draft"

  // Calculate display status based on calendar context
  const displayStatus: DisplayStatus = useMemo(() => {
    if (!puzzle) return "Draft"
    if (puzzle.status === "draft") return "Draft"

    const todayKey = getTodayKey()
    const activePuzzleId = calendar?.[todayKey]

    if (puzzle.id === activePuzzleId) return "Active"

    // Check if puzzle is in past calendar (archived)
    if (calendar) {
      for (const [date, puzzleId] of Object.entries(calendar)) {
        if (date < todayKey && puzzleId === puzzle.id) {
          return "Archived"
        }
      }
    }

    return "Ready"
  }, [puzzle, calendar])

  const existingPlayerIds = useMemo(() => {
    const ids = new Set<string>()
    for (const cat of categories) {
      for (const p of cat.players) {
        ids.add(p.playerId)
      }
    }
    return ids
  }, [categories])

  const categoryErrors = useMemo(() => {
    return categories.map((cat) => ({
      missingName: !cat.name.trim(),
      missingPlayers: cat.players.length < 4 ? 4 - cat.players.length : 0,
    }))
  }, [categories])

  const isTitleMissing = !title.trim()

  const duplicateDifficulties = useMemo(() => {
    const seen = new Map<number, number>()
    for (const cat of categories) {
      seen.set(cat.difficulty, (seen.get(cat.difficulty) || 0) + 1)
    }
    return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([d]) => d))
  }, [categories])

  const puzzleErrors = useMemo(() => {
    const errors: string[] = []
    if (duplicateDifficulties.size > 0) {
      const dupNames = [...duplicateDifficulties].map((d) => DIFFICULTY_COLORS[d]?.label || `${d}`).join(", ")
      const missing = [1, 2, 3, 4].filter((d) => !categories.some((c) => c.difficulty === d))
      const misNames = missing.map((d) => DIFFICULTY_COLORS[d]?.label || `${d}`).join(", ")
      errors.push(`Duplicate difficulty: ${dupNames}. Missing: ${misNames}`)
    }
    return errors
  }, [categories, duplicateDifficulties])

  const isValid =
    !isTitleMissing &&
    puzzleErrors.length === 0 &&
    categoryErrors.every((e) => !e.missingName && e.missingPlayers === 0)

  const validationTooltip = useMemo(() => {
    if (isValid) return null
    const lines: string[] = []
    if (isTitleMissing) lines.push("Missing title")
    // Missing names
    const missingNames = categories
      .map((cat, i) => ({ cat, err: categoryErrors[i] }))
      .filter(({ err }) => err.missingName)
      .map(({ cat }) => DIFFICULTY_COLORS[cat.difficulty]?.label || `${cat.difficulty}`)
    if (missingNames.length > 0) lines.push(`${missingNames.join(", ")}: Missing name`)
    // Missing players
    const missingPlayers = categories
      .map((cat, i) => ({ cat, err: categoryErrors[i] }))
      .filter(({ err }) => err.missingPlayers > 0)
      .map(({ cat }) => DIFFICULTY_COLORS[cat.difficulty]?.label || `${cat.difficulty}`)
    if (missingPlayers.length > 0) lines.push(`${missingPlayers.join(", ")}: Missing players`)
    if (puzzleErrors.length > 0) lines.push(...puzzleErrors)
    return lines
  }, [isValid, isTitleMissing, categories, categoryErrors, puzzleErrors])

  const handleCategoryChange = (index: number, updated: ConnectionsCategory) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? updated : c)))
  }

  const handlePlayerAdded = (playerId: string) => {
    if (!tileOrder.includes(playerId)) {
      setTileOrder((prev) => {
        const newOrder = [...prev]
        const randomIndex = Math.floor(Math.random() * (newOrder.length + 1))
        newOrder.splice(randomIndex, 0, playerId)
        return newOrder
      })
    }
  }

  const handleCategoryChangeWithAutoPlace = (index: number, updated: ConnectionsCategory) => {
    // Find newly added players
    const oldPlayerIds = new Set(categories[index].players.map((p) => p.playerId))
    const newPlayers = updated.players.filter((p) => !oldPlayerIds.has(p.playerId))

    handleCategoryChange(index, updated)

    for (const p of newPlayers) {
      handlePlayerAdded(p.playerId)
    }
  }

  const handleSave = async (status: "draft" | "published") => {
    if (!isValid) {
      toast.error("Fix validation errors before saving")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = { title, categories, status }
      if (tileOrder.length > 0) {
        body.tileOrder = tileOrder
      }

      const url = puzzle
        ? `/api/admin/connections/puzzles/${puzzle.id}`
        : "/api/admin/connections/puzzles"
      const method = puzzle ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      const data = await res.json()
      toast.success(puzzle ? "Puzzle updated" : "Puzzle created")

      if (!puzzle && data.id) {
        router.push(`/admin/connections/${data.id}`)
      }

      return data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to save"
      toast.error(msg)
      return null
    } finally {
      setSaving(false)
    }
  }

  const handlePublishWithSchedule = async (mode: "schedule" | "stack" | "just-publish") => {
    const result = await handleSave("published")
    if (!result) return

    const puzzleId = puzzle?.id || result.id
    if (!puzzleId) return

    if (mode === "schedule" && publishScheduleDate) {
      try {
        // Fetch current schedule config
        const scheduleRes = await fetch("/api/admin/connections/schedule")
        if (scheduleRes.ok) {
          const config = await scheduleRes.json()
          const newCalendar = { ...config.calendar, [publishScheduleDate]: puzzleId }
          await fetch("/api/admin/connections/schedule", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...config, calendar: newCalendar }),
          })
          toast.success(`Scheduled for ${new Date(publishScheduleDate + "T12:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })}`)
        }
      } catch {
        toast.error("Published but failed to schedule")
      }
    } else if (mode === "stack") {
      try {
        const scheduleRes = await fetch("/api/admin/connections/schedule")
        if (scheduleRes.ok) {
          const config = await scheduleRes.json()
          const newStack = [puzzleId, ...config.stack.filter((id: string) => id !== puzzleId)]
          await fetch("/api/admin/connections/schedule", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...config, stack: newStack }),
          })
          toast.success("Added to top of backlog")
        }
      } catch {
        toast.error("Published but failed to add to backlog")
      }
    }

    setIsPublishOpen(false)
    setPublishScheduleDate(null)
  }

  const handleDelete = async () => {
    if (!puzzle) return
    try {
      const res = await fetch(`/api/admin/connections/puzzles/${puzzle.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Puzzle deleted")
      router.push("/admin/connections")
    } catch {
      toast.error("Failed to delete puzzle")
    }
  }

  const handleDiscard = () => {
    router.push("/admin/connections")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title row with actions */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <label className="text-xs font-semibold text-muted-foreground">TITLE</label>
            {isTitleMissing && <span className="text-xs text-destructive ml-1.5">Required</span>}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            maxLength={30}
          />
          {/* Author + badge under title */}
          {isExisting && puzzle && (
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="text-muted-foreground">
                {getAuthorDisplay(puzzle.createdBy)}
              </span>
              {getStatusBadge(displayStatus)}
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2 shrink-0">
            {/* Test — existing puzzles only */}
            {isExisting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (puzzle?.id) {
                          window.open(`/admin/connections/test?puzzleId=${puzzle.id}`, "_blank", "noopener,noreferrer")
                        }
                      }}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Open puzzle in test mode</TooltipContent>
              </Tooltip>
            )}

            {/* Discard — always present */}
            <Button variant="outline" size="sm" onClick={handleDiscard}>
              {isExisting ? "Discard Changes" : "Discard"}
            </Button>

            {/* Save / Publish — branched on isDraft */}
            {isDraft ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSave("draft")}
                        disabled={saving || !isValid}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save Draft
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {validationTooltip && (
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      {validationTooltip.map((line, i) => <p key={i}>{line}</p>)}
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        className="btn-chamfer"
                        onClick={() => setIsPublishOpen(true)}
                        disabled={saving || !isValid}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {validationTooltip && (
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      {validationTooltip.map((line, i) => <p key={i}>{line}</p>)}
                    </TooltipContent>
                  )}
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      className="btn-chamfer"
                      onClick={() => handleSave("published")}
                      disabled={saving || !isValid}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Changes
                    </Button>
                  </span>
                </TooltipTrigger>
                {validationTooltip && (
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    {validationTooltip.map((line, i) => <p key={i}>{line}</p>)}
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Delete — existing puzzles only */}
            {isExisting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete puzzle</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Small-screen tabs (below md both sections stack via tabs) */}
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "categories" | "board")}>
          <TabsList className="w-full">
            <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="board" className="flex-1">Starting Board</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories + Board
          xs/sm: tabbed (one at a time)
          md: both visible, stacked vertically (categories 2x2, board below)
          lg+: side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 lg:gap-6">
        {/* Categories — 2-col grid on sm/md, single col on xs, single col on lg */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4 ${activeTab === "board" ? "hidden md:grid" : ""}`}>
          {categories.map((cat, i) => (
            <CategoryBuilder
              key={i}
              category={cat}
              onChange={(updated) => handleCategoryChangeWithAutoPlace(i, updated)}
              existingPlayerIds={existingPlayerIds}
              missingName={categoryErrors[i].missingName}
              missingPlayers={categoryErrors[i].missingPlayers}
              isDuplicateDifficulty={duplicateDifficulties.has(cat.difficulty)}
            />
          ))}
        </div>

        {/* Board */}
        <div className={`border-3 border-border p-4 ${activeTab === "categories" ? "hidden md:block" : ""}`}>
          <p className="text-xs font-semibold text-muted-foreground mb-3">STARTING BOARD</p>
          <BoardLayout
            categories={categories}
            tileOrder={tileOrder}
            onTileOrderChange={setTileOrder}
          />
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDraft ? "Delete Draft" : "Delete Puzzle"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title || "Untitled"}&quot;? This action cannot be undone.
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

      {/* Publish scheduling dialog */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish Puzzle</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {/* Schedule to date */}
            <button
              className={`border-3 p-3 text-left transition-colors hover:bg-muted/20 ${
                publishScheduleDate ? "border-primary bg-primary/5" : "border-border"
              }`}
              onClick={() => setPublishScheduleDate(publishScheduleDate ? null : (() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`
              })())}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Schedule to date</p>
                  <p className="text-xs text-muted-foreground">Assign to a specific calendar date</p>
                </div>
              </div>
            </button>

            {publishScheduleDate && (
              <div className="pl-6">
                <Input
                  type="date"
                  value={publishScheduleDate}
                  onChange={(e) => setPublishScheduleDate(e.target.value)}
                  autoComplete="off"
                  className="text-sm"
                />
              </div>
            )}

            {/* Add to backlog */}
            <button
              className="border-3 border-border p-3 text-left transition-colors hover:bg-muted/20"
              onClick={() => handlePublishWithSchedule("stack")}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Add to backlog</p>
                  <p className="text-xs text-muted-foreground">Add to top of the puzzle backlog</p>
                </div>
              </div>
            </button>

            {/* Just publish */}
            <button
              className="border-3 border-border p-3 text-left transition-colors hover:bg-muted/20"
              onClick={() => handlePublishWithSchedule("just-publish")}
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Just publish</p>
                  <p className="text-xs text-muted-foreground">Publish without scheduling</p>
                </div>
              </div>
            </button>

            {/* Confirm schedule date */}
            {publishScheduleDate && (
              <Button
                className="btn-chamfer"
                onClick={() => handlePublishWithSchedule("schedule")}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Publish & Schedule
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
