"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { TierSeparator } from "@/lib/types/ranking-schemas"
import { getTierColor } from "@/lib/tier-utils"

const noAnimations = () => false

interface TierRowProps {
  tier: TierSeparator
  index: number // tier index (0-based) for color cycling
  onRemove: (tier: TierSeparator) => void
}

export const TierRow = memo(function TierRow({ tier, index, onRemove }: TierRowProps) {
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

  const color = getTierColor(index)

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
            <div className="flex-1 h-[2px]" style={{ backgroundColor: color }} />
            <span
              className="text-xs font-semibold whitespace-nowrap px-2"
              style={{ color }}
            >
              {`Tier ${index + 1}`}
            </span>
            <div className="flex-1 h-[2px]" style={{ backgroundColor: color }} />
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
  index: number
}

export function TierRowOverlay({ index }: TierRowOverlayProps) {
  const color = getTierColor(index)

  return (
    <div className="flex items-center gap-2 px-2 h-8 bg-background border border-border rounded-md shadow-lg">
      <div className="flex items-center justify-center shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-[2px]" style={{ backgroundColor: color }} />
        <span
          className="text-xs font-semibold whitespace-nowrap px-2"
          style={{ color }}
        >
          {`Tier ${index + 1}`}
        </span>
        <div className="flex-1 h-[2px]" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}
