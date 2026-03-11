import { NextRequest, NextResponse } from 'next/server'
import { getYahooADP, upsertYahooADP, isYahooADPStale, clearYahooADP } from '@/lib/data-access/yahoo-adp'
import { YahooADP } from '@/lib/types/ranking-schemas'
import { getValidAccessToken, isYahooConnected } from '@/lib/yahoo-auth'
import { getCurrentSeason } from '@/lib/data-access/nfl-state'
import { getLatestRosterSeason, getLocalPlayersByYahooID } from '@/lib/data-access/player-lookup'

// Yahoo Fantasy API player shape (from JSON response)
interface YahooPlayer {
  player_key: string
  player_id: string
  name: {
    full: string
    first: string
    last: string
  }
  editorial_team_abbr?: string
  display_position?: string
  headshot?: {
    url?: string
  }
  average_draft_pick?: string
  average_draft_round?: string
  average_draft_cost?: string
  percent_drafted?: string
}

/**
 * Get the current Yahoo game key for NFL
 * The game key changes each year (e.g., 449 for 2024)
 */
async function getNFLGameKey(accessToken: string): Promise<string> {
  const response = await fetch(
    'https://fantasysports.yahooapis.com/fantasy/v2/game/nfl?format=json',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Yahoo game key: ${response.status}`)
  }

  const data = await response.json()
  const game = data?.fantasy_content?.game?.[0]
  return game?.game_key || 'nfl'
}

/**
 * Fetch ADP data from Yahoo Fantasy API
 * Yahoo returns players in pages of 25
 */
async function fetchYahooADP(accessToken: string, gameKey: string): Promise<YahooPlayer[]> {
  const allPlayers: YahooPlayer[] = []
  let start = 0
  const count = 25
  const maxPlayers = 300 // Cap at 300 fantasy-relevant players

  while (start < maxPlayers) {
    const url = `https://fantasysports.yahooapis.com/fantasy/v2/game/${gameKey}/players;sort=AR;count=${count};start=${start};status=A?format=json`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      // If we get a 400, we've likely exhausted available players
      if (response.status === 400) break
      throw new Error(`Yahoo API error: ${response.status}`)
    }

    const data = await response.json()
    const players = parseYahooPlayersResponse(data)

    if (players.length === 0) break

    allPlayers.push(...players)
    start += count
  }

  return allPlayers
}

/**
 * Parse the Yahoo Fantasy API players response
 * Yahoo's JSON structure is deeply nested and inconsistent
 */
function parseYahooPlayersResponse(data: Record<string, unknown>): YahooPlayer[] {
  const players: YahooPlayer[] = []

  try {
    const content = data?.fantasy_content as Record<string, unknown> | undefined
    const game = content?.game as unknown[] | undefined
    if (!game || game.length < 2) return players

    const playersObj = game[1] as Record<string, unknown>
    const playersList = playersObj?.players as Record<string, unknown> | undefined
    if (!playersList) return players

    // Yahoo returns players as numbered keys (0, 1, 2, ...) plus a "count" key
    const playerCount = playersList.count as number || 0

    for (let i = 0; i < playerCount; i++) {
      const playerWrapper = playersList[String(i)] as Record<string, unknown> | undefined
      if (!playerWrapper?.player) continue

      const playerData = playerWrapper.player as unknown[]
      if (!Array.isArray(playerData) || playerData.length === 0) continue

      // First element is an array of player info objects
      const infoArray = playerData[0] as unknown[]
      if (!Array.isArray(infoArray)) continue

      const player: Partial<YahooPlayer> = {}

      for (const item of infoArray) {
        if (!item || typeof item !== 'object') continue
        const obj = item as Record<string, unknown>

        if (obj.player_key) player.player_key = obj.player_key as string
        if (obj.player_id) player.player_id = obj.player_id as string
        if (obj.name) player.name = obj.name as YahooPlayer['name']
        if (obj.editorial_team_abbr) player.editorial_team_abbr = obj.editorial_team_abbr as string
        if (obj.display_position) player.display_position = obj.display_position as string
        if (obj.headshot) player.headshot = obj.headshot as YahooPlayer['headshot']
        if (obj.average_draft_pick) player.average_draft_pick = obj.average_draft_pick as string
        if (obj.average_draft_round) player.average_draft_round = obj.average_draft_round as string
        if (obj.average_draft_cost) player.average_draft_cost = obj.average_draft_cost as string
        if (obj.percent_drafted) player.percent_drafted = obj.percent_drafted as string
      }

      if (player.player_id && player.name) {
        players.push(player as YahooPlayer)
      }
    }
  } catch {
    // Yahoo's response structure can vary; return what we have
  }

  return players
}

/**
 * Map Yahoo team abbreviations to standard NFL abbreviations
 */
function normalizeTeamAbbr(yahooTeam: string | undefined): string {
  if (!yahooTeam) return ''
  const abbr = yahooTeam.toUpperCase()
  // Yahoo uses "JAX" for Jacksonville, standard is "JAX" — most match
  const overrides: Record<string, string> = {
    'WSH': 'WAS',
  }
  return overrides[abbr] || abbr
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

    // Check if Yahoo is connected
    if (!isYahooConnected()) {
      return NextResponse.json(
        { error: 'Yahoo not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      )
    }

    const rosterSeason = getLatestRosterSeason()

    // Check if we need to refresh
    const stale = isYahooADPStale(season)

    if (stale || forceRefresh) {
      // Get access token
      const accessToken = await getValidAccessToken()

      // Get local players for matching
      const localPlayers = getLocalPlayersByYahooID(rosterSeason)

      // Get Yahoo game key and fetch ADP
      const gameKey = await getNFLGameKey(accessToken)
      const yahooPlayers = await fetchYahooADP(accessToken, gameKey)

      const now = new Date().toISOString()
      const adpData: YahooADP[] = []

      for (const yp of yahooPlayers) {
        const adpValue = yp.average_draft_pick ? parseFloat(yp.average_draft_pick) : 0
        if (!adpValue) continue

        // Match by yahoo_id
        const localPlayer = localPlayers.get(yp.player_id)

        // Use local player data if matched, otherwise use Yahoo data
        const playerName = localPlayer?.name || yp.name?.full || ''
        const playerPosition = localPlayer?.position || yp.display_position || ''
        const playerTeam = localPlayer?.team || normalizeTeamAbbr(yp.editorial_team_abbr)
        const playerId = localPlayer?.gsisId || `yahoo_${yp.player_id}`
        const headshotUrl = localPlayer?.headshotUrl || yp.headshot?.url || null

        // Only include fantasy-relevant positions
        if (!['QB', 'RB', 'WR', 'TE'].includes(playerPosition)) continue

        adpData.push({
          id: `${season}_yahoo_${yp.player_id}`,
          season,
          player_id: playerId,
          player_name: playerName,
          position: playerPosition,
          team: playerTeam,
          headshot_url: headshotUrl,
          yahoo_player_id: parseInt(yp.player_id),
          adp: adpValue,
          adp_round: yp.average_draft_round ? parseFloat(yp.average_draft_round) : 0,
          percent_drafted: yp.percent_drafted ? parseFloat(yp.percent_drafted) : 0,
          updated_at: now,
        })
      }

      // Clear old data and cache new
      clearYahooADP(season)
      if (adpData.length > 0) {
        upsertYahooADP(adpData)
      }
    }

    // Return cached data
    const filter = { season, position: position && position !== 'ALL' ? position : undefined }
    const adp = getYahooADP(filter)

    return NextResponse.json({ adp, season })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch Yahoo ADP data', message: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch Yahoo ADP data' },
      { status: 500 }
    )
  }
}
