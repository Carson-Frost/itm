"use client"

import { memo, useMemo, useState, useRef, useEffect } from "react"
import { useSortable, SortableContext, rectSortingStrategy, defaultAnimateLayoutChanges, AnimateLayoutChanges } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { RankedPlayer } from "@/lib/types/ranking-schemas"
import { TierBucket } from "@/lib/tier-utils"
import { PositionBadge } from "@/components/position-badge"
import { cn } from "@/lib/utils"

const CARD_CHAMFER_OUTER = "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)"
const CARD_CHAMFER_INNER = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)"

// Abbreviate long names to first initial + last name for card display
function cardName(name: string): string {
  if (name.length <= 15) return name
  const spaceIdx = name.indexOf(" ")
  if (spaceIdx === -1) return name
  return `${name[0]}. ${name.slice(spaceIdx + 1)}`
}

// Suppress initial mount animation while keeping smooth reorder transitions
const layoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

// Visual content of a card — headshots, badges, text. Memoized separately
// so it doesn't re-render when dnd-kit's internal context changes trigger
// the parent wrapper to re-evaluate its hook.
const TierPlayerCardContent = memo(function TierPlayerCardContent({
  player,
  onClick,
}: {
  player: RankedPlayer
  onClick: (player: RankedPlayer) => void
}) {
  return (
    <div className="group/card relative w-full h-full p-[3px]">
      {/* Headshot — fills entire card, clipped to match chamfered border */}
      <div className="relative w-full h-full overflow-hidden" style={{ clipPath: CARD_CHAMFER_INNER }}>
        {player.headshotUrl ? (
          <img
            src={player.headshotUrl}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* Bottom shadow */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Rank — top-right */}
        <span className="absolute top-1 right-1.5 text-sm font-semibold text-foreground pointer-events-none">
          {player.rank}
        </span>

        {/* Drag handle — vertically centered, left edge */}
        <div className="absolute left-0 top-[48%] -translate-y-1/2 text-muted-foreground/40 group-hover/card:text-muted-foreground/70 dark:text-white/40 dark:group-hover/card:text-white/80 transition-colors dark:[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.6))] pointer-events-none">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Info strip — dark nameplate at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 px-2 flex flex-col items-center justify-end pointer-events-none">
          <button
            className="text-xs font-semibold text-center truncate w-full leading-tight text-white hover:underline [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation()
              onClick(player)
            }}
          >
            {cardName(player.name)}
          </button>
          <div className="flex items-center gap-1">
            <PositionBadge position={player.position} />
            <span className="text-[10px] text-white/80 font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{player.team}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

interface TierPlayerCardProps {
  player: RankedPlayer
  isPlacingTier: boolean
  isSelected: boolean
  isSortable: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer) => void
}

// Thin sortable wrapper — re-renders on dnd-kit context changes but only
// runs the hook + a div. The heavy visual content in TierPlayerCardContent
// is memo-skipped because its props (player, onClick) are stable references.
const TierPlayerCard = memo(function TierPlayerCard({
  player,
  isPlacingTier,
  isSelected,
  isSortable,
  onClick,
  onSelect,
}: TierPlayerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: player.playerId,
    animateLayoutChanges: layoutChanges,
    // Cards are always draggable (so the pointer sensor captures them),
    // but only droppable in active tiers — this prevents dnd-kit from
    // measuring all ~200+ cards on every drag event
    disabled: isSortable ? false : { droppable: true },
  })

  const style = isDragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition: isSorting ? transition : undefined,
      }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "card-chamfer w-[130px] h-[110px] m-1.5 touch-none",
        isDragging && "opacity-0",
        isSelected && "card-selected",
        isPlacingTier ? "cursor-cell" : "cursor-grab active:cursor-grabbing"
      )}
      onClick={() => isPlacingTier ? onClick(player) : onSelect(player)}
      {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
    >
      <TierPlayerCardContent player={player} onClick={onClick} />
    </div>
  )
})

// Drag overlay — two nested divs for proper chamfered border rendering
export function TierPlayerCardOverlay({ player }: { player: RankedPlayer }) {
  return (
    <div
      className="w-[130px] h-[110px] shadow-lg"
      style={{ clipPath: CARD_CHAMFER_OUTER }}
    >
      {/* Border layer */}
      <div className="w-full h-full bg-border flex items-center justify-center">
        {/* Fill layer */}
        <div
          className="flex flex-col"
          style={{
            width: "calc(100% - 6px)",
            height: "calc(100% - 6px)",
            clipPath: CARD_CHAMFER_INNER,
            background: "var(--background)",
          }}
        >
          {/* Headshot — fills entire card */}
          <div className="relative w-full h-full overflow-hidden">
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            {/* Bottom shadow */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

            {/* Rank — top-right */}
            <span className="absolute top-1 right-1.5 text-sm font-semibold text-foreground">
              {player.rank}
            </span>

            {/* Drag handle — vertically centered, left edge */}
            <div className="absolute left-0 top-[48%] -translate-y-1/2 text-muted-foreground/40 dark:text-white/40 dark:[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.6))]">
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Info strip — dark nameplate at bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 px-2 flex flex-col items-center justify-end">
              <span className="text-xs font-semibold text-center truncate w-full leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                {cardName(player.name)}
              </span>
              <div className="flex items-center gap-1">
                <PositionBadge position={player.position} />
                <span className="text-[10px] text-white/80 font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{player.team}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Container ID for a tier bucket, used by useDroppable and collision detection
export function getBucketContainerId(bucket: TierBucket): string {
  return bucket.tierIndex !== null ? `tier-bucket-${bucket.tierIndex}` : "tier-bucket-untiered"
}

interface TierListRowProps {
  bucket: TierBucket
  containerId: string
  isActiveTier: boolean
  isPlacingTier: boolean
  selectedPlayerId: string | null
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer) => void
  onTierRename?: (tierId: string, newLabel: string) => void
}

const TierListRow = memo(function TierListRow({
  bucket,
  containerId,
  isActiveTier,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
  onTierRename,
}: TierListRowProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerId })
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(bucket.label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only provide sortable item IDs for active tiers — inactive tier cards
  // have disabled droppable so the sorting strategy doesn't need their IDs
  const playerIds = useMemo(
    () => isActiveTier ? bucket.players.map((p) => p.playerId) : [],
    [bucket.players, isActiveTier]
  )

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== bucket.label && bucket.tierId && onTierRename) {
      onTierRename(bucket.tierId, trimmed)
    }
    setIsEditing(false)
  }

  function startEditing() {
    if (!bucket.tierId || !onTierRename) return
    setEditValue(bucket.label)
    setIsEditing(true)
  }

  return (
    <div className="flex border-b last:border-b-0">
      <div
        className="w-[126px] shrink-0 flex items-center justify-center p-2"
        style={bucket.color ? {
          backgroundColor: `color-mix(in oklch, ${bucket.color} 20%, transparent)`,
        } : undefined}
        onDoubleClick={startEditing}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit()
              if (e.key === "Escape") {
                setEditValue(bucket.label)
                setIsEditing(false)
              }
            }}
            autoComplete="off"
            className="text-sm font-extrabold text-center w-full bg-transparent border border-border rounded-sm outline-none px-1"
            style={bucket.color ? { color: bucket.color } : undefined}
          />
        ) : (
          <button
            onClick={startEditing}
            className={cn(
              "text-sm font-extrabold text-center",
              !bucket.color && "text-muted-foreground",
              bucket.tierId && "hover:underline"
            )}
            style={bucket.color ? { color: bucket.color } : undefined}
          >
            {bucket.label}
          </button>
        )}
      </div>

      <SortableContext items={playerIds} strategy={rectSortingStrategy}>
        <div
          ref={setDropRef}
          className={cn(
            "flex-1 flex flex-wrap py-1 px-0.5 min-h-[126px] transition-colors",
            isOver && bucket.players.length === 0 && "bg-accent/50"
          )}
        >
          {bucket.players.map((player) => (
            <TierPlayerCard
              key={player.playerId}
              player={player}
              isPlacingTier={isPlacingTier}
              isSelected={selectedPlayerId === player.playerId}
              isSortable={isActiveTier}
              onClick={onPlayerClick}
              onSelect={onPlayerSelect}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
})

interface TierListViewProps {
  buckets: TierBucket[]
  activeTierIds: Set<string>
  isPlacingTier: boolean
  selectedPlayerId: string | null
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer) => void
  onTierRename: (tierId: string, newLabel: string) => void
  className?: string
}

export function TierListView({
  buckets,
  activeTierIds,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
  onTierRename,
  className,
}: TierListViewProps) {
  return (
    <div className={cn("border rounded-md overflow-auto max-h-[calc(100vh-320px)] bg-card", className)}>
      {buckets.map((bucket, i) => {
        const containerId = getBucketContainerId(bucket)
        return (
          <TierListRow
            key={bucket.tierIndex ?? `untiered-${i}`}
            bucket={bucket}
            containerId={containerId}
            isActiveTier={activeTierIds.has(containerId)}
            isPlacingTier={isPlacingTier}
            selectedPlayerId={selectedPlayerId}
            onPlayerClick={onPlayerClick}
            onPlayerSelect={onPlayerSelect}
            onTierRename={onTierRename}
          />
        )
      })}
    </div>
  )
}
