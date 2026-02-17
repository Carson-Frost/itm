"use client"

import { memo, useMemo } from "react"
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
    <div className="group/card relative w-full h-full flex flex-col items-center px-2 pt-2 pb-1.5">
      {/* Rank — top-right */}
      <span className="absolute top-1.5 right-2.5 text-[11px] text-muted-foreground font-bold">
        {player.rank}
      </span>

      {/* Drag indicator — left edge, vertically centered */}
      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-hover/card:text-muted-foreground transition-colors">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Headshot */}
      {player.headshotUrl ? (
        <img
          src={player.headshotUrl}
          alt=""
          className="h-11 w-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
      )}

      {/* Name */}
      <button
        className="text-[11px] font-semibold text-center truncate w-full mt-1 hover:underline"
        onClick={(e) => {
          e.stopPropagation()
          onClick(player)
        }}
      >
        {player.name}
      </button>

      {/* Position · Team */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <PositionBadge position={player.position} />
        <span className="text-[10px] text-muted-foreground font-medium">{player.team}</span>
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
        // Only apply transition while a drag is active. On drop, cards
        // snap to final positions — prevents the displacement-removal
        // transition from conflicting with the layout reflow when the
        // dropped card reappears in a flex-wrap container.
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
          className="flex flex-col items-center px-2 pt-2 pb-1.5"
          style={{
            width: "calc(100% - 6px)",
            height: "calc(100% - 6px)",
            clipPath: CARD_CHAMFER_INNER,
            background: "var(--background)",
          }}
        >
          <div className="relative w-full h-full flex flex-col items-center">
            <span className="absolute top-0 right-0.5 text-[11px] text-muted-foreground font-bold">
              {player.rank}
            </span>
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 text-muted-foreground/30">
              <GripVertical className="h-4 w-4" />
            </div>
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt=""
                className="h-11 w-11 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
            )}
            <span className="text-[11px] font-semibold text-center truncate w-full mt-1">
              {player.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PositionBadge position={player.position} />
              <span className="text-[10px] text-muted-foreground font-medium">{player.team}</span>
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
}

const TierListRow = memo(function TierListRow({
  bucket,
  containerId,
  isActiveTier,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
}: TierListRowProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerId })

  // Only provide sortable item IDs for active tiers — inactive tier cards
  // have disabled droppable so the sorting strategy doesn't need their IDs
  const playerIds = useMemo(
    () => isActiveTier ? bucket.players.map((p) => p.playerId) : [],
    [bucket.players, isActiveTier]
  )

  return (
    <div className="flex border-b last:border-b-0">
      <div
        className="w-24 shrink-0 flex items-center justify-center p-2"
        style={bucket.color ? {
          backgroundColor: `color-mix(in oklch, ${bucket.color} 20%, transparent)`,
        } : undefined}
      >
        <span
          className={cn(
            "text-xs font-bold text-center",
            !bucket.color && "text-muted-foreground"
          )}
          style={bucket.color ? { color: bucket.color } : undefined}
        >
          {bucket.label}
        </span>
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
  className?: string
}

export function TierListView({
  buckets,
  activeTierIds,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
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
          />
        )
      })}
    </div>
  )
}
