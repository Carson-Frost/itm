import { NextRequest, NextResponse } from 'next/server'
import { getRosterData } from '@/lib/data-access/player-stats'
import { RosterData } from '@/lib/types/mongodb-schemas'
import { getDatabase } from '@/lib/database/connection'

export interface RosterResponse {
  players: RosterData[]
  availableSeasons: number[]
  tradeInfo: Record<string, string> // gsis_id -> partner team abbreviation
  gamesPlayed: Record<string, number> // gsis_id -> games played in season
}

export function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : undefined
    const team = searchParams.get('team') || undefined

    const db = getDatabase()
    const seasonRows = db
      .prepare('SELECT DISTINCT season FROM roster_data ORDER BY season DESC')
      .all() as Array<{ season: number }>
    const availableSeasons = seasonRows.map(r => r.season)

    let players: RosterData[] = []
    const tradeInfo: Record<string, string> = {}
    const gamesPlayed: Record<string, number> = {}

    if (season !== undefined && team) {
      players = getRosterData({ season, team })

      // Look up trade partners for TRD players only (TRC has no source team in DB)
      const tradePlayerIds = players
        .filter(p => p.status === 'TRD')
        .map(p => p.gsis_id)

      if (tradePlayerIds.length > 0) {
        const placeholders = tradePlayerIds.map(() => '?').join(', ')
        const tradeRows = db
          .prepare(
            `SELECT gsis_id, team FROM roster_data
             WHERE season = ? AND gsis_id IN (${placeholders}) AND LOWER(team) != LOWER(?)
             GROUP BY gsis_id, team`
          )
          .all(season, ...tradePlayerIds, team) as Array<{ gsis_id: string; team: string }>

        for (const row of tradeRows) {
          tradeInfo[row.gsis_id] = row.team
        }
      }

      // Get games played from season_stats for sorting
      const playerIds = players.map(p => p.gsis_id).filter(Boolean)
      if (playerIds.length > 0) {
        const ph = playerIds.map(() => '?').join(', ')
        const gamesRows = db
          .prepare(
            `SELECT player_id, games FROM season_stats
             WHERE season = ? AND player_id IN (${ph})`
          )
          .all(season, ...playerIds) as Array<{ player_id: string; games: number }>

        for (const row of gamesRows) {
          gamesPlayed[row.player_id] = row.games
        }
      }
    }

    const response: RosterResponse = { players, availableSeasons, tradeInfo, gamesPlayed }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching roster data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roster data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
