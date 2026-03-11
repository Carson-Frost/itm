import { getDatabase } from '@/lib/database/connection'

export interface StoredNFLState {
  season: number
  seasonType: 'pre' | 'regular' | 'post'
  week: number
  displayWeek: number
  leg: number
  seasonStartDate: string
  leagueSeason: string
  previousSeason: string
  updatedAt: string
}

// All metadata keys used for NFL state
const STATE_KEYS = [
  'nfl_season',
  'nfl_season_type',
  'nfl_week',
  'nfl_display_week',
  'nfl_leg',
  'nfl_season_start_date',
  'nfl_league_season',
  'nfl_previous_season',
  'nfl_state_updated_at',
] as const

/**
 * Read NFL state from the metadata table.
 * Returns null if no state has been stored yet.
 */
export function getStoredNFLState(): StoredNFLState | null {
  const db = getDatabase()

  const rows = db
    .prepare(`SELECT key, value FROM metadata WHERE key IN (${STATE_KEYS.map(() => '?').join(', ')})`)
    .all(...STATE_KEYS) as Array<{ key: string; value: string }>

  const map = new Map(rows.map((r) => [r.key, r.value]))

  const season = map.get('nfl_season')
  if (!season) return null

  return {
    season: parseInt(season, 10),
    seasonType: (map.get('nfl_season_type') || 'regular') as StoredNFLState['seasonType'],
    week: parseInt(map.get('nfl_week') || '1', 10),
    displayWeek: parseInt(map.get('nfl_display_week') || map.get('nfl_week') || '1', 10),
    leg: parseInt(map.get('nfl_leg') || '0', 10),
    seasonStartDate: map.get('nfl_season_start_date') || '',
    leagueSeason: map.get('nfl_league_season') || season,
    previousSeason: map.get('nfl_previous_season') || '',
    updatedAt: map.get('nfl_state_updated_at') || '',
  }
}

/**
 * Persist NFL state to the metadata table.
 */
export function storeNFLState(state: Omit<StoredNFLState, 'updatedAt'>): void {
  const db = getDatabase()
  const now = new Date().toISOString()

  const upsert = db.prepare(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
  )

  const transaction = db.transaction(() => {
    upsert.run('nfl_season', String(state.season))
    upsert.run('nfl_season_type', state.seasonType)
    upsert.run('nfl_week', String(state.week))
    upsert.run('nfl_display_week', String(state.displayWeek))
    upsert.run('nfl_leg', String(state.leg))
    upsert.run('nfl_season_start_date', state.seasonStartDate)
    upsert.run('nfl_league_season', state.leagueSeason)
    upsert.run('nfl_previous_season', state.previousSeason)
    upsert.run('nfl_state_updated_at', now)
  })

  transaction()
}

/**
 * Get the current NFL season.
 * Reads from the admin-set metadata value, falls back to calendar year.
 */
export function getCurrentSeason(): number {
  const state = getStoredNFLState()
  return state?.season ?? new Date().getFullYear()
}
