"use client"

import { memo, useMemo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SortableContext } from "@dnd-kit/sortable"
import { GripVertical } from "lucide-react"
import { RankedPlayer, TierSeparator } from "@/lib/types/ranking-schemas"
import { TierBucket, groupByTiers } from "@/lib/tier-utils"
import { PositionBadge } from "@/components/position-badge"
import { cn } from "@/lib/utils"

const CARD_CHAMFER_OUTER = "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)"
const CARD_CHAMFER_INNER = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)"

// Disable layout animations so other cards don't shift around during drag
const noAnimations = () => false

interface TierPlayerCardProps {
  player: RankedPlayer
  isPlacingTier: boolean
  isSelected: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer) => void
}

const TierPlayerCard = memo(function TierPlayerCard({
  player,
  isPlacingTier,
  isSelected,
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
  } = useSortable({
    id: player.playerId,
    animateLayoutChanges: noAnimations,
  })

  const style = isDragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "card-chamfer w-[130px] h-[110px] m-1.5 cursor-pointer",
        isDragging && "opacity-0",
        isSelected && "card-selected",
        isPlacingTier && "cursor-cell"
      )}
      onClick={() => isPlacingTier ? onClick(player) : onSelect(player)}
    >
      <div className="group/card relative w-full h-full flex flex-col items-center px-2 pt-2 pb-1.5">
        {/* Rank — top-right */}
        <span className="absolute top-1.5 right-2.5 text-[11px] text-muted-foreground font-bold">
          {player.rank}
        </span>

        {/* Drag handle — left edge, vertically centered */}
        <div
          className="absolute left-0.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-hover/card:text-muted-foreground group-has-[button:hover]/card:text-muted-foreground/30 transition-colors cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
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

interface TierListRowProps {
  bucket: TierBucket
  isPlacingTier: boolean
  selectedPlayerId: string | null
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer) => void
}

const TierListRow = memo(function TierListRow({
  bucket,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
}: TierListRowProps) {
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

      <div className="flex-1 flex flex-wrap py-1 px-0.5 min-h-20">
        {bucket.players.map((player) => (
          <TierPlayerCard
            key={player.playerId}
            player={player}
            isPlacingTier={isPlacingTier}
            isSelected={selectedPlayerId === player.playerId}
            onClick={onPlayerClick}
            onSelect={onPlayerSelect}
          />
        ))}
      </div>
    </div>
  )
})

interface TierListViewProps {
  players: RankedPlayer[]
  tiers: TierSeparator[]
  isPlacingTier: boolean
  selectedPlayerId: string | null
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer) => void
  className?: string
}

export function TierListView({
  players,
  tiers,
  isPlacingTier,
  selectedPlayerId,
  onPlayerClick,
  onPlayerSelect,
  className,
}: TierListViewProps) {
  const buckets = useMemo(() => groupByTiers(players, tiers), [players, tiers])

  const sortableIds = useMemo(
    () => players.map((p) => p.playerId),
    [players]
  )

  return (
    <SortableContext items={sortableIds}>
      <div className={cn("border rounded-md overflow-auto max-h-[calc(100vh-320px)] bg-card", className)}>
        {buckets.map((bucket, i) => (
          <TierListRow
            key={bucket.tierIndex ?? `untiered-${i}`}
            bucket={bucket}
            isPlacingTier={isPlacingTier}
            selectedPlayerId={selectedPlayerId}
            onPlayerClick={onPlayerClick}
            onPlayerSelect={onPlayerSelect}
          />
        ))}
      </div>
    </SortableContext>
  )
}
