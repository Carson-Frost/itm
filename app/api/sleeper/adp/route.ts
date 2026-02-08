import { NextRequest, NextResponse } from 'next/server'
import { getSleeperADP, upsertSleeperADP, isADPStale, clearSleeperADP } from '@/lib/data-access/sleeper-adp'
import { SleeperADP } from '@/lib/types/ranking-schemas'
import { getDatabase } from '@/lib/database/connection'

// Sleeper API response shape for projections
interface SleeperProjection {
  player_id: string
  stats?: {
    adp_ppr?: number
    adp_half_ppr?: number
    adp_std?: number
  }
}

// Local player data from roster_data
interface LocalPlayer {
  gsis_id: string
  sleeper_id: number
  full_name: string
  position: string
  team: string
  headshot_url: string | null
}

/**
 * Get the current fantasy season (for ADP purposes, use current calendar year)
 */
function getCurrentSeason(): number {
  return new Date().getFullYear()
}

/**
 * Get the most recent season from roster_data for player lookup
 */
function getLatestRosterSeason(): number {
  const db = getDatabase()
  const sql = 'SELECT MAX(season) as season FROM roster_data'
  const stmt = db.prepare(sql)
  const result = stmt.get() as { season: number } | undefined
  return result?.season || new Date().getFullYear()
}

/**
 * Get all active players from roster_data that have a sleeper_id
 * Returns a map of sleeper_id -> player data
 */
function getLocalPlayersMap(season: number): Map<string, LocalPlayer> {
  const db = getDatabase()
  const sql = `
    SELECT gsis_id, sleeper_id, full_name, position, team, headshot_url
    FROM roster_data
    WHERE season = @season
      AND sleeper_id IS NOT NULL
      AND position IN ('QB', 'RB', 'WR', 'TE')
      AND status = 'ACT'
  `
  const stmt = db.prepare(sql)
  const results = stmt.all({ season }) as LocalPlayer[]

  const map = new Map<string, LocalPlayer>()
  for (const player of results) {
    map.set(String(player.sleeper_id), player)
  }
  return map
}

/**
 * Fetch ADP projections from Sleeper
 */
async function fetchSleeperProjections(season: number): Promise<SleeperProjection[]> {
  const response = await fetch(
    `https://api.sleeper.com/projections/nfl/${season}?season_type=regular`
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch Sleeper projections: ${response.status}`)
  }
  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currentSeason = getCurrentSeason()
    const season = searchParams.get('season')
      ? parseInt(searchParams.get('season')!)
      : currentSeason
    const position = searchParams.get('position') || undefined
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Use latest roster data for player lookup (may differ from ADP season)
    const rosterSeason = getLatestRosterSeason()

    // Check if we need to refresh the cache
    const stale = isADPStale(season)

    if (stale || forceRefresh) {
      // Get local players from most recent roster data
      const localPlayers = getLocalPlayersMap(rosterSeason)

      // Fetch ADP data from Sleeper
      const projections = await fetchSleeperProjections(season)

      const now = new Date().toISOString()
      const adpData: SleeperADP[] = []

      for (const proj of projections) {
        const stats = proj.stats
        if (!stats?.adp_ppr && !stats?.adp_half_ppr && !stats?.adp_std) {
          continue
        }

        // Only include players that exist in our local database
        const localPlayer = localPlayers.get(proj.player_id)
        if (!localPlayer) {
          continue
        }

        adpData.push({
          id: `${season}_${proj.player_id}`,
          season,
          player_id: localPlayer.gsis_id,
          player_name: localPlayer.full_name,
          position: localPlayer.position,
          team: localPlayer.team || '',
          headshot_url: localPlayer.headshot_url,
          adp_ppr: stats.adp_ppr || 999,
          adp_half_ppr: stats.adp_half_ppr || 999,
          adp_std: stats.adp_std || 999,
          updated_at: now,
        })
      }

      // Clear old data and cache new data
      clearSleeperADP(season)
      if (adpData.length > 0) {
        upsertSleeperADP(adpData)
      }
    }

    // Return cached data
    const filter = { season, position: position && position !== 'ALL' ? position : undefined }
    const adp = getSleeperADP(filter)

    return NextResponse.json({ adp, season })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch ADP data', message: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch ADP data' },
      { status: 500 }
    )
  }
}
