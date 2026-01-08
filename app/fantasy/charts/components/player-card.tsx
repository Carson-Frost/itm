"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Player, Position } from "@/lib/mock-fantasy-data"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { WeeklyStats as DBWeeklyStats, RosterData } from "@/lib/types/mongodb-schemas"
import { WeeklyStatsResponse } from "@/app/api/fantasy/weekly-stats/route"
import { RosterDataResponse } from "@/app/api/fantasy/roster-data/route"

interface PlayerCardProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  initialSeason: number
}

interface WeeklyStats {
  week: number
  opponent: string
  fantasyPointsPPR: number
  fantasyPointsSTD: number
  fantasyPointsHalf: number
  carries: number
  rushingYards: number
  rushingTDs: number
  targets: number
  receptions: number
  receivingYards: number
  receivingTDs: number
  attempts: number
  completions: number
  passingYards: number
  passingTDs: number
  interceptions: number
  fumbles: number
  fumblesLost: number
  sacks: number
  sackedYards: number
  puntReturns: number
  kickoffReturns: number
  specialTeamsTDs: number
}

interface CareerSeasonStats {
  season: number
  gamesPlayed: number
  fantasyPointsPPR: number
  fantasyPointsSTD: number
  fantasyPointsHalf: number
  carries: number
  rushingYards: number
  rushingTDs: number
  targets: number
  receptions: number
  receivingYards: number
  receivingTDs: number
  attempts: number
  completions: number
  passingYards: number
  passingTDs: number
  interceptions: number
  fumbles: number
  fumblesLost: number
  sacks: number
  sackedYards: number
  puntReturns: number
  kickoffReturns: number
  specialTeamsTDs: number
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

function getPlayoffRound(week: number): { round: string; order: number; label: string } | null {
  switch (week) {
    case 19: return { round: 'WC', order: 1, label: 'Wild Card' }
    case 20: return { round: 'DIV', order: 2, label: 'Divisional' }
    case 21: return { round: 'CONF', order: 3, label: 'Conference Championship' }
    case 22: return { round: 'SB', order: 4, label: 'Super Bowl' }
    default: return null
  }
}

function getTeamName(abbreviation: string): string {
  const teamNames: Record<string, string> = {
    ARI: 'Cardinals',
    ATL: 'Falcons',
    BAL: 'Ravens',
    BUF: 'Bills',
    CAR: 'Panthers',
    CHI: 'Bears',
    CIN: 'Bengals',
    CLE: 'Browns',
    DAL: 'Cowboys',
    DEN: 'Broncos',
    DET: 'Lions',
    GB: 'Packers',
    HOU: 'Texans',
    IND: 'Colts',
    JAX: 'Jaguars',
    KC: 'Chiefs',
    LAC: 'Chargers',
    LAR: 'Rams',
    LV: 'Raiders',
    MIA: 'Dolphins',
    MIN: 'Vikings',
    NE: 'Patriots',
    NO: 'Saints',
    NYG: 'Giants',
    NYJ: 'Jets',
    PHI: 'Eagles',
    PIT: 'Steelers',
    SEA: 'Seahawks',
    SF: '49ers',
    TB: 'Buccaneers',
    TEN: 'Titans',
    WAS: 'Commanders',
  }
  return teamNames[abbreviation] || abbreviation
}

function formatHeight(heightInInches: string | number | undefined): string {
  if (!heightInInches) return ''
  const inches = typeof heightInInches === 'string' ? parseInt(heightInInches) : heightInInches
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12
  return `${feet}'${remainingInches}"`
}

function calculateAge(birthDate: string | undefined, forYear: number): number | undefined {
  if (!birthDate) return undefined
  const birth = new Date(birthDate)
  let age = forYear - birth.getFullYear()
  // Assume age as of start of season (September 1st)
  const seasonStart = new Date(forYear, 8, 1) // September 1st
  const monthDiff = seasonStart.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const rushingColumns = [
  { key: 'carries' as const, label: 'ATT' },
  { key: 'rushingYards' as const, label: 'YD' },
  { key: 'rushingTDs' as const, label: 'TD' },
]

const receivingColumns = [
  { key: 'targets' as const, label: 'TAR' },
  { key: 'receptions' as const, label: 'REC' },
  { key: 'receivingYards' as const, label: 'YD' },
  { key: 'receivingTDs' as const, label: 'TD' },
]

const passingColumns = [
  { key: 'attempts' as const, label: 'ATT' },
  { key: 'completions' as const, label: 'CMP' },
  { key: 'passingYards' as const, label: 'YD' },
  { key: 'passingTDs' as const, label: 'TD' },
  { key: 'interceptions' as const, label: 'INT' },
]

const fumbleColumns = [
  { key: 'fumbles' as const, label: 'FUM' },
  { key: 'fumblesLost' as const, label: 'LOST' },
]

const sackedColumns = [
  { key: 'sacks' as const, label: 'SK' },
  { key: 'sackedYards' as const, label: 'YD' },
]

const returningColumns = [
  { key: 'puntReturns' as const, label: 'PR' },
  { key: 'kickoffReturns' as const, label: 'KR' },
  { key: 'specialTeamsTDs' as const, label: 'TD' },
]

function getColumnGroupOrder(position: Position, weeklyStats: WeeklyStats[], isLoading: boolean = false) {
  // During loading, show all potential columns to avoid layout shift
  // After loading, check if there's any data in a stat group across all weeks
  const hasPassingData = isLoading || weeklyStats.some(week =>
    week.attempts > 0 || week.completions > 0 || week.passingYards > 0 || week.passingTDs > 0 || week.interceptions > 0
  )
  const hasReceivingData = isLoading || weeklyStats.some(week =>
    week.targets > 0 || week.receptions > 0 || week.receivingYards > 0 || week.receivingTDs > 0
  )
  const hasReturningData = isLoading || weeklyStats.some(week =>
    week.puntReturns > 0 || week.kickoffReturns > 0 || week.specialTeamsTDs > 0
  )

  const groups = []

  switch (position) {
    case 'QB':
      groups.push(
        { key: 'passing', label: 'PASSING', columns: passingColumns },
        { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
        { key: 'sacked', label: 'SACKED', columns: sackedColumns },
        { key: 'fumble', label: 'FUMBLE', columns: fumbleColumns }
      )
      // Add receiving if data exists
      if (hasReceivingData) {
        groups.push({ key: 'receiving', label: 'RECEIVING', columns: receivingColumns })
      }
      // Add returning if data exists
      if (hasReturningData) {
        groups.push({ key: 'returning', label: 'RETURNING', columns: returningColumns })
      }
      break

    case 'RB':
      groups.push(
        { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
        { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
        { key: 'fumble', label: 'FUMBLE', columns: fumbleColumns },
        { key: 'returning', label: 'RETURNING', columns: returningColumns }
      )
      // Add passing if data exists
      if (hasPassingData) {
        groups.push({ key: 'passing', label: 'PASSING', columns: passingColumns })
      }
      break

    case 'WR':
    case 'TE':
      groups.push(
        { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
        { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
        { key: 'fumble', label: 'FUMBLE', columns: fumbleColumns },
        { key: 'returning', label: 'RETURNING', columns: returningColumns }
      )
      // Add passing if data exists
      if (hasPassingData) {
        groups.push({ key: 'passing', label: 'PASSING', columns: passingColumns })
      }
      break

    default:
      groups.push(
        { key: 'rushing', label: 'RUSHING', columns: rushingColumns },
        { key: 'receiving', label: 'RECEIVING', columns: receivingColumns },
        { key: 'fumble', label: 'FUMBLE', columns: fumbleColumns },
        { key: 'returning', label: 'RETURNING', columns: returningColumns }
      )
      if (hasPassingData) {
        groups.push({ key: 'passing', label: 'PASSING', columns: passingColumns })
      }
      break
  }

  return groups
}

export function PlayerCard({ player, isOpen, onClose, initialSeason }: PlayerCardProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | 'Career'>(initialSeason)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [rosterData, setRosterData] = useState<RosterData | null>(null)
  const [college, setCollege] = useState<string | null>(null)
  const [availableSeasons, setAvailableSeasons] = useState<{ year: number; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [careerStats, setCareerStats] = useState<CareerSeasonStats[]>([])

  // Reset all state when player changes
  useEffect(() => {
    if (!player) return

    setWeeklyStats([])
    setRosterData(null)
    setCollege(null)
    setAvailableSeasons([])
    setCareerStats([])
    setLoading(false)
  }, [player?.playerId])

  // Fetch weekly stats when player or season changes
  useEffect(() => {
    if (!player) return
    if (selectedSeason === 'Career') return

    async function fetchWeeklyStats() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          playerId: player.playerId,
          season: selectedSeason.toString(),
        })

        const response = await fetch(`/api/fantasy/weekly-stats?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch weekly stats')
        }

        const data: WeeklyStatsResponse = await response.json()

        // If no weeks data, return empty stats
        if (!data.weeks) {
          setWeeklyStats([])
          return
        }

        // Create a map of week number to stats
        const weekMap = new Map<number, DBWeeklyStats>()
        data.weeks.forEach((week) => {
          weekMap.set(week.week, week)
        })

        // Determine which weeks to show: always at least 17, plus any weeks with data beyond that
        const weeksWithData = data.weeks.map(w => w.week)
        const maxWeek = Math.max(17, ...weeksWithData)

        // Generate weeks, filling in BYE weeks where data is missing
        const formattedStats: WeeklyStats[] = []
        for (let weekNum = 1; weekNum <= maxWeek; weekNum++) {
          const weekData = weekMap.get(weekNum)

          if (weekData) {
            // Calculate total fumbles from all sources
            const totalFumbles = (weekData.rushing_fumbles || 0) + (weekData.receiving_fumbles || 0) + (weekData.sack_fumbles || 0)
            const totalFumblesLost = (weekData.rushing_fumbles_lost || 0) + (weekData.receiving_fumbles_lost || 0) + (weekData.sack_fumbles_lost || 0)

            // Calculate fantasy points for different scoring formats
            const pprPoints = weekData.fantasy_points_ppr || 0
            const stdPoints = weekData.fantasy_points || 0
            const halfPoints = stdPoints + ((weekData.receptions || 0) * 0.5)

            formattedStats.push({
              week: weekNum,
              opponent: weekData.opponent_team ? `@${weekData.opponent_team}` : '@OPP',
              fantasyPointsPPR: pprPoints,
              fantasyPointsSTD: stdPoints,
              fantasyPointsHalf: halfPoints,
              carries: weekData.carries || 0,
              rushingYards: weekData.rushing_yards || 0,
              rushingTDs: weekData.rushing_tds || 0,
              targets: weekData.targets || 0,
              receptions: weekData.receptions || 0,
              receivingYards: weekData.receiving_yards || 0,
              receivingTDs: weekData.receiving_tds || 0,
              attempts: weekData.attempts || 0,
              completions: weekData.completions || 0,
              passingYards: weekData.passing_yards || 0,
              passingTDs: weekData.passing_tds || 0,
              interceptions: weekData.passing_interceptions || 0,
              fumbles: totalFumbles,
              fumblesLost: totalFumblesLost,
              sacks: weekData.sacks_suffered || 0,
              sackedYards: Math.abs(weekData.sack_yards_lost || 0),
              puntReturns: weekData.punt_returns || 0,
              kickoffReturns: weekData.kickoff_returns || 0,
              specialTeamsTDs: weekData.special_teams_tds || 0,
            })
          } else {
            // No data - leave blank
            formattedStats.push({
              week: weekNum,
              opponent: '',
              fantasyPointsPPR: 0,
              fantasyPointsSTD: 0,
              fantasyPointsHalf: 0,
              carries: 0,
              rushingYards: 0,
              rushingTDs: 0,
              targets: 0,
              receptions: 0,
              receivingYards: 0,
              receivingTDs: 0,
              attempts: 0,
              completions: 0,
              passingYards: 0,
              passingTDs: 0,
              interceptions: 0,
              fumbles: 0,
              fumblesLost: 0,
              sacks: 0,
              sackedYards: 0,
              puntReturns: 0,
              kickoffReturns: 0,
              specialTeamsTDs: 0,
            })
          }
        }

        setWeeklyStats(formattedStats)
      } catch (error) {
        console.error('Error fetching weekly stats:', error)
        setWeeklyStats([])
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyStats()
  }, [player, selectedSeason])

  // Fetch roster data when player or season changes
  useEffect(() => {
    if (!player) return

    async function fetchRosterData() {
      try {
        // For Career view, use the most recent season
        const seasonToFetch = selectedSeason === 'Career'
          ? (availableSeasons[0]?.year || 2024)
          : selectedSeason

        const params = new URLSearchParams({
          gsisId: player.playerId,
          season: seasonToFetch.toString(),
        })

        const response = await fetch(`/api/fantasy/roster-data?${params}`)
        if (response.ok) {
          const data: RosterDataResponse = await response.json()
          setRosterData(data.rosterData)
        } else {
          setRosterData(null)
        }
      } catch (error) {
        console.error('Error fetching roster data:', error)
        setRosterData(null)
      }
    }

    // Only fetch if we have available seasons (for Career view)
    if (selectedSeason === 'Career' && availableSeasons.length === 0) return

    fetchRosterData()
  }, [player, selectedSeason, availableSeasons])

  // Fetch available seasons when player changes
  useEffect(() => {
    if (!player) return

    async function fetchAvailableSeasons() {
      try {
        const params = new URLSearchParams({
          playerId: player.playerId,
        })

        const response = await fetch(`/api/fantasy/weekly-stats?${params}`)
        if (response.ok) {
          const data: WeeklyStatsResponse = await response.json()
          if (data.availableSeasons) {
            setAvailableSeasons(
              data.availableSeasons.map((year) => ({
                year,
                label: year.toString(),
              }))
            )
          }
        }
      } catch (error) {
        console.error('Error fetching available seasons:', error)
      }
    }

    fetchAvailableSeasons()
  }, [player])

  // Fetch career stats when Career tab is selected
  useEffect(() => {
    if (!player) return
    if (selectedSeason !== 'Career') return

    async function fetchCareerStats() {
      setLoading(true)
      try {
        // Fetch all available seasons
        const allSeasonStats = await Promise.all(
          availableSeasons.map(async (season) => {
            const params = new URLSearchParams({
              playerId: player.playerId,
              season: season.year.toString(),
            })

            const response = await fetch(`/api/fantasy/weekly-stats?${params}`)
            if (!response.ok) return null

            const data: WeeklyStatsResponse = await response.json()
            if (!data.weeks || data.weeks.length === 0) return null

            // Aggregate stats for the season
            const seasonTotals = data.weeks.reduce((acc, week) => {
              const totalFumbles = (week.rushing_fumbles || 0) + (week.receiving_fumbles || 0) + (week.sack_fumbles || 0)
              const totalFumblesLost = (week.rushing_fumbles_lost || 0) + (week.receiving_fumbles_lost || 0) + (week.sack_fumbles_lost || 0)

              return {
                season: season.year,
                gamesPlayed: acc.gamesPlayed + 1,
                fantasyPointsPPR: acc.fantasyPointsPPR + (week.fantasy_points_ppr || 0),
                fantasyPointsSTD: acc.fantasyPointsSTD + (week.fantasy_points || 0),
                fantasyPointsHalf: acc.fantasyPointsHalf,
                carries: acc.carries + (week.carries || 0),
                rushingYards: acc.rushingYards + (week.rushing_yards || 0),
                rushingTDs: acc.rushingTDs + (week.rushing_tds || 0),
                targets: acc.targets + (week.targets || 0),
                receptions: acc.receptions + (week.receptions || 0),
                receivingYards: acc.receivingYards + (week.receiving_yards || 0),
                receivingTDs: acc.receivingTDs + (week.receiving_tds || 0),
                attempts: acc.attempts + (week.attempts || 0),
                completions: acc.completions + (week.completions || 0),
                passingYards: acc.passingYards + (week.passing_yards || 0),
                passingTDs: acc.passingTDs + (week.passing_tds || 0),
                interceptions: acc.interceptions + (week.passing_interceptions || 0),
                fumbles: acc.fumbles + totalFumbles,
                fumblesLost: acc.fumblesLost + totalFumblesLost,
                sacks: acc.sacks + (week.sacks_suffered || 0),
                sackedYards: acc.sackedYards + Math.abs(week.sack_yards_lost || 0),
                puntReturns: acc.puntReturns + (week.punt_returns || 0),
                kickoffReturns: acc.kickoffReturns + (week.kickoff_returns || 0),
                specialTeamsTDs: acc.specialTeamsTDs + (week.special_teams_tds || 0),
              }
            }, {
              season: season.year,
              gamesPlayed: 0,
              fantasyPointsPPR: 0,
              fantasyPointsSTD: 0,
              fantasyPointsHalf: 0,
              carries: 0,
              rushingYards: 0,
              rushingTDs: 0,
              targets: 0,
              receptions: 0,
              receivingYards: 0,
              receivingTDs: 0,
              attempts: 0,
              completions: 0,
              passingYards: 0,
              passingTDs: 0,
              interceptions: 0,
              fumbles: 0,
              fumblesLost: 0,
              sacks: 0,
              sackedYards: 0,
              puntReturns: 0,
              kickoffReturns: 0,
              specialTeamsTDs: 0,
            } as CareerSeasonStats)

            // Calculate half PPR
            seasonTotals.fantasyPointsHalf = seasonTotals.fantasyPointsSTD + (seasonTotals.receptions * 0.5)

            return seasonTotals
          })
        )

        // Filter out null results and sort by season descending
        const validStats = allSeasonStats.filter(s => s !== null).sort((a, b) => b.season - a.season)
        setCareerStats(validStats)
      } catch (error) {
        console.error('Error fetching career stats:', error)
        setCareerStats([])
      } finally {
        setLoading(false)
      }
    }

    if (availableSeasons.length > 0) {
      fetchCareerStats()
    }
  }, [player, selectedSeason, availableSeasons])

  // Fetch college from most recent season when player changes
  useEffect(() => {
    if (!player) return

    async function fetchCollege() {
      try {
        const params = new URLSearchParams({
          playerId: player.playerId,
        })

        const response = await fetch(`/api/fantasy/weekly-stats?${params}`)
        if (response.ok) {
          const data: WeeklyStatsResponse = await response.json()
          if (data.availableSeasons && data.availableSeasons.length > 0) {
            // Get the most recent season
            const mostRecentSeason = Math.max(...data.availableSeasons)

            // Fetch roster data for most recent season
            const rosterParams = new URLSearchParams({
              gsisId: player.playerId,
              season: mostRecentSeason.toString(),
            })

            const rosterResponse = await fetch(`/api/fantasy/roster-data?${rosterParams}`)
            if (rosterResponse.ok) {
              const rosterData: RosterDataResponse = await rosterResponse.json()
              if (rosterData.rosterData?.college) {
                setCollege(rosterData.rosterData.college)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching college:', error)
      }
    }

    fetchCollege()
  }, [player])

  // Update selected season when initial season changes
  useEffect(() => {
    setSelectedSeason(initialSeason)
  }, [initialSeason])

  // Reset to initial season when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSeason(initialSeason)
    }
  }, [isOpen, initialSeason])

  if (!player) return null

  const columnGroups = getColumnGroupOrder(
    player.position,
    selectedSeason === 'Career' ? [] : weeklyStats,
    selectedSeason === 'Career' ? true : loading
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-[850px] h-[70vh] p-0 flex flex-col">
        <DialogTitle className="sr-only">{player.name} Player Card</DialogTitle>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Player Header */}
          <div className="border-b p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-8">
              {/* Player Headshot */}
              <div className="flex-shrink-0 relative">
                {/* Team Logo Behind Player */}
                <div className="absolute right-0 top-0 -translate-y-2 translate-x-9 sm:translate-x-11 opacity-20 pointer-events-none z-0">
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${rosterData?.team || player.team}.png`}
                    alt={`${rosterData?.team || player.team} logo`}
                    className="h-28 w-28 sm:h-36 sm:w-36 object-contain"
                  />
                </div>
                {player.headshotUrl ? (
                  <img
                    src={player.headshotUrl}
                    alt={player.name}
                    className="h-32 w-32 sm:h-40 sm:w-40 rounded-full object-cover relative z-10"
                  />
                ) : (
                  <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-muted relative z-10" />
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 flex flex-col justify-center items-center sm:items-start">
                <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">{player.name}</h2>
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <Badge
                    className={cn(
                      getPositionColor(player.position),
                      "text-white font-bold text-sm h-6 px-2.5"
                    )}
                  >
                    {player.position}
                  </Badge>
                  <span className="text-base sm:text-lg font-semibold">
                    {rosterData?.team ? getTeamName(rosterData.team) : getTeamName(player.team)}
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">#{rosterData?.jersey_number || '00'}</span>
                </div>

                {/* Player Attributes */}
                <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-start">
                  {/* AGE */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 text-center">
                      {selectedSeason === 'Career' && availableSeasons.length > 0
                        ? `AGE (${availableSeasons[0].year})`
                        : 'AGE'}
                    </span>
                    {rosterData && calculateAge(rosterData.birth_date, selectedSeason === 'Career' ? (availableSeasons[0]?.year || 2024) : selectedSeason) !== undefined ? (
                      <span className="text-sm sm:text-base font-medium text-center">
                        {calculateAge(rosterData.birth_date, selectedSeason === 'Career' ? (availableSeasons[0]?.year || 2024) : selectedSeason)}
                      </span>
                    ) : (
                      <Skeleton className="h-4 sm:h-5 w-6 sm:w-8" />
                    )}
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border" />

                  {/* HEIGHT */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 text-center">HEIGHT</span>
                    {rosterData?.height ? (
                      <span className="text-sm sm:text-base font-medium text-center">{formatHeight(rosterData.height)}</span>
                    ) : (
                      <Skeleton className="h-4 sm:h-5 w-8 sm:w-10" />
                    )}
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border" />

                  {/* WEIGHT */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 text-center">WEIGHT</span>
                    {rosterData?.weight ? (
                      <span className="text-sm sm:text-base font-medium text-center">{rosterData.weight}</span>
                    ) : (
                      <Skeleton className="h-4 sm:h-5 w-10 sm:w-12" />
                    )}
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border" />

                  {/* EXP */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 text-center">EXP</span>
                    {rosterData?.years_exp !== undefined ? (
                      <span className="text-sm sm:text-base font-medium text-center">{rosterData.years_exp}</span>
                    ) : (
                      <Skeleton className="h-4 sm:h-5 w-5 sm:w-6" />
                    )}
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border" />

                  {/* COLLEGE */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 text-center">COLLEGE</span>
                    {college ? (
                      <span className="text-sm sm:text-base font-medium text-center">{college}</span>
                    ) : (
                      <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Season Tabs */}
          <div className="px-2 sm:px-4 overflow-x-auto">
            <div className="flex items-center gap-0.5 border-b min-w-max">
              {/* Career Tab */}
              <button
                onClick={() => setSelectedSeason('Career')}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                  selectedSeason === 'Career'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                Career
              </button>
              {availableSeasons.map((season) => (
                <button
                  key={season.year}
                  onClick={() => setSelectedSeason(season.year)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                    selectedSeason === season.year
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {season.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-auto px-2 sm:px-4 pb-2">
            {/* Weekly Stats Table */}
            <div className="w-full">
              <div className="border border-t-0 rounded-b-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-center w-8 py-1.5 px-1 h-8"></TableHead>
                        <TableHead className="text-center w-14 py-1.5 px-1 h-8"></TableHead>
                        <TableHead colSpan={3} className="text-center text-[11px] font-semibold py-1.5 px-1 h-8">
                          FANTASY
                        </TableHead>
                        {columnGroups.map((group) => (
                          <TableHead
                            key={group.key}
                            colSpan={group.columns.length}
                            className="hidden sm:table-cell text-[11px] font-semibold py-1.5 h-8"
                            style={{
                              textAlign: 'center',
                              paddingLeft: `calc(0.25rem + ${1 / group.columns.length}rem)`,
                              paddingRight: '0.25rem'
                            }}
                          >
                            {group.label}
                          </TableHead>
                        ))}
                      </TableRow>
                      <TableRow className="h-8">
                        <TableHead className="text-center w-8 font-medium text-xs py-1.5 px-1">
                          {selectedSeason === 'Career' ? 'YEAR' : 'WK'}
                        </TableHead>
                        <TableHead className="text-center w-14 font-medium text-xs py-1.5 px-1">
                          {selectedSeason === 'Career' ? 'G' : 'OPP'}
                        </TableHead>
                        <TableHead className="text-center w-11 font-medium text-xs py-1.5 px-1">PPR</TableHead>
                        <TableHead className="text-center w-11 font-medium text-xs py-1.5 px-1">STD</TableHead>
                        <TableHead className="text-center w-11 font-medium text-xs py-1.5 px-1">HALF</TableHead>
                        {columnGroups.map((group) =>
                          group.columns.map((col, colIndex) => (
                            <TableHead
                              key={col.key}
                              className={cn(
                                "hidden sm:table-cell text-center font-medium text-xs py-1.5 px-1 w-9",
                                colIndex === 0 && "pl-4"
                              )}
                            >
                              {col.label}
                            </TableHead>
                          ))
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        // Show skeleton rows while loading
                        Array.from({ length: selectedSeason === 'Career' ? 5 : 17 }).map((_, index) => (
                          <TableRow key={index} className="h-8">
                            <TableCell className="text-center py-1.5 px-1">
                              <Skeleton className="h-3 w-5 mx-auto" />
                            </TableCell>
                            <TableCell className="text-center py-1.5 px-1">
                              <Skeleton className="h-3 w-10 mx-auto" />
                            </TableCell>
                            <TableCell className="text-center py-1.5 px-1">
                              <Skeleton className="h-3 w-8 mx-auto" />
                            </TableCell>
                            <TableCell className="text-center py-1.5 px-1">
                              <Skeleton className="h-3 w-8 mx-auto" />
                            </TableCell>
                            <TableCell className="text-center py-1.5 px-1">
                              <Skeleton className="h-3 w-8 mx-auto" />
                            </TableCell>
                            {columnGroups.map((group) =>
                              group.columns.map((col, colIndex) => (
                                <TableCell
                                  key={col.key}
                                  className={cn(
                                    "hidden sm:table-cell text-center py-1.5 px-1 w-9",
                                    colIndex === 0 && "pl-4"
                                  )}
                                >
                                  <Skeleton className="h-3 w-6 mx-auto" />
                                </TableCell>
                              ))
                            )}
                          </TableRow>
                        ))
                      ) : selectedSeason === 'Career' ? (
                        // Career stats view
                        careerStats.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5 + columnGroups.reduce((acc, group) => acc + group.columns.length, 0)}
                              className="text-center py-12 text-muted-foreground"
                            >
                              No career data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          careerStats.map((season) => (
                            <TableRow
                              key={season.season}
                              className="hover:bg-accent/50 transition-colors h-8"
                            >
                              <TableCell className="text-center font-medium text-muted-foreground text-xs py-1.5 px-1">
                                {season.season}
                              </TableCell>
                              <TableCell className="text-center text-xs py-1.5 px-1">
                                {season.gamesPlayed}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-xs py-1.5 px-1">
                                {season.fantasyPointsPPR.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-center text-xs py-1.5 px-1">
                                {season.fantasyPointsSTD.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-center text-xs py-1.5 px-1">
                                {season.fantasyPointsHalf.toFixed(1)}
                              </TableCell>
                              {columnGroups.map((group) =>
                                group.columns.map((col, colIndex) => {
                                  const value = season[col.key as keyof CareerSeasonStats]
                                  const formattedValue = typeof value === 'number' ? Math.round(value) : ''
                                  return (
                                    <TableCell
                                      key={col.key}
                                      className={cn(
                                        "hidden sm:table-cell text-center text-xs py-1.5 px-1 w-9",
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
                        )
                      ) : weeklyStats.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5 + columnGroups.reduce((acc, group) => acc + group.columns.length, 0)}
                            className="text-center py-12 text-muted-foreground"
                          >
                            No data available for {selectedSeason} season
                          </TableCell>
                        </TableRow>
                      ) : (
                        weeklyStats.map((week) => (
                          <TableRow
                            key={week.week}
                            className={cn(
                              "hover:bg-accent/50 transition-colors h-8",
                              !week.opponent && "bg-muted/30"
                            )}
                          >
                            <TableCell className="text-center font-medium text-muted-foreground text-xs py-1.5 px-1">
                              {getPlayoffRound(week.week)?.round || week.week}
                            </TableCell>
                            <TableCell className="text-center text-xs py-1.5 px-1">
                              {week.opponent}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs py-1.5 px-1">
                              {!week.opponent ? '' : week.fantasyPointsPPR.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-xs py-1.5 px-1">
                              {!week.opponent ? '' : week.fantasyPointsSTD.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-xs py-1.5 px-1">
                              {!week.opponent ? '' : week.fantasyPointsHalf.toFixed(1)}
                            </TableCell>
                            {columnGroups.map((group) =>
                              group.columns.map((col, colIndex) => {
                                const value = week[col.key]
                                const formattedValue = !week.opponent ? '' : (typeof value === 'number' ? Math.round(value) : '')
                                return (
                                  <TableCell
                                    key={col.key}
                                    className={cn(
                                      "hidden sm:table-cell text-center text-xs py-1.5 px-1 w-9",
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
