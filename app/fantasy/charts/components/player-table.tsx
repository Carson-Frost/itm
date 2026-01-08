"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Player, Position } from "@/lib/mock-fantasy-data"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = 'rank' | 'name' | 'fantasyPoints' | 'pointsPerGame' | 'carries' | 'rushingYards' | 'rushingTDs' | 'targets' | 'receptions' | 'receivingYards' | 'receivingTDs' | 'attempts' | 'completions' | 'passingYards' | 'passingTDs'
type SortDirection = 'asc' | 'desc'

interface PlayerTableProps {
  players: Player[]
  selectedPosition: Position | 'ALL'
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onPlayerClick: (player: Player) => void
}

function getPositionColor(position: Position): string {
  const colors = {
    QB: 'bg-[var(--position-qb)]',
    RB: 'bg-[var(--position-rb)]',
    WR: 'bg-[var(--position-wr)]',
    TE: 'bg-[var(--position-te)]',
  }
  return colors[position]
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

// Stat columns grouped by category
const rushingColumns: { key: SortField, label: string, fullName: string }[] = [
  { key: 'carries', label: 'ATT', fullName: 'Rushing Attempts' },
  { key: 'rushingYards', label: 'YD', fullName: 'Rushing Yards' },
  { key: 'rushingTDs', label: 'TD', fullName: 'Rushing Touchdowns' },
]

const receivingColumns: { key: SortField, label: string, fullName: string }[] = [
  { key: 'targets', label: 'TAR', fullName: 'Targets' },
  { key: 'receptions', label: 'REC', fullName: 'Receptions' },
  { key: 'receivingYards', label: 'YD', fullName: 'Receiving Yards' },
  { key: 'receivingTDs', label: 'TD', fullName: 'Receiving Touchdowns' },
]

const passingColumns: { key: SortField, label: string, fullName: string }[] = [
  { key: 'attempts', label: 'ATT', fullName: 'Passing Attempts' },
  { key: 'completions', label: 'CMP', fullName: 'Completions' },
  { key: 'passingYards', label: 'YD', fullName: 'Passing Yards' },
  { key: 'passingTDs', label: 'TD', fullName: 'Passing Touchdowns' },
]

export function PlayerTable({
  players,
  selectedPosition,
  sortField,
  sortDirection,
  onSort,
  onPlayerClick,
}: PlayerTableProps) {
  // Determine column group order based on selected position
  const getColumnGroupOrder = () => {
    switch (selectedPosition) {
      case 'QB':
        return [
          { key: 'passing', label: 'PASSING', columns: passingColumns },
          { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
          { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
        ]
      case 'RB':
        return [
          { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
          { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
          { key: 'passing', label: 'PASSING', columns: passingColumns },
        ]
      case 'WR':
      case 'TE':
        return [
          { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
          { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
          { key: 'passing', label: 'PASSING', columns: passingColumns },
        ]
      case 'ALL':
      default:
        return [
          { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
          { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
          { key: 'passing', label: 'PASSING', columns: passingColumns },
        ]
    }
  }

  const columnGroups = getColumnGroupOrder()

  return (
    <div className="border rounded-md">
      <Table>
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
            {columnGroups.map((group, index) => (
              <TableHead
                key={group.key}
                colSpan={group.columns.length}
                className="text-center text-xs font-semibold hidden md:table-cell"
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
            {columnGroups.map((group, groupIndex) =>
              group.columns.map((col, colIndex) => (
                <SortableHeader
                  key={col.key}
                  field={col.key}
                  label={col.label}
                  fullName={col.fullName}
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className={cn(
                    "hidden md:table-cell",
                    colIndex === 0 && "pl-4"
                  )}
                />
              ))
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7 + rushingColumns.length + receivingColumns.length + passingColumns.length}
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
                className="cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <TableCell className="text-center font-medium text-muted-foreground">
                  {player.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {player.headshotUrl ? (
                      <img
                        src={player.headshotUrl}
                        alt={player.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted" />
                    )}
                    <span className="font-medium">{player.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={cn(
                      getPositionColor(player.position),
                      "text-white font-semibold text-[10px] h-4 px-1.5"
                    )}
                  >
                    {player.position}
                  </Badge>
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
                {columnGroups.map((group, groupIndex) =>
                  group.columns.map((col, colIndex) => {
                    const value = player[col.key as keyof Player]
                    const formattedValue = typeof value === 'number' ? Math.round(value) : '-'
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "text-center text-sm hidden md:table-cell",
                          colIndex === 0 && "pl-4"
                        )}
                      >
                        {formattedValue}
                      </TableCell>
                    )
                  })
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
