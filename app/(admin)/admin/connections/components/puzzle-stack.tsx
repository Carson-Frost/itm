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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GripVertical, Plus, X } from "lucide-react"
import type { ConnectionsPuzzle } from "@/lib/types/connections"
import { PuzzleCategoryStack } from "./puzzle-category-stack"

interface PuzzleStackProps {
  stack: string[]
  puzzles: ConnectionsPuzzle[]
  onChange: (stack: string[]) => void
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 border-3 border-border px-3 py-2 bg-background
        ${isDragging ? "opacity-50" : ""}
      `}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="text-xs font-mono text-muted-foreground w-6">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        {puzzle ? (
          <PuzzleCategoryStack puzzle={puzzle} />
        ) : (
          <span className="text-sm text-muted-foreground italic">Unknown ({id.slice(0, 6)})</span>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground max-w-md">
          Puzzles queued here are used to fill days without a calendar assignment. The top puzzle is served first.
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Puzzle
        </Button>
      </div>

      {stack.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No puzzles in the stack
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stack} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {stack.map((id, i) => (
                <SortableItem
                  key={id}
                  id={id}
                  puzzle={puzzleMap.get(id)}
                  index={i}
                  onRemove={() => handleRemove(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add puzzle dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Stack</DialogTitle>
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
