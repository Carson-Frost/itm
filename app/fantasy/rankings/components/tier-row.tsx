"use client"

import { memo, useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { TierSeparator } from "@/lib/types/ranking-schemas"
import { generateTierColor } from "@/lib/tier-utils"

const noAnimations = () => false

interface TierRowProps {
  tier: TierSeparator
  index: number // tier index (0-based) for fallback color
  onRemove: (tier: TierSeparator) => void
  onRename: (tierId: string, newLabel: string) => void
}

export const TierRow = memo(function TierRow({ tier, index, onRemove, onRename }: TierRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(tier.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tier.id,
    animateLayoutChanges: noAnimations,
  })

  const style = isDragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  // Use persisted color, fall back to index-based generation for legacy data
  const color = tier.color || generateTierColor(index)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== tier.label) {
      onRename(tier.id, trimmed)
    }
    setIsEditing(false)
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-0" : undefined}
    >
      <TableCell colSpan={100} className="p-0 h-8">
        <div className="flex items-center gap-2 px-2 h-full">
          {/* Drag handle */}
          <button
            className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex items-center justify-center shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Colored line with label */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-[2.5px]" style={{ backgroundColor: color }} />
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit()
                  if (e.key === "Escape") {
                    setEditValue(tier.label)
                    setIsEditing(false)
                  }
                }}
                autoComplete="off"
                className="text-[0.8rem] font-bold whitespace-nowrap px-1 w-24 bg-transparent border border-border rounded-sm text-center outline-none"
                style={{ color }}
              />
            ) : (
              <button
                onClick={() => {
                  setEditValue(tier.label)
                  setIsEditing(true)
                }}
                className="text-[0.8rem] font-bold whitespace-nowrap px-2 hover:underline"
                style={{ color }}
              >
                {tier.label}
              </button>
            )}
            <div className="flex-1 h-[2.5px]" style={{ backgroundColor: color }} />
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(tier)}
            className="text-muted-foreground hover:text-destructive shrink-0 flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
})

// Overlay rendered during drag — uses div (not tr) since it's outside table context
interface TierRowOverlayProps {
  tier: TierSeparator
  index: number
}

export function TierRowOverlay({ tier, index }: TierRowOverlayProps) {
  const color = tier.color || generateTierColor(index)

  return (
    <div className="flex items-center gap-2 px-2 h-8 bg-background border border-border rounded-md shadow-lg">
      <div className="flex items-center justify-center shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-[2.5px]" style={{ backgroundColor: color }} />
        <span
          className="text-[0.8rem] font-bold whitespace-nowrap px-2"
          style={{ color }}
        >
          {tier.label}
        </span>
        <div className="flex-1 h-[2.5px]" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}
