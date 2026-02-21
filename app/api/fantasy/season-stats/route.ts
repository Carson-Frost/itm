import { NextRequest, NextResponse } from 'next/server'
import { getSeasonStats, getAvailableSeasons } from '@/lib/data-access/player-stats'
import { mapSeasonStatsArrayToPlayers } from '@/lib/data-mappers/player-mapper'
import { Player } from '@/lib/types/player'

export interface SeasonStatsResponse {
  players: Player[]
  availableSeasons: number[]
}

export function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : undefined
    const position = searchParams.get('position') || undefined
    const playerName = searchParams.get('playerName') || undefined
    const team = searchParams.get('team') || undefined
    const minGames = searchParams.get('minGames')
      ? parseInt(searchParams.get('minGames')!)
      : undefined

    // Get available seasons
    const availableSeasons = getAvailableSeasons()

    // Only fetch player data if season is specified
    let players: Player[] = []
    if (season !== undefined) {
      const seasonStats = getSeasonStats({
        season,
        position: position && position !== 'ALL' ? position : undefined,
        playerName,
        team,
        minGames,
      })
      players = mapSeasonStatsArrayToPlayers(seasonStats)
    }

    const response: SeasonStatsResponse = {
      players,
      availableSeasons,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching season stats:', error)

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch season stats', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch season stats' },
      { status: 500 }
    )
  }
}
