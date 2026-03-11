import { getDatabase } from '@/lib/database/connection'

interface LocalPlayer {
  gsisId: string
  name: string
  position: string
  team: string
  headshotUrl: string | null
}

/**
 * Get the most recent season available in roster_data.
 */
export function getLatestRosterSeason(): number {
  const db = getDatabase()
  const result = db
    .prepare('SELECT MAX(season) as season FROM roster_data')
    .get() as { season: number } | undefined
  return result?.season || new Date().getFullYear()
}

/**
 * Get all active players from roster_data that have a sleeper_id.
 * Returns a map keyed by sleeper_id (as string).
 */
export function getLocalPlayersBySleeperID(
  season: number
): Map<string, LocalPlayer> {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT gsis_id, sleeper_id, full_name, position, team, headshot_url
       FROM roster_data
       WHERE season = @season
         AND sleeper_id IS NOT NULL
         AND position IN ('QB', 'RB', 'WR', 'TE')
         AND status = 'ACT'`
    )
    .all({ season }) as Array<{
    gsis_id: string
    sleeper_id: number
    full_name: string
    position: string
    team: string
    headshot_url: string | null
  }>

  const map = new Map<string, LocalPlayer>()
  for (const row of rows) {
    map.set(String(row.sleeper_id), {
      gsisId: row.gsis_id,
      name: row.full_name,
      position: row.position,
      team: row.team || '',
      headshotUrl: row.headshot_url,
    })
  }
  return map
}

/**
 * Get all active players from roster_data that have a yahoo_id.
 * Returns a map keyed by yahoo_id (as string).
 */
export function getLocalPlayersByYahooID(
  season: number
): Map<string, LocalPlayer> {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT gsis_id, yahoo_id, full_name, position, team, headshot_url
       FROM roster_data
       WHERE season = @season
         AND yahoo_id IS NOT NULL
         AND position IN ('QB', 'RB', 'WR', 'TE')
         AND status = 'ACT'`
    )
    .all({ season }) as Array<{
    gsis_id: string
    yahoo_id: number
    full_name: string
    position: string
    team: string
    headshot_url: string | null
  }>

  const map = new Map<string, LocalPlayer>()
  for (const row of rows) {
    map.set(String(row.yahoo_id), {
      gsisId: row.gsis_id,
      name: row.full_name,
      position: row.position,
      team: row.team || '',
      headshotUrl: row.headshot_url,
    })
  }
  return map
}
