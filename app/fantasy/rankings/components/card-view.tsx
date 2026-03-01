"use client"

import { memo, useCallback, useMemo, useRef, useState, useEffect } from "react"
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useVirtualizer } from "@tanstack/react-virtual"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { RankedPlayer, TierSeparator, FantasyPosition, DisplayItem } from "@/lib/types/ranking-schemas"
import { PlayerContextMenuItems, PlayerStats, RosterInfo } from "./player-row"
import { TierContextMenuItems } from "./tier-row"
import { PositionBadge } from "@/components/position-badge"
import { generateTierColor, getItemId } from "@/lib/tier-utils"
import { cn } from "@/lib/utils"
import { useSelectionBox } from "@/hooks/use-selection-box"

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamOffenseStats {
  passYards: number
  rushYards: number
  totalTDs: number
}

// ─── Position colors ────────────────────────────────────────────────────────

const positionColors: Record<string, string> = {
  QB: "text-red-500 dark:text-red-400",
  RB: "text-emerald-500 dark:text-emerald-400",
  WR: "text-sky-500 dark:text-sky-400",
  TE: "text-orange-500 dark:text-orange-400",
}

// ─── (chamfer removed — cards now render as connected rows) ─────────────────

// ─── Helpers ────────────────────────────────────────────────────────────────

function computePositionRanks(players: RankedPlayer[]): Map<string, string> {
  const map = new Map<string, string>()
  const counts: Record<string, number> = {}
  for (const p of players) {
    counts[p.position] = (counts[p.position] || 0) + 1
    map.set(p.playerId, `${p.position}${counts[p.position]}`)
  }
  return map
}

function formatHeight(inches: number | undefined): string {
  if (!inches) return ""
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function fmt(val: number | undefined, dec = 0): string {
  if (val === undefined || val === null) return "-"
  if (dec > 0) return val.toFixed(dec)
  return Math.round(val).toLocaleString()
}

function pct(val: number | undefined): string {
  if (val === undefined || val === null) return "-"
  return `${(val * 100).toFixed(1)}%`
}

function barColor(ratio: number): string {
  if (ratio < 0.33) return "bg-red-400/60 dark:bg-red-500/50"
  if (ratio < 0.66) return "bg-amber-400/60 dark:bg-amber-400/50"
  return "bg-sky-400/60 dark:bg-sky-400/50"
}

const noAnimations = () => false

// ─── Vertical separator (partial height, centered) ──────────────────────────

function Sep() {
  return (
    <div className="flex items-center self-stretch shrink-0">
      <div className="w-px h-3/5 bg-border" />
    </div>
  )
}

// ─── Stat cell ──────────────────────────────────────────────────────────────

function SC({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className={cn("text-center", small ? "min-w-[24px]" : "min-w-[30px]")}>
      <div className={cn(
        "font-bold leading-none tabular-nums",
        small ? "text-[11px] text-foreground/80" : "text-[13px]"
      )}>
        {value}
      </div>
      <div className={cn(
        "text-muted-foreground/60 leading-tight mt-0.5 uppercase tracking-wider font-medium",
        small ? "text-[7px]" : "text-[8px]"
      )}>
        {label}
      </div>
    </div>
  )
}

// ─── Usage bar ──────────────────────────────────────────────────────────────

function UBar({
  label,
  value,
  display,
  max,
}: {
  label: string
  value: number | undefined
  display: string
  max: number
}) {
  const ratio = value !== undefined ? Math.min(Math.max(value / max, 0), 1) : 0

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-muted-foreground/60 w-[30px] text-right shrink-0 uppercase tracking-wider font-medium">
        {label}
      </span>
      <div className="flex-1 h-[6px] bg-muted-foreground/12 overflow-hidden min-w-[44px]">
        <div
          className={cn("h-full transition-all", barColor(ratio))}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums w-[38px] text-right">{display}</span>
    </div>
  )
}

// ─── Stat group definitions ─────────────────────────────────────────────────

interface SDef { key: keyof PlayerStats; label: string }

function getMainDefs(pos: FantasyPosition): { label: string; row1: SDef[]; row2: SDef[] } {
  switch (pos) {
    case "QB": return {
      label: "PASSING",
      row1: [
        { key: "completions", label: "CMP" }, { key: "attempts", label: "ATT" },
        { key: "passingYards", label: "YD" }, { key: "passingTDs", label: "TD" },
        { key: "interceptions", label: "INT" },
      ],
      row2: [
        { key: "passingFirstDowns", label: "1stD" }, { key: "passingYac", label: "YAC" },
        { key: "passingEpa", label: "EPA" }, { key: "passingCpoe", label: "CPOE" },
      ],
    }
    case "RB": return {
      label: "RUSHING",
      row1: [
        { key: "carries", label: "ATT" }, { key: "rushingYards", label: "YD" },
        { key: "rushingTDs", label: "TD" },
      ],
      row2: [
        { key: "rushingFirstDowns", label: "1stD" }, { key: "rushingEpa", label: "EPA" },
      ],
    }
    default: return {
      label: "RECEIVING",
      row1: [
        { key: "targets", label: "TAR" }, { key: "receptions", label: "REC" },
        { key: "receivingYards", label: "YD" }, { key: "receivingTDs", label: "TD" },
      ],
      row2: [
        { key: "receivingYac", label: "YAC" }, { key: "receivingFirstDowns", label: "1stD" },
        { key: "receivingEpa", label: "EPA" },
      ],
    }
  }
}

function getSecDefs(pos: FantasyPosition): { label: string; row1: SDef[]; row2: SDef[] } {
  switch (pos) {
    case "QB": return {
      label: "RUSHING",
      row1: [
        { key: "carries", label: "ATT" }, { key: "rushingYards", label: "YD" },
        { key: "rushingTDs", label: "TD" },
      ],
      row2: [
        { key: "rushingFirstDowns", label: "1stD" }, { key: "rushingEpa", label: "EPA" },
      ],
    }
    case "RB": return {
      label: "RECEIVING",
      row1: [
        { key: "targets", label: "TAR" }, { key: "receptions", label: "REC" },
        { key: "receivingYards", label: "YD" }, { key: "receivingTDs", label: "TD" },
      ],
      row2: [
        { key: "receivingYac", label: "YAC" }, { key: "receivingFirstDowns", label: "1stD" },
      ],
    }
    default: return {
      label: "RUSHING",
      row1: [
        { key: "carries", label: "ATT" }, { key: "rushingYards", label: "YD" },
        { key: "rushingTDs", label: "TD" },
      ],
      row2: [],
    }
  }
}

function fmtStat(stats: PlayerStats | undefined, key: keyof PlayerStats): string | number {
  if (!stats) return "-"
  const val = stats[key]
  if (val === undefined || val === null) return "-"
  if (typeof val !== "number") return "-"
  if (key === "passingEpa" || key === "rushingEpa" || key === "receivingEpa" || key === "passingCpoe") {
    return val.toFixed(1)
  }
  if (key === "passingYac" || key === "receivingYac") return fmt(val)
  return fmt(val)
}

// ─── Two-row stat section ───────────────────────────────────────────────────

function StatBlock({ label, row1, row2, stats }: {
  label: string
  row1: SDef[]
  row2: SDef[]
  stats?: PlayerStats
}) {
  return (
    <div className="flex flex-col justify-center gap-0.5 shrink-0 py-1.5">
      <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none">
        {label}
      </div>
      <div className="flex gap-2.5">
        {row1.map((d) => (
          <SC key={d.key} label={d.label} value={fmtStat(stats, d.key)} />
        ))}
      </div>
      {row2.length > 0 && (
        <div className="flex gap-2.5 mt-0.5">
          {row2.map((d) => (
            <SC key={d.key} label={d.label} value={fmtStat(stats, d.key)} small />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Usage section per position ─────────────────────────────────────────────

function UsageBlock({ stats, position }: { stats?: PlayerStats; position: string }) {
  if (position === "QB") {
    const compPct = stats?.attempts && stats?.completions ? stats.completions / stats.attempts : undefined
    return (
      <div className="flex flex-col justify-center gap-0.5 w-[150px] shrink-0 py-1.5">
        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none mb-0.5">
          EFFICIENCY
        </div>
        <UBar label="CMP%" value={compPct} display={compPct !== undefined ? `${(compPct * 100).toFixed(1)}%` : "-"} max={0.72} />
        <UBar label="CPOE" value={stats?.passingCpoe !== undefined ? (stats.passingCpoe + 5) / 10 : undefined} display={stats?.passingCpoe !== undefined ? `${stats.passingCpoe > 0 ? "+" : ""}${stats.passingCpoe.toFixed(1)}` : "-"} max={1} />
        <UBar label="EPA" value={stats?.passingEpa !== undefined ? Math.max(0, stats.passingEpa) : undefined} display={stats?.passingEpa !== undefined ? fmt(stats.passingEpa, 1) : "-"} max={80} />
      </div>
    )
  }
  if (position === "RB") {
    return (
      <div className="flex flex-col justify-center gap-0.5 w-[150px] shrink-0 py-1.5">
        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none mb-0.5">
          USAGE
        </div>
        <UBar label="TGT%" value={stats?.targetShare} display={pct(stats?.targetShare)} max={0.18} />
        <UBar label="R-EPA" value={stats?.rushingEpa !== undefined ? Math.max(0, stats.rushingEpa) : undefined} display={stats?.rushingEpa !== undefined ? fmt(stats.rushingEpa, 1) : "-"} max={40} />
        <UBar label="1stD" value={stats?.rushingFirstDowns} display={fmt(stats?.rushingFirstDowns)} max={80} />
      </div>
    )
  }
  return (
    <div className="flex flex-col justify-center gap-0.5 w-[150px] shrink-0 py-1.5">
      <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none mb-0.5">
        USAGE
      </div>
      <UBar label="TGT%" value={stats?.targetShare} display={pct(stats?.targetShare)} max={0.30} />
      <UBar label="ADOT" value={stats?.airYardsShare} display={pct(stats?.airYardsShare)} max={0.40} />
      <UBar label="WOPR" value={stats?.wopr} display={stats?.wopr !== undefined ? stats.wopr.toFixed(2) : "-"} max={0.65} />
    </div>
  )
}

// ─── Team offense section ───────────────────────────────────────────────────

function TeamBlock({ teamStats }: { teamStats?: TeamOffenseStats }) {
  return (
    <div className="flex flex-col justify-center gap-0.5 shrink-0 py-1.5 w-[82px]">
      <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none">
        TEAM OFF
      </div>
      <div className="flex gap-2">
        <SC label="PASS" value={teamStats ? fmt(teamStats.passYards) : "-"} small />
        <SC label="RUSH" value={teamStats ? fmt(teamStats.rushYards) : "-"} small />
      </div>
      <div className="flex gap-2 mt-0.5">
        <SC label="TDs" value={teamStats ? fmt(teamStats.totalTDs) : "-"} small />
      </div>
    </div>
  )
}

// ─── Tier separator ─────────────────────────────────────────────────────────

const CardTierSeparator = memo(function CardTierSeparator({
  tier, index, onRemove, onRename,
}: {
  tier: TierSeparator; index: number
  onRemove: (tier: TierSeparator) => void
  onRename: (tierId: string, newLabel: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(tier.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const renamingFromMenu = useRef(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tier.id, animateLayoutChanges: noAnimations,
  })
  const style = isDragging ? undefined : { transform: CSS.Transform.toString(transform), transition }
  const color = tier.color || generateTierColor(index)

  useEffect(() => {
    if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() }
  }, [isEditing])

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== tier.label) onRename(tier.id, trimmed)
    setIsEditing(false)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef} style={style}
          className={cn("flex items-center gap-2 px-4 h-10 touch-none cursor-grab active:cursor-grabbing group border-b border-border/20", isDragging && "opacity-0")}
          {...attributes} {...listeners}
        >
          <div className="flex-1 h-[3px] group-hover:h-[5px] transition-all duration-150" style={{ backgroundColor: color }} />
          {isEditing ? (
            <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditValue(tier.label); setIsEditing(false) } }}
              onPointerDown={(e) => e.stopPropagation()} autoComplete="off"
              className="text-[0.75rem] font-bold whitespace-nowrap px-1 w-24 bg-transparent border text-center outline-none cursor-text"
              style={{ color, borderColor: color }} />
          ) : (
            <button onClick={() => { setEditValue(tier.label); setIsEditing(true) }} onPointerDown={(e) => e.stopPropagation()}
              className="text-[0.75rem] font-bold whitespace-nowrap px-2 hover:underline cursor-pointer" style={{ color }}>
              {tier.label}
            </button>
          )}
          <div className="flex-1 h-[3px] group-hover:h-[5px] transition-all duration-150" style={{ backgroundColor: color }} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(e) => { if (renamingFromMenu.current) { e.preventDefault(); renamingFromMenu.current = false; inputRef.current?.focus(); inputRef.current?.select() } }}>
        <TierContextMenuItems
          onRename={() => { renamingFromMenu.current = true; setEditValue(tier.label); setIsEditing(true) }}
          onDelete={() => onRemove(tier)} />
      </ContextMenuContent>
    </ContextMenu>
  )
})

// ─── Player card ────────────────────────────────────────────────────────────

interface CardItemProps {
  player: RankedPlayer
  positionRank: string
  stats?: PlayerStats
  roster?: RosterInfo
  teamOffense?: TeamOffenseStats
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
  player, positionRank, stats, roster, teamOffense, isSelected, isPlacingTier,
  onClick, onSelect, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown,
}: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.playerId, animateLayoutChanges: noAnimations,
  })
  const cardStyle = isDragging ? undefined : { transform: CSS.Transform.toString(transform), transition }

  const main = getMainDefs(player.position)
  const sec = getSecDefs(player.position)

  const bio: string[] = []
  if (roster?.height || roster?.weight) {
    const hw = []
    if (roster.height) hw.push(formatHeight(roster.height))
    if (roster.weight) hw.push(`${roster.weight} lbs`)
    bio.push(hw.join(", "))
  }
  if (roster?.college) bio.push(roster.college)
  const bioLine = bio.join(" · ")

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          data-player-card={player.playerId}
          style={cardStyle}
          className={cn(
            "touch-none group bg-background border-b border-border/20 last:border-b-0",
            isSelected && "shadow-[inset_0_0_0_2px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]",
            isDragging && "opacity-0",
            isPlacingTier ? "hover:bg-primary/10 cursor-cell" : "cursor-grab active:cursor-grabbing"
          )}
          onClick={(e) => isPlacingTier ? onClick(player) : onSelect(player, e.ctrlKey || e.metaKey)}
          {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
        >
          <div className="flex min-h-[110px]">
            {/* Grip / rank area */}
            <div className="w-10 shrink-0 flex items-center justify-center relative">
              <span className="text-sm font-medium text-muted-foreground group-hover:opacity-0 transition-opacity">{player.rank}</span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Headshot */}
            <div className="w-[110px] shrink-0 self-stretch relative overflow-hidden">
              {player.headshotUrl ? (
                <img
                  src={player.headshotUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              ) : (
                <div className="absolute inset-0" />
              )}
            </div>

            {/* ─── Right side ─── */}
            <div className="flex-1 flex min-w-0">
              <div className="flex-1 flex items-stretch min-w-0">
                {/* Identity */}
                <div className="w-[155px] shrink-0 flex flex-col justify-center px-3 min-w-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClick(player) }}
                    className="font-bold text-[15px] uppercase truncate hover:underline text-left leading-tight"
                  >
                    {player.name}
                  </button>
                  <div className="flex items-center gap-1.5 mt-1">
                    <PositionBadge position={player.position} />
                    <span className="text-[11px] text-muted-foreground font-medium">{player.team || "FA"}</span>
                  </div>
                  {bioLine && (
                    <div className="text-[10px] text-muted-foreground/60 mt-1 truncate leading-tight">{bioLine}</div>
                  )}
                </div>

                <Sep />

                {/* Rank & fantasy points */}
                <div className="w-[85px] shrink-0 flex flex-col items-center justify-center px-1.5">
                  <span className={cn(
                    "text-xl font-extrabold leading-none tracking-tight",
                    positionColors[player.position] || "text-muted-foreground"
                  )}>
                    {positionRank}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 mt-0.5">#{player.rank} OVR</span>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-sm font-bold tabular-nums leading-none">{stats?.pointsPerGame?.toFixed(1) ?? "-"}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">PPG</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">{stats?.fantasyPoints?.toFixed(1) ?? "-"} pts</span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">{stats?.gamesPlayed ?? "-"}G</span>
                  </div>
                </div>

                <Sep />

                {/* Main stats */}
                <div className="shrink-0 flex items-center px-2.5">
                  <StatBlock label={main.label} row1={main.row1} row2={main.row2} stats={stats} />
                </div>

                <Sep />

                {/* Secondary stats */}
                <div className="shrink-0 flex items-center px-2.5">
                  <StatBlock label={sec.label} row1={sec.row1} row2={sec.row2} stats={stats} />
                </div>

                <Sep />

                {/* Usage bars */}
                <div className="shrink-0 flex items-center px-2.5">
                  <UsageBlock stats={stats} position={player.position} />
                </div>

                <Sep />

                {/* Team offense */}
                <div className="shrink-0 flex items-center px-2.5">
                  <TeamBlock teamStats={teamOffense} />
                </div>

                {/* Spacer for future content */}
                <div className="flex-1" />
              </div>

            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <PlayerContextMenuItems
          player={player} isSelected={isSelected} canMoveUp={canMoveUp} canMoveDown={canMoveDown}
          onClick={onClick} onSelect={onSelect} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onRemove={onRemove}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
})

// ─── Drag overlay ───────────────────────────────────────────────────────────

export function CardItemOverlay({ player, positionRank, stats }: {
  player: RankedPlayer; positionRank: string; stats?: PlayerStats
}) {
  const main = getMainDefs(player.position)
  const sec = getSecDefs(player.position)

  return (
    <div className="bg-background border border-border shadow-lg">
      <div className="flex min-h-[110px]">
        {/* Grip / rank area */}
        <div className="w-10 shrink-0 flex items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">{player.rank}</span>
        </div>

        {/* Headshot */}
        <div className="w-[110px] shrink-0 self-stretch relative overflow-hidden">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : <div className="absolute inset-0" />}
        </div>

        {/* Right side */}
        <div className="flex-1 flex items-stretch min-w-0">
          {/* Identity */}
          <div className="w-[155px] shrink-0 flex flex-col justify-center px-3 min-w-0">
            <span className="font-bold text-[15px] uppercase truncate leading-tight">{player.name}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <PositionBadge position={player.position} />
              <span className="text-[11px] text-muted-foreground font-medium">{player.team || "FA"}</span>
            </div>
          </div>

          <Sep />

          {/* Rank */}
          <div className="w-[85px] shrink-0 flex flex-col items-center justify-center px-1.5">
            <span className={cn("text-xl font-extrabold leading-none tracking-tight", positionColors[player.position])}>
              {positionRank}
            </span>
            <span className="text-[10px] text-muted-foreground/70 mt-0.5">#{player.rank} OVR</span>
            <div className="flex flex-col items-center mt-2">
              <span className="text-sm font-bold tabular-nums leading-none">{stats?.pointsPerGame?.toFixed(1) ?? "-"}</span>
              <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">PPG</span>
            </div>
          </div>

          <Sep />

          {/* Main stats */}
          <div className="shrink-0 flex items-center px-2.5">
            <StatBlock label={main.label} row1={main.row1} row2={main.row2} stats={stats} />
          </div>

          <Sep />

          {/* Secondary stats */}
          <div className="shrink-0 flex items-center px-2.5">
            <StatBlock label={sec.label} row1={sec.row1} row2={sec.row2} stats={stats} />
          </div>

          <Sep />

          {/* Usage bars */}
          <div className="shrink-0 flex items-center px-2.5">
            <UsageBlock stats={stats} position={player.position} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CardTierOverlay({ tier, index }: { tier: TierSeparator; index: number }) {
  const color = tier.color || generateTierColor(index)
  return (
    <div className="flex items-center gap-2 px-4 h-7 bg-background shadow-lg">
      <div className="flex-1 h-[3px]" style={{ backgroundColor: color }} />
      <span className="text-[0.75rem] font-bold whitespace-nowrap px-2" style={{ color }}>{tier.label}</span>
      <div className="flex-1 h-[3px]" style={{ backgroundColor: color }} />
    </div>
  )
}

// ─── Main CardView ──────────────────────────────────────────────────────────

interface PlayerStatsMap { [playerId: string]: PlayerStats }
interface RosterInfoMap { [playerId: string]: RosterInfo }
interface TeamStatsMap { [team: string]: TeamOffenseStats }

interface CardViewProps {
  displayItems: DisplayItem[]
  allPlayers: RankedPlayer[]
  playerStats: PlayerStatsMap
  rosterInfo: RosterInfoMap
  teamStats: TeamStatsMap
  tierIndexMap: Map<string, number>
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onBatchSelect?: (ids: Set<string>) => void
  onMoveUp: (player: RankedPlayer) => void
  onMoveDown: (player: RankedPlayer) => void
  onRemovePlayer?: (player: RankedPlayer) => void
  onTierRename: (tierId: string, newLabel: string) => void
  onTierRemove: (tier: TierSeparator) => void
  className?: string
}

export function CardView({
  displayItems, allPlayers, playerStats, rosterInfo, teamStats, tierIndexMap,
  isPlacingTier, selectedPlayerIds, onPlayerClick, onPlayerSelect, onBatchSelect,
  onMoveUp, onMoveDown, onRemovePlayer, onTierRename, onTierRemove, className,
}: CardViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSelectionComplete = useCallback(
    (ids: Set<string>) => { if (ids.size > 0 && onBatchSelect) onBatchSelect(ids) },
    [onBatchSelect]
  )

  const { selectionBoxStyle, selectionBoxRef } = useSelectionBox(scrollRef, handleSelectionComplete, !isPlacingTier)
  const positionRanks = useMemo(() => computePositionRanks(allPlayers), [allPlayers])
  const sortableItems = useMemo(() => displayItems.map(getItemId), [displayItems])

  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => displayItems[index]?.type === "tier" ? 40 : 110,
    overscan: 5,
  })
  const virtualRows = virtualizer.getVirtualItems()

  return (
    <div
      ref={scrollRef}
      className={cn("border overflow-auto max-h-[calc(100vh-320px)] bg-background relative", className)}
    >
      {selectionBoxStyle && <div ref={selectionBoxRef} style={selectionBoxStyle} />}
      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualRows.length > 0 && virtualRows[0].start > 0 && (
            <div style={{ height: virtualRows[0].start }} />
          )}
          {virtualRows.map((virtualRow) => {
            const item = displayItems[virtualRow.index]
            if (item.type === "tier") {
              return (
                <CardTierSeparator
                  key={item.data.id} tier={item.data}
                  index={tierIndexMap.get(item.data.id) ?? 0}
                  onRemove={onTierRemove} onRename={onTierRename}
                />
              )
            }
            const player = item.data
            const displayIndex = virtualRow.index
            return (
              <CardItem
                key={player.playerId} player={player}
                positionRank={positionRanks.get(player.playerId) ?? ""}
                stats={playerStats[player.playerId]}
                roster={rosterInfo[player.playerId]}
                teamOffense={teamStats[player.team]}
                isSelected={!isPlacingTier && selectedPlayerIds.has(player.playerId)}
                isPlacingTier={isPlacingTier}
                onClick={onPlayerClick}
                onSelect={isPlacingTier ? onPlayerClick : onPlayerSelect}
                onMoveUp={onMoveUp} onMoveDown={onMoveDown}
                onRemove={onRemovePlayer}
                canMoveUp={displayIndex > 0} canMoveDown={displayIndex < displayItems.length - 1}
              />
            )
          })}
          {virtualRows.length > 0 && (
            <div style={{ height: virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end }} />
          )}
        </div>
      </SortableContext>
    </div>
  )
}
