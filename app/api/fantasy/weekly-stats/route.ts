import { NextRequest, NextResponse } from 'next/server'
import { getWeeklyStats } from '@/lib/data-access/player-stats'
import { WeeklyStats } from '@/lib/types/mongodb-schemas'

export interface WeeklyStatsResponse {
  weeks?: WeeklyStats[]
  availableSeasons?: number[]
}

export function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const playerId = searchParams.get('playerId')
    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : undefined

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      )
    }

    // If no season provided, return available seasons for this player
    if (!season) {
      const allStats = getWeeklyStats({
        playerId,
      })

      // Get unique seasons and sort descending
      const seasons = Array.from(new Set(allStats.map(stat => stat.season))).sort((a, b) => b - a)

      const response: WeeklyStatsResponse = {
        availableSeasons: seasons,
      }

      return NextResponse.json(response)
    }

    const weeklyStats = getWeeklyStats({
      playerId,
      season,
    })

    // Sort by week
    weeklyStats.sort((a, b) => a.week - b.week)

    const response: WeeklyStatsResponse = {
      weeks: weeklyStats,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching weekly stats:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch weekly stats', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch weekly stats' },
      { status: 500 }
    )
  }
}
