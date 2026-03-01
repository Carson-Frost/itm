"use client"

import { memo, useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TierSeparator } from "@/lib/types/ranking-schemas"
import { generateTierColor } from "@/lib/tier-utils"
import { cn } from "@/lib/utils"

export function TierContextMenuItems({
  onRename,
  onDelete,
}: {
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <>
      <ContextMenuItem onSelect={onRename}>
        Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={onDelete}>
        Delete Tier
      </ContextMenuItem>
    </>
  )
}

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
  const renamingFromMenu = useRef(false)

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow
          ref={setNodeRef}
          style={style}
          className={cn(isDragging ? "opacity-0" : "group", "hover:bg-transparent touch-none cursor-grab active:cursor-grabbing")}
          {...attributes}
          {...listeners}
        >
          <TableCell colSpan={100} className="p-0 h-7 align-middle">
            <div className="flex items-center gap-2 px-4 h-full">
              <div
                className="flex-1 h-[3px] group-hover:h-[5px] transition-all duration-150 rounded-sm"
                style={{ backgroundColor: color }}
              />
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
                  onPointerDown={(e) => e.stopPropagation()}
                  autoComplete="off"
                  className="text-[0.75rem] font-bold whitespace-nowrap px-1 w-24 bg-transparent border rounded-sm text-center outline-none cursor-text"
                  style={{ color, borderColor: color }}
                />
              ) : (
                <button
                  onClick={() => {
                    setEditValue(tier.label)
                    setIsEditing(true)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-[0.75rem] font-bold whitespace-nowrap px-2 hover:underline cursor-pointer"
                  style={{ color }}
                >
                  {tier.label}
                </button>
              )}
              <div
                className="flex-1 h-[3px] group-hover:h-[5px] transition-all duration-150 rounded-sm"
                style={{ backgroundColor: color }}
              />
            </div>
          </TableCell>
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => {
          if (renamingFromMenu.current) {
            e.preventDefault()
            renamingFromMenu.current = false
            inputRef.current?.focus()
            inputRef.current?.select()
          }
        }}
      >
        <TierContextMenuItems
          onRename={() => {
            renamingFromMenu.current = true
            setEditValue(tier.label)
            setIsEditing(true)
          }}
          onDelete={() => onRemove(tier)}
        />
      </ContextMenuContent>
    </ContextMenu>
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
    <div className="flex items-center gap-2 px-4 h-7 bg-background border border-border rounded-md shadow-lg">
      <div className="flex-1 h-[3px] rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[0.75rem] font-bold whitespace-nowrap px-2" style={{ color }}>
        {tier.label}
      </span>
      <div className="flex-1 h-[3px] rounded-sm" style={{ backgroundColor: color }} />
    </div>
  )
}
