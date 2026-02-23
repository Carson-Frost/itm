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
import { PlayerContextMenuItems, PlayerStats } from "./player-row"
import { cn } from "@/lib/utils"
import { useSelectionBox } from "@/hooks/use-selection-box"

function computePositionRanks(players: RankedPlayer[]): Map<string, string> {
  const map = new Map<string, string>()
  const counts: Record<string, number> = {}
  for (const p of players) {
    counts[p.position] = (counts[p.position] || 0) + 1
    map.set(p.playerId, `${p.position}${counts[p.position]}`)
  }
  return map
}

const positionColors: Record<string, string> = {
  QB: "text-red-500 dark:text-red-400",
  RB: "text-emerald-500 dark:text-emerald-400",
  WR: "text-sky-500 dark:text-sky-400",
  TE: "text-orange-500 dark:text-orange-400",
}

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

const noAnimations = () => false

// Vertical divider between sections
function Divider() {
  return <div className="w-px self-stretch bg-border shrink-0" />
}

// Stat section: group label on top, stat columns below with value/label
function StatSection({ group, stats }: { group: StatGroup; stats?: PlayerStats }) {
  return (
    <div className="flex flex-col justify-center gap-0.5 shrink-0">
      <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
        {group.label}
      </div>
      <div className="flex gap-2.5">
        {group.columns.map((col) => (
          <div key={col.key} className="text-center min-w-[24px]">
            <div className="text-xs font-bold leading-none">
              {getStatValue(stats, col.key)}
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {col.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
            "group flex items-center gap-2.5 border-b bg-card touch-none h-[56px] px-2",
            isSelected && "shadow-[inset_0_0_0_3px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]",
            isDragging && "opacity-0",
            isPlacingTier ? "cursor-cell" : "cursor-grab active:cursor-grabbing"
          )}
          onClick={(e) => isPlacingTier ? onClick(player) : onSelect(player, e.ctrlKey || e.metaKey)}
          {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
        >
          {/* Drag handle */}
          <div className="shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Rank */}
          <div className="shrink-0 w-[28px] text-center font-bold text-sm text-muted-foreground">
            {player.rank}
          </div>

          {/* Headshot */}
          <div className="shrink-0 w-[40px] h-[40px] overflow-hidden bg-muted">
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>

          {/* Name block */}
          <div className="shrink-0 w-[140px] min-w-0 flex flex-col justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick(player)
              }}
              className="font-bold text-sm uppercase truncate hover:underline text-left leading-tight"
            >
              {player.name}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-[11px] font-semibold",
                positionColors[player.position] || "text-muted-foreground"
              )}>
                {player.position}
              </span>
              <span className="text-[11px] text-muted-foreground">{player.team || "FA"}</span>
            </div>
          </div>

          <Divider />

          {/* Position rank */}
          <div className="shrink-0 w-[44px] flex items-center justify-center">
            <span className={cn(
              "text-base font-extrabold leading-none",
              positionColors[player.position] || "text-muted-foreground"
            )}>
              {positionRank}
            </span>
          </div>

          <Divider />

          {/* Fantasy points */}
          <div className="shrink-0 flex flex-col justify-center gap-0.5 w-[80px]">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
              FPTS
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold leading-none">
                {stats?.fantasyPoints?.toFixed(1) ?? "-"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stats?.pointsPerGame?.toFixed(1) ?? "-"}/g
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground leading-none">
              {stats?.gamesPlayed ?? "-"}G
            </div>
          </div>

          <Divider />

          {/* Stat groups */}
          {groups.map((group, i) => (
            <div key={group.label} className="contents">
              <StatSection group={group} stats={stats} />
              {i < groups.length - 1 && <Divider />}
            </div>
          ))}

          {/* ADP trend — pushed to far right */}
          <div className="ml-auto shrink-0 w-[48px] flex items-center justify-end gap-0.5">
            {adpRank && trendDiff !== 0 ? (
              <>
                <TrendArrow diff={trendDiff} />
                <span className={cn(
                  "text-[11px] font-semibold",
                  trendDiff > 0 ? "text-green-500" : "text-destructive"
                )}>
                  {trendDiff > 0 ? "+" : ""}{trendDiff}
                </span>
              </>
            ) : null}
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
    <div className="flex items-center gap-2.5 border bg-card shadow-lg h-[56px] px-2">
      {/* Drag handle placeholder */}
      <div className="shrink-0 text-muted-foreground/40">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Rank */}
      <div className="shrink-0 w-[28px] text-center font-bold text-sm text-muted-foreground">
        {player.rank}
      </div>

      {/* Headshot */}
      <div className="shrink-0 w-[40px] h-[40px] overflow-hidden bg-muted">
        {player.headshotUrl ? (
          <img src={player.headshotUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* Name block */}
      <div className="shrink-0 w-[140px] min-w-0 flex flex-col justify-center">
        <span className="font-bold text-sm uppercase truncate leading-tight">{player.name}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            "text-[11px] font-semibold",
            positionColors[player.position] || "text-muted-foreground"
          )}>
            {player.position}
          </span>
          <span className="text-[11px] text-muted-foreground">{player.team || "FA"}</span>
        </div>
      </div>

      <Divider />

      {/* Position rank */}
      <div className="shrink-0 w-[44px] flex items-center justify-center">
        <span className={cn(
          "text-base font-extrabold leading-none",
          positionColors[player.position] || "text-muted-foreground"
        )}>
          {positionRank}
        </span>
      </div>

      <Divider />

      {/* Fantasy points */}
      <div className="shrink-0 flex flex-col justify-center gap-0.5 w-[80px]">
        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">FPTS</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold leading-none">{stats?.fantasyPoints?.toFixed(1) ?? "-"}</span>
          <span className="text-[10px] text-muted-foreground">{stats?.pointsPerGame?.toFixed(1) ?? "-"}/g</span>
        </div>
      </div>

      <Divider />

      {/* Stat groups */}
      {groups.map((group, i) => (
        <div key={group.label} className="contents">
          <StatSection group={group} stats={stats} />
          {i < groups.length - 1 && <Divider />}
        </div>
      ))}
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
        <div className="flex flex-col">
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
