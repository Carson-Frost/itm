"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PositionBadge } from "@/components/position-badge"
import { Player, Position } from "@/lib/types/player"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import type { StatView } from "./filters"

type SortField = 'rank' | 'name' | 'fantasyPoints' | 'pointsPerGame' | 'carries' | 'rushingYards' | 'rushingTDs' | 'targets' | 'receptions' | 'receivingYards' | 'receivingTDs' | 'attempts' | 'completions' | 'passingYards' | 'passingTDs' | 'interceptions' | 'sacks' | 'rushingFumbles' | 'receivingFumbles' | 'targetShare' | 'airYardsShare' | 'wopr' | 'racr' | 'receivingEpa' | 'rushingEpa' | 'passingEpa' | 'passingCpoe' | 'receivingYac' | 'passingYac' | 'receivingFirstDowns' | 'rushingFirstDowns' | 'passingFirstDowns'
type SortDirection = 'asc' | 'desc'

interface ColumnDef {
  key: SortField
  label: string
  fullName: string
  format?: (v: number) => string
}

const fmt1 = (v: number) => v.toFixed(1)
const fmtPct = (v: number) => (v * 100).toFixed(1) + "%"
const fmtDec2 = (v: number) => v.toFixed(2)

// "All" mode columns
const allRushingColumns: ColumnDef[] = [
  { key: 'carries', label: 'ATT', fullName: 'Rushing Attempts' },
  { key: 'rushingYards', label: 'YD', fullName: 'Rushing Yards' },
  { key: 'rushingTDs', label: 'TD', fullName: 'Rushing Touchdowns' },
  { key: 'rushingFumbles', label: 'FUM', fullName: 'Fumbles' },
]

const allReceivingColumns: ColumnDef[] = [
  { key: 'targets', label: 'TAR', fullName: 'Targets' },
  { key: 'receptions', label: 'REC', fullName: 'Receptions' },
  { key: 'receivingYards', label: 'YD', fullName: 'Receiving Yards' },
  { key: 'receivingTDs', label: 'TD', fullName: 'Receiving Touchdowns' },
]

const allPassingColumns: ColumnDef[] = [
  { key: 'attempts', label: 'ATT', fullName: 'Passing Attempts' },
  { key: 'completions', label: 'CMP', fullName: 'Completions' },
  { key: 'passingYards', label: 'YD', fullName: 'Passing Yards' },
  { key: 'passingTDs', label: 'TD', fullName: 'Passing Touchdowns' },
  { key: 'interceptions', label: 'INT', fullName: 'Interceptions' },
  { key: 'sacks', label: 'SACK', fullName: 'Sacks' },
]

// Expanded mode columns
const expandedPassingColumns: ColumnDef[] = [
  { key: 'attempts', label: 'ATT', fullName: 'Passing Attempts' },
  { key: 'completions', label: 'CMP', fullName: 'Completions' },
  { key: 'passingYards', label: 'YD', fullName: 'Passing Yards' },
  { key: 'passingTDs', label: 'TD', fullName: 'Passing Touchdowns' },
  { key: 'interceptions', label: 'INT', fullName: 'Interceptions' },
  { key: 'sacks', label: 'SACK', fullName: 'Sacks' },
  { key: 'passingYac', label: 'YAC', fullName: 'Yards After Catch' },
  { key: 'passingFirstDowns', label: '1ST', fullName: 'First Downs' },
  { key: 'passingEpa', label: 'EPA', fullName: 'Passing EPA', format: fmt1 },
  { key: 'passingCpoe', label: 'CPOE', fullName: 'Completion % Over Expected', format: fmt1 },
]

const expandedRushingColumns: ColumnDef[] = [
  { key: 'carries', label: 'ATT', fullName: 'Rushing Attempts' },
  { key: 'rushingYards', label: 'YD', fullName: 'Rushing Yards' },
  { key: 'rushingTDs', label: 'TD', fullName: 'Rushing Touchdowns' },
  { key: 'rushingFumbles', label: 'FUM', fullName: 'Fumbles' },
  { key: 'rushingFirstDowns', label: '1ST', fullName: 'First Downs' },
  { key: 'rushingEpa', label: 'EPA', fullName: 'Rushing EPA', format: fmt1 },
]

const expandedReceivingColumns: ColumnDef[] = [
  { key: 'targets', label: 'TAR', fullName: 'Targets' },
  { key: 'receptions', label: 'REC', fullName: 'Receptions' },
  { key: 'receivingYards', label: 'YD', fullName: 'Receiving Yards' },
  { key: 'receivingTDs', label: 'TD', fullName: 'Receiving Touchdowns' },
  { key: 'receivingFumbles', label: 'FUM', fullName: 'Fumbles' },
  { key: 'receivingYac', label: 'YAC', fullName: 'Yards After Catch' },
  { key: 'receivingFirstDowns', label: '1ST', fullName: 'First Downs' },
  { key: 'receivingEpa', label: 'EPA', fullName: 'Receiving EPA', format: fmt1 },
  { key: 'targetShare', label: 'TAR%', fullName: 'Target Share', format: fmtPct },
  { key: 'airYardsShare', label: 'AIR%', fullName: 'Air Yards Share', format: fmtPct },
  { key: 'wopr', label: 'WOPR', fullName: 'Weighted Opportunity Rating', format: fmtDec2 },
  { key: 'racr', label: 'RACR', fullName: 'Receiver Air Conversion Ratio', format: fmtDec2 },
]

interface PlayerTableProps {
  players: Player[]
  selectedPosition: Position | 'ALL'
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onPlayerClick: (player: Player) => void
  statView: StatView
}

function SortableHeader({
  field,
  label,
  fullName,
  currentField,
  direction,
  onSort,
  className,
}: {
  field: SortField
  label: string
  fullName?: string
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentField === field

  return (
    <TableHead className={cn(className)}>
      <button
        onClick={() => onSort(field)}
        className="hover:text-foreground transition-colors font-medium w-full text-center"
        title={fullName}
      >
        <span className="relative inline-block">
          {label}
          {isActive && (
            <sup className="absolute left-full ml-0.5 top-0">
              {direction === 'asc' ? (
                <ChevronUp className="h-2.5 w-2.5" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5" />
              )}
            </sup>
          )}
        </span>
      </button>
    </TableHead>
  )
}

function formatStat(value: number | undefined, format?: (v: number) => string): string {
  if (value === undefined || value === null) return '—'
  if (format) {
    const result = format(value)
    if (result === '0.0%' || result === '0.00' || result === '0.0') return '—'
    return result
  }
  return value !== 0 ? String(Math.round(value)) : '—'
}

export function PlayerTable({
  players,
  selectedPosition,
  sortField,
  sortDirection,
  onSort,
  onPlayerClick,
  statView,
}: PlayerTableProps) {
  const columnLayout = useMemo(() => {
    if (statView === 'passing') {
      return { groups: [{ key: 'passing', label: 'PASSING', columns: expandedPassingColumns }] }
    }
    if (statView === 'rushing') {
      return { groups: [{ key: 'rushing', label: 'RUSHING', columns: expandedRushingColumns }] }
    }
    if (statView === 'receiving') {
      return { groups: [{ key: 'receiving', label: 'RECEIVING', columns: expandedReceivingColumns }] }
    }
    // "all" — order based on selected position
    switch (selectedPosition) {
      case 'QB':
        return {
          groups: [
            { key: 'passing', label: 'PASSING', columns: allPassingColumns },
            { key: 'rushing', label: 'RUSHING', columns: allRushingColumns },
            { key: 'receiving', label: 'RECEIVING', columns: allReceivingColumns },
          ],
        }
      case 'WR':
      case 'TE':
        return {
          groups: [
            { key: 'receiving', label: 'RECEIVING', columns: allReceivingColumns },
            { key: 'rushing', label: 'RUSHING', columns: allRushingColumns },
            { key: 'passing', label: 'PASSING', columns: allPassingColumns },
          ],
        }
      case 'RB':
        return {
          groups: [
            { key: 'rushing', label: 'RUSHING', columns: allRushingColumns },
            { key: 'receiving', label: 'RECEIVING', columns: allReceivingColumns },
            { key: 'passing', label: 'PASSING', columns: allPassingColumns },
          ],
        }
      default:
        return {
          groups: [
            { key: 'rushing', label: 'RUSHING', columns: allRushingColumns },
            { key: 'receiving', label: 'RECEIVING', columns: allReceivingColumns },
            { key: 'passing', label: 'PASSING', columns: allPassingColumns },
          ],
        }
    }
  }, [statView, selectedPosition])

  const allVisibleColumns = useMemo(() => {
    return columnLayout.groups.flatMap((g) =>
      g.columns.map((col, i) => ({ group: g.key, col, isFirst: i === 0 }))
    )
  }, [columnLayout])

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table className="[&_tbody_tr]:border-0">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-12"></TableHead>
            <TableHead colSpan={3} className="text-center text-xs font-semibold">
              PLAYER
            </TableHead>
            <TableHead className="text-center w-12"></TableHead>
            <TableHead colSpan={2} className="text-center text-xs font-semibold">
              FANTASY
            </TableHead>
            {columnLayout.groups.map((group) => (
              <TableHead
                key={group.key}
                colSpan={group.columns.length}
                className="text-center text-xs font-semibold"
              >
                {group.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <SortableHeader
              field="rank"
              label="RK"
              fullName="Rank"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
              className="w-12"
            />
            <SortableHeader
              field="name"
              label="NAME"
              fullName="Player Name"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
              className="text-left w-48"
            />
            <TableHead className="text-center w-16 font-medium" title="Position">POS</TableHead>
            <TableHead className="text-center w-16 font-medium" title="Team">TEAM</TableHead>
            <TableHead className="text-center w-12 font-medium" title="Games Played">G</TableHead>
            <SortableHeader
              field="fantasyPoints"
              label="PTS"
              fullName="Fantasy Points"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
              className="w-16"
            />
            <SortableHeader
              field="pointsPerGame"
              label="AVG"
              fullName="Points Per Game"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
              className="w-16"
            />
            {allVisibleColumns.map(({ col, isFirst }) => (
              <SortableHeader
                key={col.key}
                field={col.key}
                label={col.label}
                fullName={col.fullName}
                currentField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className={cn(isFirst && "pl-4")}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7 + allVisibleColumns.length}
                className="text-center py-8 text-muted-foreground"
              >
                No players found
              </TableCell>
            </TableRow>
          ) : (
            players.map((player) => (
              <TableRow
                key={player.id}
                onClick={() => onPlayerClick(player)}
                className="cursor-pointer transition-colors"
              >
                <TableCell className="text-center font-medium text-muted-foreground">
                  {player.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {player.headshotUrl ? (
                      <img
                        src={player.headshotUrl}
                        alt=""
                        className="h-9 w-9 -mt-1.5 -mb-1 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 -mt-1.5 -mb-1 rounded-full bg-muted" />
                    )}
                    <span className="font-medium hover:underline cursor-pointer">{player.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <PositionBadge position={player.position} />
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs text-muted-foreground">{player.team}</span>
                </TableCell>
                <TableCell className="text-center text-xs">
                  {player.gamesPlayed}
                </TableCell>
                <TableCell className="text-center">
                  {player.fantasyPoints.toFixed(1)}
                </TableCell>
                <TableCell className="text-center">
                  {player.pointsPerGame.toFixed(1)}
                </TableCell>
                {allVisibleColumns.map(({ col, isFirst }) => {
                  const value = player[col.key as keyof Player] as number | undefined
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "text-center text-sm tabular-nums",
                        isFirst && "pl-4"
                      )}
                    >
                      {formatStat(value, col.format)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
