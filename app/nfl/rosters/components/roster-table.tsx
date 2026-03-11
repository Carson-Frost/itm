"use client"

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PositionBadge } from '@/components/position-badge'
import { RosterData } from '@/lib/types/mongodb-schemas'
import { Player } from '@/lib/types/player'
import { PlayerCard } from '@/app/fantasy/charts/components/player-card'

interface RosterTableProps {
  players: RosterData[]
  tradeInfo: Record<string, string>
  gamesPlayed: Record<string, number>
  season: number
}

type SortField = 'jersey_number' | 'full_name' | 'position' | 'age' | 'height' | 'weight' | 'college' | 'years_exp'
type SortDir = 'asc' | 'desc'

const POSITION_ORDER: Record<string, number> = {
  QB: 0, RB: 1, WR: 2, TE: 3, OL: 4, DL: 5, LB: 6, DB: 7, K: 8, P: 9, LS: 10,
}

const DCP_ORDER: Record<string, number> = {
  QB: 0,
  RB: 0, FB: 1,
  WR: 0,
  TE: 0,
  T: 0, G: 1, C: 2,
  DE: 0, DT: 1, NT: 2,
  OLB: 0, MLB: 1, ILB: 2, LB: 3,
  CB: 0, SS: 1, FS: 2, DB: 3,
  K: 0, P: 0, LS: 0,
}

function formatHeight(inches?: number): string {
  if (!inches) return '\u2014'
  const feet = Math.floor(inches / 12)
  const remaining = inches % 12
  return `${feet}'${remaining}"`
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatExp(years?: number): string {
  if (years == null) return '\u2014'
  return years === 0 ? 'R' : `${years}`
}

function getStatusLabel(player: RosterData, tradeInfo: Record<string, string>): string | null {
  switch (player.status) {
    case 'ACT':
    case 'INA':
      return null
    case 'DEV':
      return 'Practice Squad'
    case 'RES':
      return null
    case 'CUT':
      return player.week ? `Released Wk ${player.week}` : 'Released'
    case 'RET':
      return 'Retired'
    case 'TRD': {
      const dest = tradeInfo[player.gsis_id]
      return dest ? `Traded to ${dest}` : 'Traded'
    }
    case 'TRC':
      return player.week ? `Claimed Wk ${player.week}` : 'Claimed'
    default:
      return player.status ?? null
  }
}

function rosterToPlayer(r: RosterData): Player {
  return {
    id: r.gsis_id,
    playerId: r.gsis_id,
    rank: 0,
    name: r.full_name,
    position: r.position as Player['position'],
    team: r.team,
    gamesPlayed: 0,
    headshotUrl: r.headshot_url,
    fantasyPoints: 0,
    fantasyPointsPPR: 0,
    pointsPerGame: 0,
  }
}

export function RosterTable({ players, tradeInfo, gamesPlayed, season }: RosterTableProps) {
  const [sortField, setSortField] = useState<SortField>('position')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (sortField === 'position') {
        // Position group first
        const posA = POSITION_ORDER[a.position] ?? 99
        const posB = POSITION_ORDER[b.position] ?? 99
        if (posA !== posB) return sortDir === 'asc' ? posA - posB : posB - posA

        // Within position: depth chart position sub-group
        const dcpA = DCP_ORDER[a.depth_chart_position ?? ''] ?? 50
        const dcpB = DCP_ORDER[b.depth_chart_position ?? ''] ?? 50
        if (dcpA !== dcpB) return dcpA - dcpB

        // Within sub-group: games played (most games first)
        const gamesA = gamesPlayed[a.gsis_id] ?? 0
        const gamesB = gamesPlayed[b.gsis_id] ?? 0
        if (gamesA !== gamesB) return gamesB - gamesA

        // Fallback: experience
        return (b.years_exp ?? 0) - (a.years_exp ?? 0)
      }

      let aVal: string | number | null
      let bVal: string | number | null

      switch (sortField) {
        case 'age':
          aVal = calculateAge(a.birth_date)
          bVal = calculateAge(b.birth_date)
          break
        case 'jersey_number':
          aVal = a.jersey_number ?? 999
          bVal = b.jersey_number ?? 999
          break
        case 'height':
          aVal = a.height ?? 0
          bVal = b.height ?? 0
          break
        case 'weight':
          aVal = a.weight ?? 0
          bVal = b.weight ?? 0
          break
        case 'years_exp':
          aVal = a.years_exp ?? -1
          bVal = b.years_exp ?? -1
          break
        default:
          aVal = (a as Record<string, unknown>)[sortField] as string ?? ''
          bVal = (b as Record<string, unknown>)[sortField] as string ?? ''
      }

      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }

      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [players, sortField, sortDir, gamesPlayed])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortableHead({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none hover:text-foreground transition-colors text-center ${className ?? ''}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center justify-center gap-1">
          {children}
          {sortField === field && (
            <span className="text-[10px]">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
          )}
        </div>
      </TableHead>
    )
  }

  return (
    <>
      <div className="border overflow-auto">
        <Table className="[&_tbody_tr]:border-0">
          <TableHeader>
            <TableRow>
              <SortableHead field="jersey_number" className="w-12">#</SortableHead>
              <SortableHead field="full_name" className="!text-left">
                <div className="!justify-start">Name</div>
              </SortableHead>
              <SortableHead field="position" className="w-16">Pos</SortableHead>
              <SortableHead field="age" className="w-12">Age</SortableHead>
              <SortableHead field="height" className="w-14">Ht</SortableHead>
              <SortableHead field="weight" className="w-14">Wt</SortableHead>
              <SortableHead field="years_exp" className="w-12">Exp</SortableHead>
              <SortableHead field="college" className="hidden sm:table-cell !text-left">
                <div className="!justify-start">College</div>
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(player => {
              const statusLabel = getStatusLabel(player, tradeInfo)
              return (
                <TableRow key={player.gsis_id || player._id} className="cursor-pointer transition-colors">
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {player.jersey_number ?? '\u2014'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {player.headshot_url ? (
                        <img
                          src={player.headshot_url}
                          alt=""
                          className="h-9 w-9 -mt-1.5 -mb-1 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 -mt-1.5 -mb-1 rounded-full bg-muted" />
                      )}
                      <span>
                        <span
                          className="font-medium hover:underline cursor-pointer"
                          onClick={() => setSelectedPlayer(rosterToPlayer(player))}
                        >
                          {player.full_name}
                        </span>
                        {statusLabel && (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            ({statusLabel})
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <PositionBadge position={player.depth_chart_position || player.position} />
                  </TableCell>
                  <TableCell className="text-center text-sm">{calculateAge(player.birth_date) ?? '\u2014'}</TableCell>
                  <TableCell className="text-center text-sm">{formatHeight(player.height)}</TableCell>
                  <TableCell className="text-center text-sm">{player.weight ?? '\u2014'}</TableCell>
                  <TableCell className="text-center text-sm">{formatExp(player.years_exp)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {player.college ?? '\u2014'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <PlayerCard
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        initialSeason={season}
      />
    </>
  )
}
