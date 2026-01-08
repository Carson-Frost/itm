import { NextRequest, NextResponse } from 'next/server'
import { getRosterData } from '@/lib/data-access/player-stats'
import { RosterData } from '@/lib/types/mongodb-schemas'

export interface RosterDataResponse {
  rosterData: RosterData | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const gsisId = searchParams.get('gsisId')
    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : undefined

    if (!gsisId) {
      return NextResponse.json(
        { error: 'gsisId is required' },
        { status: 400 }
      )
    }

    if (!season) {
      return NextResponse.json(
        { error: 'season is required' },
        { status: 400 }
      )
    }

    const rosterDataResults = await getRosterData({
      gsis_id: gsisId,
      season,
    })

    const response: RosterDataResponse = {
      rosterData: rosterDataResults.length > 0 ? rosterDataResults[0] : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching roster data:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch roster data', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch roster data' },
      { status: 500 }
    )
  }
}
