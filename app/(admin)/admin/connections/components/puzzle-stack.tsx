"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GripVertical, Plus, X } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import { PuzzleCategoryStack } from "./puzzle-category-stack"

interface PuzzleStackProps {
  stack: string[]
  puzzles: ConnectionsPuzzle[]
  onChange: (stack: string[]) => void
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

function SortableItem({
  id,
  puzzle,
  index,
  onRemove,
}: {
  id: string
  puzzle: ConnectionsPuzzle | undefined
  index: number
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (!puzzle) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 border-b border-border/50 px-3 py-2 opacity-50"
      >
        <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
          {index + 1}
        </span>
        <span className="text-sm text-muted-foreground italic flex-1">Unknown ({id.slice(0, 6)})</span>
      </div>
    )
  }

  const sorted = [...(puzzle.categories || [])].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 border-b border-border/50 px-3 py-2 bg-background
        hover:bg-muted/20 transition-colors
        ${isDragging ? "opacity-50" : ""}
      `}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {puzzle.title || <span className="italic text-muted-foreground">Untitled</span>}
          </span>
          {puzzle.createdBy?.email && (
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              {getAuthorDisplay(puzzle.createdBy)}
            </span>
          )}
        </div>

        {/* Category pills — visible on hover */}
        <div className="hidden group-hover:flex gap-1 mt-1">
          {sorted.map((cat) => {
            const colors = DIFFICULTY_COLORS[cat.difficulty]
            return (
              <span
                key={cat.difficulty}
                className={`${colors.bg} ${colors.text} text-[9px] font-bold px-1.5 py-px truncate max-w-[80px]`}
              >
                {cat.name || "—"}
              </span>
            )
          })}
        </div>
      </div>

      {puzzle.createdAt && (
        <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">
          {new Date(puzzle.createdAt).toLocaleDateString("default", { month: "short", day: "numeric" })}
        </span>
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:border-destructive shrink-0"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function PuzzleStack({
  stack,
  puzzles,
  onChange,
}: PuzzleStackProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const puzzleMap = new Map(puzzles.map((p) => [p.id, p]))
  const stackSet = new Set(stack)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = stack.indexOf(active.id as string)
      const newIndex = stack.indexOf(over.id as string)
      onChange(arrayMove(stack, oldIndex, newIndex))
    }
  }

  const handleRemove = (index: number) => {
    onChange(stack.filter((_, i) => i !== index))
  }

  const handleAdd = (puzzleId: string) => {
    onChange([...stack, puzzleId])
    setIsAddOpen(false)
  }

  const availablePuzzles = puzzles.filter((p) => !stackSet.has(p.id))

  return (
    <div className="border-3 border-border flex-1 min-h-0 flex flex-col">
      {/* Stack header with add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 shrink-0">
        <span className="text-xs text-muted-foreground">
          {stack.length} {stack.length === 1 ? "puzzle" : "puzzles"} queued
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Stack items */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {stack.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Backlog is empty</p>
            <p className="text-[10px] text-muted-foreground mt-1">Top puzzle serves when no calendar assignment exists</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stack} strategy={verticalListSortingStrategy}>
              {stack.map((id, i) => (
                <SortableItem
                  key={id}
                  id={id}
                  puzzle={puzzleMap.get(id)}
                  index={i}
                  onRemove={() => handleRemove(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add puzzle dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Backlog</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {availablePuzzles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unqueued puzzles available
              </p>
            ) : (
              availablePuzzles.map((puzzle) => (
                <button
                  key={puzzle.id}
                  className="border-3 border-border p-3 text-left transition-colors hover:bg-muted/20"
                  onClick={() => handleAdd(puzzle.id)}
                >
                  <PuzzleCategoryStack puzzle={puzzle} />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
