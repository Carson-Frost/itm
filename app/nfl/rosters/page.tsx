"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { RosterData } from "@/lib/types/mongodb-schemas"
import { RosterResponse } from "@/app/api/nfl/rosters/route"
import { nflTeams, getTeamByAbbr, getTeamLogoUrl } from "@/lib/team-utils"
import { RosterTable } from "./components/roster-table"

function sortName(name: string): string {
  if (name === '49ers') return 'Forty Niners'
  return name
}

const teamsByName = [...nflTeams].sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)))

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS']

export default function RostersPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>(teamsByName[0].abbr)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [players, setPlayers] = useState<RosterData[]>([])
  const [tradeInfo, setTradeInfo] = useState<Record<string, string>>({})
  const [gamesPlayed, setGamesPlayed] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [positionFilter, setPositionFilter] = useState<string>('ALL')

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch("/api/nfl/rosters")
        if (res.ok) {
          const data: RosterResponse = await res.json()
          setAvailableSeasons(data.availableSeasons)
          if (data.availableSeasons.length > 0) {
            setSelectedSeason(data.availableSeasons[0])
          }
        }
      } catch (err) {
        console.error("Failed to fetch seasons:", err)
      }
    }
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (!selectedTeam || selectedSeason === null) return

    async function fetchRoster() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          team: selectedTeam,
          season: selectedSeason!.toString(),
        })
        const res = await fetch(`/api/nfl/rosters?${params}`)
        if (!res.ok) throw new Error("Failed to fetch roster")
        const data: RosterResponse = await res.json()
        setPlayers(data.players)
        setTradeInfo(data.tradeInfo)
        setGamesPlayed(data.gamesPlayed)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roster")
        setPlayers([])
        setTradeInfo({})
        setGamesPlayed({})
      } finally {
        setLoading(false)
      }
    }
    fetchRoster()
  }, [selectedTeam, selectedSeason])

  const teamInfo = getTeamByAbbr(selectedTeam)
  const teamFullName = teamInfo ? `${teamInfo.city} ${teamInfo.name}` : ''

  const availablePositions = [...new Set(players.map(p => p.position))]
    .sort((a, b) => (POSITION_ORDER.indexOf(a) === -1 ? 99 : POSITION_ORDER.indexOf(a)) - (POSITION_ORDER.indexOf(b) === -1 ? 99 : POSITION_ORDER.indexOf(b)))

  const filteredPlayers = positionFilter === 'ALL'
    ? players
    : players.filter(p => p.position === positionFilter)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 underline">Rosters</h1>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between pb-4">
            <div className="flex items-center gap-3">
              <img
                src={getTeamLogoUrl(selectedTeam)}
                alt=""
                className="w-10 h-10 object-contain"
              />
              <div className="text-lg font-bold leading-tight">{teamFullName}</div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">POSITION</label>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="ALL">All</SelectItem>
                    {availablePositions.map(pos => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[400px]">
                    {teamsByName.map(team => (
                      <SelectItem key={team.abbr} value={team.abbr}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSeason !== null && availableSeasons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">SEASON</label>
                  <Select
                    value={selectedSeason.toString()}
                    onValueChange={v => setSelectedSeason(parseInt(v))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {availableSeasons.map(s => (
                        <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <RosterSkeleton />
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p className="text-lg font-semibold">Error loading roster</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No roster data available</p>
              <p className="text-sm mt-2">Try selecting a different season</p>
            </div>
          ) : (
            <RosterTable
              players={filteredPlayers}
              tradeInfo={tradeInfo}
              gamesPlayed={gamesPlayed}
              season={selectedSeason ?? 2025}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function RosterSkeleton() {
  return (
    <div className="border">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-[18px] w-[30px] rounded-full ml-auto" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
        </div>
      ))}
    </div>
  )
}
