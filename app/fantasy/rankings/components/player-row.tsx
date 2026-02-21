"use client"

import React, { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { RankedPlayer } from "@/lib/types/ranking-schemas"
import { PositionBadge } from "@/components/position-badge"
import { cn } from "@/lib/utils"

export interface PlayerContextMenuProps {
  player: RankedPlayer
  isSelected: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer) => void
  onMoveUp?: (player: RankedPlayer) => void
  onMoveDown?: (player: RankedPlayer) => void
}

export function PlayerContextMenuItems({
  player, isSelected, canMoveUp, canMoveDown, onClick, onSelect, onMoveUp, onMoveDown,
}: PlayerContextMenuProps) {
  return (
    <>
      <ContextMenuItem onSelect={() => onClick(player)}>
        View Player Card
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem disabled={!canMoveUp} onSelect={() => onMoveUp?.(player)}>
        Move Up
      </ContextMenuItem>
      <ContextMenuItem disabled={!canMoveDown} onSelect={() => onMoveDown?.(player)}>
        Move Down
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => onSelect(player)}>
        {isSelected ? "Deselect" : "Select"}
      </ContextMenuItem>
    </>
  )
}

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
  columns: { key: string; label: string; wideOnly: boolean }[]
}

interface PlayerRowProps {
  player: RankedPlayer
  stats?: PlayerStats
  columnGroups: ColumnGroup[]
  isSelected?: boolean
  isPlacingTier?: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer) => void
  onMoveUp?: (player: RankedPlayer) => void
  onMoveDown?: (player: RankedPlayer) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

function getStatValue(stats: PlayerStats | undefined, key: string): string | number {
  if (!stats) return "-"
  const value = stats[key as keyof PlayerStats]
  if (value === undefined || value === null) return "-"
  if (typeof value === "number") return Math.round(value)
  return value
}

// Stable reference to avoid re-creating on every render
const noAnimations = () => false

export const PlayerRow = memo(function PlayerRow({ player, stats, columnGroups, isSelected, isPlacingTier, onClick, onSelect, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: PlayerRowProps) {
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow
          ref={setNodeRef}
          style={style}
          onClick={() => onSelect(player)}
          className={cn(
            "group touch-none",
            isSelected && "shadow-[inset_0_0_0_3px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]",
            isDragging && "opacity-0",
            isPlacingTier ? "hover:bg-primary/10 cursor-cell border-t-2 border-t-transparent hover:border-t-primary" : "cursor-grab active:cursor-grabbing"
          )}
          {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
        >
          {/* Rank — grip overlays on hover so no extra column is needed */}
          <TableCell className="text-center font-medium text-muted-foreground w-12 align-middle relative">
            <span className="group-hover:opacity-0 transition-opacity">{player.rank}</span>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          </TableCell>

          {/* Player Name + Headshot */}
          <TableCell className="w-48 align-middle">
            <div className="flex items-center gap-3">
              {player.headshotUrl ? (
                <img
                  src={player.headshotUrl}
                  alt=""
                  className="h-9 w-9 -mt-1.5 -mb-1 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-9 w-9 -mt-1.5 -mb-1 rounded-full bg-muted shrink-0" />
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

          {/* Spacer */}
          <TableCell className="w-2 p-0"></TableCell>

          {/* Fantasy Points */}
          <TableCell className="text-center w-12 align-middle">
            {stats?.fantasyPoints?.toFixed(1) ?? "-"}
          </TableCell>

          {/* Points Per Game */}
          <TableCell className="text-center w-12 align-middle">
            {stats?.pointsPerGame?.toFixed(1) ?? "-"}
          </TableCell>

          {/* Dynamic stat columns based on column groups */}
          {columnGroups.map((group) =>
            group.columns.map((col, colIndex) => (
              <React.Fragment key={col.key}>
                {colIndex === 0 && <TableCell className="w-2 p-0 hidden md:table-cell"></TableCell>}
                <TableCell className={cn(
                  "text-center text-sm w-12 align-middle",
                  col.wideOnly ? "hidden lg:table-cell" : "hidden md:table-cell"
                )}>
                  {getStatValue(stats, col.key)}
                </TableCell>
              </React.Fragment>
            ))
          )}
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <PlayerContextMenuItems
          player={player}
          isSelected={!!isSelected}
          canMoveUp={!!canMoveUp}
          canMoveDown={!!canMoveDown}
          onClick={onClick}
          onSelect={onSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
})

// Overlay component for smooth dragging. Rendered as an actual <table> with the same
// width as the scroll container so table-layout: auto distributes column space
// identically to the main table — columns stay perfectly aligned on drag.
interface PlayerRowOverlayProps {
  player: RankedPlayer
  stats?: PlayerStats
  columnGroups: ColumnGroup[]
  containerWidth?: number
}

export function PlayerRowOverlay({ player, stats, columnGroups, containerWidth }: PlayerRowOverlayProps) {
  return (
    <div className="bg-background border border-border rounded-md shadow-lg overflow-hidden text-sm">
      <table style={{ width: containerWidth }}>
        <tbody>
          <tr>
            <td className="w-12 p-2 text-center font-medium text-muted-foreground align-middle">
              {player.rank}
            </td>

            <td className="w-48 p-2 align-middle">
              <div className="flex items-center gap-3">
                {player.headshotUrl ? (
                  <img
                    src={player.headshotUrl}
                    alt=""
                    className="h-9 w-9 -mt-1.5 -mb-1 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 -mt-1.5 -mb-1 rounded-full bg-muted shrink-0" />
                )}
                <span className="font-medium truncate">{player.name}</span>
              </div>
            </td>

            <td className="w-16 p-2 text-center align-middle">
              <PositionBadge position={player.position} />
            </td>

            <td className="w-16 p-2 text-center align-middle">
              <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
            </td>

            <td className="w-12 p-2 text-center text-xs align-middle">
              {stats?.gamesPlayed ?? "-"}
            </td>

            <td className="w-2 p-0" />

            <td className="w-12 p-2 text-center align-middle">
              {stats?.fantasyPoints?.toFixed(1) ?? "-"}
            </td>

            <td className="w-12 p-2 text-center align-middle">
              {stats?.pointsPerGame?.toFixed(1) ?? "-"}
            </td>

            {columnGroups.map((group) =>
              group.columns.map((col, colIndex) => (
                <React.Fragment key={col.key}>
                  {colIndex === 0 && <td className="w-2 p-0 hidden md:table-cell" />}
                  <td className={cn(
                    "w-12 p-2 text-center text-sm align-middle",
                    col.wideOnly ? "hidden lg:table-cell" : "hidden md:table-cell"
                  )}>
                    {getStatValue(stats, col.key)}
                  </td>
                </React.Fragment>
              ))
            )}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
