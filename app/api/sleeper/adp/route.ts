/**
 * Sleeper ADP Route
 *
 * IMPORTANT: The projections endpoint used here is **undocumented**.
 * - It lives at `api.sleeper.com` (NOT `api.sleeper.app`)
 * - URL: https://api.sleeper.com/projections/nfl/{season}?season_type=regular
 * - Response shape: Array of { player_id: string, stats: { adp_ppr?, adp_half_ppr?, adp_std? } }
 * - `player_id` is Sleeper's internal player ID, mapped to our DB via `roster_data.sleeper_id`
 * - This endpoint is NOT listed at docs.sleeper.app and may change without notice
 * - The documented Sleeper API lives at `api.sleeper.app/v1/...`
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSleeperADP, upsertSleeperADP, isADPStale, clearSleeperADP } from '@/lib/data-access/sleeper-adp'
import { SleeperADP } from '@/lib/types/ranking-schemas'
import { getCurrentSeason } from '@/lib/data-access/nfl-state'
import { getLatestRosterSeason, getLocalPlayersBySleeperID } from '@/lib/data-access/player-lookup'

// Sleeper API response shape for projections
interface SleeperProjection {
  player_id: string
  stats?: {
    adp_ppr?: number
    adp_half_ppr?: number
    adp_std?: number
  }
}

/**
 * Fetch ADP projections from Sleeper's undocumented projections endpoint
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
      const localPlayers = getLocalPlayersBySleeperID(rosterSeason)

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
          player_id: localPlayer.gsisId,
          player_name: localPlayer.name,
          position: localPlayer.position,
          team: localPlayer.team,
          headshot_url: localPlayer.headshotUrl,
          sleeper_player_id: proj.player_id,
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
