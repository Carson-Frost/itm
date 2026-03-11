import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { getStoredNFLState, storeNFLState, type StoredNFLState } from '@/lib/data-access/nfl-state'

/**
 * Sleeper /v1/state/nfl response shape.
 * Contains season timing, week info, and league metadata.
 */
interface SleeperNFLState {
  season: string
  season_type: 'pre' | 'regular' | 'post'
  week: number
  display_week: number
  leg: number
  season_start_date: string
  league_season: string
  league_create_season: string
  previous_season: string
}

/** Map raw Sleeper response to our stored shape */
function sleeperToStored(s: SleeperNFLState): Omit<StoredNFLState, 'updatedAt'> {
  return {
    season: parseInt(s.season, 10) || parseInt(s.league_season, 10),
    seasonType: s.season_type || 'regular',
    week: s.week ?? 1,
    displayWeek: s.display_week ?? s.week ?? 1,
    leg: s.leg ?? 0,
    seasonStartDate: s.season_start_date || '',
    leagueSeason: s.league_season || s.season,
    previousSeason: s.previous_season || '',
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = getStoredNFLState()
  return NextResponse.json({ state })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'fetch') {
    // Fetch current NFL state from Sleeper — returns full response for UI display
    const response = await fetch('https://api.sleeper.app/v1/state/nfl')
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch NFL state from Sleeper' },
        { status: 502 }
      )
    }

    const raw: SleeperNFLState = await response.json()
    return NextResponse.json({
      raw,
      preview: sleeperToStored(raw),
    })
  }

  if (action === 'apply') {
    const { state } = body
    if (!state?.season || !state?.seasonType || state?.week === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: season, seasonType, week' },
        { status: 400 }
      )
    }

    storeNFLState({
      season: state.season,
      seasonType: state.seasonType,
      week: state.week,
      displayWeek: state.displayWeek ?? state.week,
      leg: state.leg ?? 0,
      seasonStartDate: state.seasonStartDate ?? '',
      leagueSeason: state.leagueSeason ?? String(state.season),
      previousSeason: state.previousSeason ?? '',
    })

    const stored = getStoredNFLState()
    return NextResponse.json({ state: stored })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
