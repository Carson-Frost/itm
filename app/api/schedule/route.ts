import { NextRequest, NextResponse } from 'next/server'
import { getScheduleData, getAvailableScheduleSeasons, getAvailableWeeks, getLastImportDate } from '@/lib/data-access/player-stats'
import { ScheduleData } from '@/lib/types/mongodb-schemas'

export interface ScheduleResponse {
  games: ScheduleData[]
  availableSeasons: number[]
  availableWeeks: number[]
  lastImportDate: string | null
}

export function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : undefined
    const week = searchParams.get('week')
      ? parseInt(searchParams.get('week')!)
      : undefined
    const gameType = searchParams.get('gameType') || undefined
    const team = searchParams.get('team') || undefined

    const availableSeasons = getAvailableScheduleSeasons()
    const availableWeeks = season ? getAvailableWeeks(season) : []
    const lastImportDate = getLastImportDate()

    let games: ScheduleData[] = []
    if (season !== undefined) {
      games = getScheduleData({
        season,
        week,
        gameType,
        team,
      })
    }

    const response: ScheduleResponse = {
      games,
      availableSeasons,
      availableWeeks,
      lastImportDate,
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch schedule data', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch schedule data' },
      { status: 500 }
    )
  }
}
