"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { RankedPlayer } from "@/lib/types/ranking-schemas"
import { PositionBadge } from "@/components/position-badge"
import { cn } from "@/lib/utils"

export interface PlayerStats {
  gamesPlayed?: number
  fantasyPoints?: number
  pointsPerGame?: number
  // Passing
  attempts?: number
  completions?: number
  passingYards?: number
  passingTDs?: number
  interceptions?: number
  // Rushing
  carries?: number
  rushingYards?: number
  rushingTDs?: number
  // Receiving
  targets?: number
  receptions?: number
  receivingYards?: number
  receivingTDs?: number
}

export interface ColumnGroup {
  key: string
  label: string
  columns: { key: string; label: string }[]
}

interface PlayerRowProps {
  player: RankedPlayer
  stats?: PlayerStats
  columnGroups: ColumnGroup[]
  onClick: (player: RankedPlayer) => void
}

function getStatValue(stats: PlayerStats | undefined, key: string): string | number {
  if (!stats) return "-"
  const value = stats[key as keyof PlayerStats]
  if (value === undefined || value === null) return "-"
  if (typeof value === "number") return Math.round(value)
  return value
}

export function PlayerRow({ player, stats, columnGroups, onClick }: PlayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.playerId })

  // Only apply transform/transition to non-dragged items (for reordering animation)
  // The dragged item uses DragOverlay, so it doesn't need these
  const style = isDragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "group hover:bg-accent/50 transition-colors",
        isDragging && "opacity-40 bg-muted"
      )}
    >
      {/* Drag Handle */}
      <TableCell className="w-8 px-2 align-middle">
        <button
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex items-center justify-center"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>

      {/* Rank */}
      <TableCell className="text-center font-medium text-muted-foreground w-12 align-middle">
        {player.rank}
      </TableCell>

      {/* Player Name + Headshot */}
      <TableCell className="w-48 align-middle">
        <div className="flex items-center gap-3">
          {player.headshotUrl ? (
            <img
              src={player.headshotUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
          )}
          <button
            onClick={() => onClick(player)}
            className="font-medium truncate text-left hover:underline focus:outline-none"
          >
            {player.name}
          </button>
        </div>
      </TableCell>

      {/* Position */}
      <TableCell className="text-center w-16 align-middle">
        <PositionBadge position={player.position} />
      </TableCell>

      {/* Team */}
      <TableCell className="text-center w-16 align-middle">
        <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
      </TableCell>

      {/* Games */}
      <TableCell className="text-center text-xs w-12 align-middle">
        {stats?.gamesPlayed ?? "-"}
      </TableCell>

      {/* Fantasy Points */}
      <TableCell className="text-center w-16 align-middle">
        {stats?.fantasyPoints?.toFixed(1) ?? "-"}
      </TableCell>

      {/* Points Per Game */}
      <TableCell className="text-center w-16 align-middle">
        {stats?.pointsPerGame?.toFixed(1) ?? "-"}
      </TableCell>

      {/* Dynamic stat columns based on column groups */}
      {columnGroups.map((group) =>
        group.columns.map((col, colIndex) => (
          <TableCell
            key={col.key}
            className={cn(
              "text-center text-sm hidden md:table-cell align-middle",
              colIndex === 0 && "pl-4"
            )}
          >
            {getStatValue(stats, col.key)}
          </TableCell>
        ))
      )}
    </TableRow>
  )
}

// Overlay component for smooth dragging - rendered as div since it's outside table context
interface PlayerRowOverlayProps {
  player: RankedPlayer
  stats?: PlayerStats
  columnGroups: ColumnGroup[]
}

export function PlayerRowOverlay({ player, stats, columnGroups }: PlayerRowOverlayProps) {
  return (
    <div className="flex items-center gap-0 py-2 px-0 bg-background border border-border rounded-md shadow-lg text-sm">
      {/* Drag Handle */}
      <div className="w-8 px-2 flex items-center justify-center">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Rank */}
      <div className="w-12 text-center font-medium text-muted-foreground">
        {player.rank}
      </div>

      {/* Player Name + Headshot */}
      <div className="w-48 flex items-center gap-3">
        {player.headshotUrl ? (
          <img
            src={player.headshotUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
        )}
        <span className="font-medium truncate">{player.name}</span>
      </div>

      {/* Position */}
      <div className="w-16 flex justify-center">
        <PositionBadge position={player.position} />
      </div>

      {/* Team */}
      <div className="w-16 text-center">
        <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
      </div>

      {/* Games */}
      <div className="w-12 text-center text-xs">
        {stats?.gamesPlayed ?? "-"}
      </div>

      {/* Fantasy Points */}
      <div className="w-16 text-center">
        {stats?.fantasyPoints?.toFixed(1) ?? "-"}
      </div>

      {/* Points Per Game */}
      <div className="w-16 text-center">
        {stats?.pointsPerGame?.toFixed(1) ?? "-"}
      </div>

      {/* Dynamic stat columns - hidden on overlay for cleaner look */}
    </div>
  )
}
