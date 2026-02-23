"use client"

import { memo, useCallback, useMemo, useRef } from "react"
import { useSortable, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { RankedPlayer, FantasyPosition } from "@/lib/types/ranking-schemas"
import { PositionBadge } from "@/components/position-badge"
import { PlayerContextMenuItems, PlayerStats } from "./player-row"
import { cn } from "@/lib/utils"
import { useSelectionBox } from "@/hooks/use-selection-box"

// Position rank computation: for each player, count how many of the same position
// are ranked above them. Returns a map of playerId -> position rank string (e.g. "QB3")
function computePositionRanks(players: RankedPlayer[]): Map<string, string> {
  const map = new Map<string, string>()
  const counts: Record<string, number> = {}
  for (const p of players) {
    counts[p.position] = (counts[p.position] || 0) + 1
    map.set(p.playerId, `${p.position}${counts[p.position]}`)
  }
  return map
}

// Trend arrow based on comparing current rank to ADP position
function TrendArrow({ diff }: { diff: number }) {
  if (diff === 0) return null
  if (diff >= 10) return <ChevronsUp className="h-3.5 w-3.5 text-green-500" />
  if (diff > 0) return <ChevronUp className="h-3.5 w-3.5 text-green-500" />
  if (diff <= -10) return <ChevronsDown className="h-3.5 w-3.5 text-destructive" />
  return <ChevronDown className="h-3.5 w-3.5 text-destructive" />
}

function getStatValue(stats: PlayerStats | undefined, key: string): string | number {
  if (!stats) return "-"
  const value = stats[key as keyof PlayerStats]
  if (value === undefined || value === null) return "-"
  if (typeof value === "number") return Math.round(value)
  return value
}

interface StatGroup {
  label: string
  columns: { key: string; label: string }[]
}

// Get stat groups for the card based on player position
function getStatGroups(position: FantasyPosition): StatGroup[] {
  switch (position) {
    case "QB":
      return [
        {
          label: "PASSING",
          columns: [
            { key: "completions", label: "CMP" },
            { key: "attempts", label: "ATT" },
            { key: "passingYards", label: "YD" },
            { key: "passingTDs", label: "TD" },
            { key: "interceptions", label: "INT" },
          ],
        },
        {
          label: "RUSHING",
          columns: [
            { key: "carries", label: "ATT" },
            { key: "rushingYards", label: "YD" },
            { key: "rushingTDs", label: "TD" },
          ],
        },
      ]
    case "RB":
      return [
        {
          label: "RUSHING",
          columns: [
            { key: "carries", label: "ATT" },
            { key: "rushingYards", label: "YD" },
            { key: "rushingTDs", label: "TD" },
          ],
        },
        {
          label: "RECEIVING",
          columns: [
            { key: "targets", label: "TAR" },
            { key: "receptions", label: "REC" },
            { key: "receivingYards", label: "YD" },
            { key: "receivingTDs", label: "TD" },
          ],
        },
      ]
    case "WR":
    case "TE":
      return [
        {
          label: "RECEIVING",
          columns: [
            { key: "targets", label: "TAR" },
            { key: "receptions", label: "REC" },
            { key: "receivingYards", label: "YD" },
            { key: "receivingTDs", label: "TD" },
          ],
        },
        {
          label: "RUSHING",
          columns: [
            { key: "carries", label: "ATT" },
            { key: "rushingYards", label: "YD" },
            { key: "rushingTDs", label: "TD" },
          ],
        },
      ]
    default:
      return [
        {
          label: "RECEIVING",
          columns: [
            { key: "receptions", label: "REC" },
            { key: "receivingYards", label: "YD" },
          ],
        },
        {
          label: "RUSHING",
          columns: [
            { key: "rushingYards", label: "YD" },
            { key: "rushingTDs", label: "TD" },
          ],
        },
      ]
  }
}

// Stable reference to avoid re-creating on every render
const noAnimations = () => false

interface CardItemProps {
  player: RankedPlayer
  positionRank: string
  stats?: PlayerStats
  adpRank?: number
  isSelected: boolean
  isPlacingTier: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onMoveUp?: (player: RankedPlayer) => void
  onMoveDown?: (player: RankedPlayer) => void
  onRemove?: (player: RankedPlayer) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

const CardItem = memo(function CardItem({
  player,
  positionRank,
  stats,
  adpRank,
  isSelected,
  isPlacingTier,
  onClick,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: CardItemProps) {
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

  const trendDiff = adpRank ? adpRank - player.rank : 0
  const groups = getStatGroups(player.position)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          data-player-card={player.playerId}
          style={style}
          className={cn(
            "group flex gap-0 border bg-card touch-none overflow-hidden",
            isSelected && "shadow-[inset_0_0_0_3px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]",
            isDragging && "opacity-0",
            isPlacingTier ? "cursor-cell" : "cursor-grab active:cursor-grabbing"
          )}
          onClick={(e) => isPlacingTier ? onClick(player) : onSelect(player, e.ctrlKey || e.metaKey)}
          {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
        >
          {/* Left: Headshot */}
          <div className="relative shrink-0 w-[80px]">
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            {/* Rank badge — bottom-left */}
            <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[11px] font-bold px-1.5 py-0.5">
              #{player.rank}
            </div>
            {/* Drag handle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.6))]">
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-between gap-1.5">
            {/* Top: Name + Position + Team + Trend */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClick(player)
                }}
                className="font-semibold truncate hover:underline text-sm leading-tight"
              >
                {player.name}
              </button>
              <PositionBadge position={player.position} />
              <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
              <span className="text-xs font-bold text-foreground">{positionRank}</span>
              {adpRank && trendDiff !== 0 && (
                <span className="flex items-center gap-0.5">
                  <TrendArrow diff={trendDiff} />
                  <span className={cn(
                    "text-[11px] font-medium",
                    trendDiff > 0 ? "text-green-500" : "text-destructive"
                  )}>
                    {trendDiff > 0 ? "+" : ""}{trendDiff}
                  </span>
                </span>
              )}
            </div>

            {/* Stats: Fantasy + position groups, all in one row */}
            <div className="flex items-end gap-3 text-xs">
              {/* Fantasy points */}
              <div className="shrink-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">FPTS</div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold leading-none">
                    {stats?.fantasyPoints?.toFixed(1) ?? "-"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {stats?.pointsPerGame?.toFixed(1) ?? "-"}/g
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {stats?.gamesPlayed ?? "-"}G
                  </span>
                </div>
              </div>

              {/* Stat groups */}
              {groups.map((group) => (
                <div key={group.label} className="flex-none">
                  <div className="flex items-center gap-0.5">
                    <div className="w-px h-6 bg-border mr-1.5" />
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</div>
                      <div className="flex gap-2 mt-0.5">
                        {group.columns.map((col) => (
                          <div key={col.key} className="text-center">
                            <div className="text-sm font-semibold leading-none">
                              {getStatValue(stats, col.key)}
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-tight">
                              {col.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <PlayerContextMenuItems
          player={player}
          isSelected={isSelected}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onClick={onClick}
          onSelect={onSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
})

// Overlay for drag
export function CardItemOverlay({
  player,
  positionRank,
  stats,
}: {
  player: RankedPlayer
  positionRank: string
  stats?: PlayerStats
}) {
  const groups = getStatGroups(player.position)

  return (
    <div className="flex gap-0 border bg-card shadow-lg overflow-hidden">
      <div className="relative shrink-0 w-[80px] h-[76px]">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[11px] font-bold px-1.5 py-0.5">
          #{player.rank}
        </div>
      </div>
      <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{player.name}</span>
          <PositionBadge position={player.position} />
          <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
          <span className="text-xs font-bold text-foreground">{positionRank}</span>
        </div>
        <div className="flex items-end gap-3 text-xs">
          <div className="shrink-0">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">FPTS</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold leading-none">{stats?.fantasyPoints?.toFixed(1) ?? "-"}</span>
              <span className="text-[11px] text-muted-foreground">{stats?.pointsPerGame?.toFixed(1) ?? "-"}/g</span>
            </div>
          </div>
          {groups.map((group) => (
            <div key={group.label} className="flex-none">
              <div className="flex items-center gap-0.5">
                <div className="w-px h-6 bg-border mr-1.5" />
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</div>
                  <div className="flex gap-2 mt-0.5">
                    {group.columns.map((col) => (
                      <div key={col.key} className="text-center">
                        <div className="text-sm font-semibold leading-none">{getStatValue(stats, col.key)}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{col.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PlayerStatsMap {
  [playerId: string]: PlayerStats
}

interface CardViewProps {
  players: RankedPlayer[]
  playerStats: PlayerStatsMap
  adpMap?: Map<string, number>
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onBatchSelect?: (ids: Set<string>) => void
  onMoveUp: (player: RankedPlayer) => void
  onMoveDown: (player: RankedPlayer) => void
  onRemovePlayer?: (player: RankedPlayer) => void
  className?: string
}

export function CardView({
  players,
  playerStats,
  adpMap,
  isPlacingTier,
  selectedPlayerIds,
  onPlayerClick,
  onPlayerSelect,
  onBatchSelect,
  onMoveUp,
  onMoveDown,
  onRemovePlayer,
  className,
}: CardViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSelectionComplete = useCallback(
    (ids: Set<string>) => {
      if (ids.size > 0 && onBatchSelect) {
        onBatchSelect(ids)
      }
    },
    [onBatchSelect]
  )

  const { selectionBoxStyle, selectionBoxRef } = useSelectionBox(
    scrollRef,
    handleSelectionComplete,
    !isPlacingTier
  )

  const positionRanks = useMemo(() => computePositionRanks(players), [players])

  const sortableItems = useMemo(
    () => players.map((p) => p.playerId),
    [players]
  )

  return (
    <div
      ref={scrollRef}
      className={cn(
        "border overflow-auto max-h-[calc(100vh-320px)] bg-card rounded-md relative",
        className
      )}
    >
      {selectionBoxStyle && (
        <div ref={selectionBoxRef} style={selectionBoxStyle} />
      )}
      <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
          {players.map((player, index) => (
            <CardItem
              key={player.playerId}
              player={player}
              positionRank={positionRanks.get(player.playerId) ?? ""}
              stats={playerStats[player.playerId]}
              adpRank={adpMap?.get(player.playerId)}
              isSelected={!isPlacingTier && selectedPlayerIds.has(player.playerId)}
              isPlacingTier={isPlacingTier}
              onClick={onPlayerClick}
              onSelect={isPlacingTier ? onPlayerClick : onPlayerSelect}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onRemove={onRemovePlayer}
              canMoveUp={index > 0}
              canMoveDown={index < players.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
