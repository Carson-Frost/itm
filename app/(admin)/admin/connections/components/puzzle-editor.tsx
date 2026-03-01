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
import { Loader2, Save, Send, Trash2, CalendarDays, Layers, Check } from "lucide-react"
import { toast } from "sonner"
import type { ConnectionsCategory, ConnectionsPuzzle } from "@/lib/types/connections"

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

  const isExisting = !!puzzle
  const isDraft = !puzzle || puzzle.status === "draft"

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
    return categories.map((cat) => {
      const errors: string[] = []
      if (!cat.name.trim()) errors.push("Needs a name")
      if (cat.players.length < 4) {
        errors.push(`${4 - cat.players.length} more player(s) needed`)
      }
      return errors
    })
  }, [categories])

  const puzzleErrors = useMemo(() => {
    const errors: string[] = []
    if (!title.trim()) {
      errors.push("Title is required")
    }
    const diffs = categories.map((c) => c.difficulty)
    if (new Set(diffs).size !== 4) {
      errors.push("Multiple categories share the same difficulty — each must be unique")
    }
    return errors
  }, [title, categories])

  const isValid =
    puzzleErrors.length === 0 &&
    categoryErrors.every((e) => e.length === 0)

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
          toast.success("Added to top of stack")
        }
      } catch {
        toast.error("Published but failed to add to stack")
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
        <div className="flex-1 max-w-md">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            TITLE
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status indicator for existing puzzles */}
          {isExisting && (
            <span className={`text-xs font-semibold mr-1 ${isDraft ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}>
              {isDraft ? "Draft" : "Published"}
            </span>
          )}

          {/* New puzzle: Discard + Save Draft + Publish */}
          {!isExisting && (
            <>
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                Discard
              </Button>
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
              <Button
                size="sm"
                className="btn-chamfer"
                onClick={() => {
                  if (!isValid) {
                    toast.error("Fix validation errors before publishing")
                    return
                  }
                  setIsPublishOpen(true)
                }}
                disabled={saving || !isValid}
              >
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            </>
          )}

          {/* Editing draft: Delete + Save Changes + Publish */}
          {isExisting && isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
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
                Save Changes
              </Button>
              <Button
                size="sm"
                className="btn-chamfer"
                onClick={() => {
                  if (!isValid) {
                    toast.error("Fix validation errors before publishing")
                    return
                  }
                  setIsPublishOpen(true)
                }}
                disabled={saving || !isValid}
              >
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            </>
          )}

          {/* Editing published: Delete + Save Changes */}
          {isExisting && !isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
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
            </>
          )}
        </div>
      </div>

      {/* Puzzle-wide errors */}
      {puzzleErrors.length > 0 && (
        <div className="border-3 border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive flex flex-col gap-1">
          {puzzleErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <Separator />

      {/* Side-by-side: Categories (left) + Board (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* Categories */}
        <div className="flex flex-col gap-4">
          {categories.map((cat, i) => (
            <CategoryBuilder
              key={i}
              category={cat}
              onChange={(updated) => handleCategoryChangeWithAutoPlace(i, updated)}
              existingPlayerIds={existingPlayerIds}
              errors={categoryErrors[i]}
            />
          ))}
        </div>

        {/* Board */}
        <div className="border-3 border-border p-4">
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

            {/* Add to stack */}
            <button
              className="border-3 border-border p-3 text-left transition-colors hover:bg-muted/20"
              onClick={() => handlePublishWithSchedule("stack")}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Add to stack</p>
                  <p className="text-xs text-muted-foreground">Add to top of the puzzle stack</p>
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
