import { getDatabase } from '@/lib/database/connection'
import { SleeperADP } from '@/lib/types/ranking-schemas'

// Ensure the sleeper_adp table has all expected columns
function ensureSchema() {
  const db = getDatabase()

  const tableInfo = db.prepare("PRAGMA table_info(sleeper_adp)").all() as Array<{ name: string }>
  if (tableInfo.length === 0) return // table doesn't exist yet, schema.sql will create it

  const columnNames = new Set(tableInfo.map(col => col.name))

  if (!columnNames.has('headshot_url')) {
    db.exec('ALTER TABLE sleeper_adp ADD COLUMN headshot_url TEXT')
  }

  if (!columnNames.has('sleeper_player_id')) {
    db.exec('ALTER TABLE sleeper_adp ADD COLUMN sleeper_player_id TEXT')
  }
}

export interface SleeperADPFilter {
  season?: number
  position?: string
}

/**
 * Get Sleeper ADP data with optional filters
 */
export function getSleeperADP(filter: SleeperADPFilter = {}): SleeperADP[] {
  ensureSchema()
  const db = getDatabase()

  const whereClauses: string[] = []
  const params: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    whereClauses.push('season = @season')
    params.season = filter.season
  }

  if (filter.position) {
    whereClauses.push('position = @position')
    params.position = filter.position
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `SELECT * FROM sleeper_adp ${whereClause}`
  const stmt = db.prepare(sql)
  return stmt.all(params) as SleeperADP[]
}

/**
 * Upsert Sleeper ADP data (insert or replace)
 */
export function upsertSleeperADP(data: SleeperADP[]): void {
  ensureSchema()
  const db = getDatabase()

  const sql = `
    INSERT OR REPLACE INTO sleeper_adp (
      id, season, player_id, player_name, position, team, headshot_url,
      sleeper_player_id, adp_ppr, adp_half_ppr, adp_std, updated_at
    ) VALUES (
      @id, @season, @player_id, @player_name, @position, @team, @headshot_url,
      @sleeper_player_id, @adp_ppr, @adp_half_ppr, @adp_std, @updated_at
    )
  `

  const stmt = db.prepare(sql)
  const transaction = db.transaction((items: SleeperADP[]) => {
    for (const item of items) {
      stmt.run(item)
    }
  })

  transaction(data)
}

/**
 * Get the last update timestamp for ADP data
 */
export function getLastADPUpdate(season: number): string | null {
  const db = getDatabase()

  const sql = 'SELECT MAX(updated_at) as last_update FROM sleeper_adp WHERE season = @season'
  const stmt = db.prepare(sql)
  const result = stmt.get({ season }) as { last_update: string | null } | undefined

  return result?.last_update || null
}

/**
 * Check if ADP data is stale (older than 24 hours)
 */
export function isADPStale(season: number): boolean {
  const lastUpdate = getLastADPUpdate(season)
  if (!lastUpdate) return true

  const lastUpdateDate = new Date(lastUpdate)
  const now = new Date()
  const hoursDiff = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60)

  return hoursDiff > 24
}

/**
 * Clear ADP data for a season
 */
export function clearSleeperADP(season: number): void {
  const db = getDatabase()
  const sql = 'DELETE FROM sleeper_adp WHERE season = @season'
  const stmt = db.prepare(sql)
  stmt.run({ season })
}
