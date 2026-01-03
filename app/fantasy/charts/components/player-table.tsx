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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = 'rank' | 'fantasyPoints' | 'pointsPerGame'
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
  currentField,
  direction,
  onSort,
  className,
}: {
  field: SortField
  label: string
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentField === field

  return (
    <TableHead className={cn("text-center", className)}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors font-medium w-full"
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}

// Stat columns grouped by category
const rushingColumns = [
  { key: 'carries', label: 'CAR' },
  { key: 'rushingYards', label: 'YDS' },
  { key: 'rushingTDs', label: 'TD' },
]

const receivingColumns = [
  { key: 'targets', label: 'TAR' },
  { key: 'receptions', label: 'REC' },
  { key: 'receivingYards', label: 'YDS' },
  { key: 'receivingTDs', label: 'TD' },
]

const passingColumns = [
  { key: 'attempts', label: 'ATT' },
  { key: 'completions', label: 'CMP' },
  { key: 'passingYards', label: 'YDS' },
  { key: 'passingTDs', label: 'TD' },
]

export function PlayerTable({
  players,
  selectedPosition,
  sortField,
  sortDirection,
  onSort,
  onPlayerClick,
}: PlayerTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8"></TableHead>
            <TableHead className="h-8"></TableHead>
            <TableHead className="h-8"></TableHead>
            <TableHead className="h-8"></TableHead>
            <TableHead colSpan={rushingColumns.length} className="text-center h-8 text-xs font-semibold">
              RUSHING
            </TableHead>
            <TableHead colSpan={receivingColumns.length} className="text-center h-8 text-xs font-semibold">
              RECEIVING
            </TableHead>
            <TableHead colSpan={passingColumns.length} className="text-center h-8 text-xs font-semibold">
              PASSING
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-center w-12">
              <button
                onClick={() => onSort('rank')}
                className="flex items-center justify-center gap-1 hover:text-foreground transition-colors font-medium w-full"
              >
                RK
                {sortField === 'rank' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 opacity-40" />
                )}
              </button>
            </TableHead>
            <TableHead className="text-left">PLAYER</TableHead>
            <TableHead className="text-center w-16">
              <button
                onClick={() => onSort('fantasyPoints')}
                className="flex items-center justify-center gap-1 hover:text-foreground transition-colors font-medium w-full"
              >
                PTS
                {sortField === 'fantasyPoints' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 opacity-40" />
                )}
              </button>
            </TableHead>
            <TableHead className="text-center w-16">
              <button
                onClick={() => onSort('pointsPerGame')}
                className="flex items-center justify-center gap-1 hover:text-foreground transition-colors font-medium w-full"
              >
                AVG
                {sortField === 'pointsPerGame' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 opacity-40" />
                )}
              </button>
            </TableHead>
            {rushingColumns.map((col) => (
              <TableHead key={col.key} className="text-center">
                {col.label}
              </TableHead>
            ))}
            {receivingColumns.map((col) => (
              <TableHead key={col.key} className="text-center">
                {col.label}
              </TableHead>
            ))}
            {passingColumns.map((col) => (
              <TableHead key={col.key} className="text-center">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4 + rushingColumns.length + receivingColumns.length + passingColumns.length}
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.name}</span>
                      <Badge
                        className={cn(
                          getPositionColor(player.position),
                          "text-white font-semibold text-[10px] h-4 px-1.5"
                        )}
                      >
                        {player.position}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{player.team}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {player.fantasyPoints.toFixed(1)}
                </TableCell>
                <TableCell className="text-center">
                  {player.pointsPerGame.toFixed(1)}
                </TableCell>
                {rushingColumns.map((col) => {
                  const value = player[col.key as keyof Player]
                  const formattedValue = typeof value === 'number' ? Math.round(value) : '-'
                  return (
                    <TableCell key={col.key} className="text-center text-sm">
                      {formattedValue}
                    </TableCell>
                  )
                })}
                {receivingColumns.map((col) => {
                  const value = player[col.key as keyof Player]
                  const formattedValue = typeof value === 'number' ? Math.round(value) : '-'
                  return (
                    <TableCell key={col.key} className="text-center text-sm">
                      {formattedValue}
                    </TableCell>
                  )
                })}
                {passingColumns.map((col) => {
                  const value = player[col.key as keyof Player]
                  const formattedValue = typeof value === 'number' ? Math.round(value) : '-'
                  return (
                    <TableCell key={col.key} className="text-center text-sm">
                      {formattedValue}
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
