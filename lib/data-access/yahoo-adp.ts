import { getDatabase } from '@/lib/database/connection'
import { YahooADP } from '@/lib/types/ranking-schemas'

export interface YahooADPFilter {
  season?: number
  position?: string
}

/**
 * Get Yahoo ADP data with optional filters
 */
export function getYahooADP(filter: YahooADPFilter = {}): YahooADP[] {
  const db = getDatabase()

  // Ensure table exists
  ensureTable()

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

  const sql = `SELECT * FROM yahoo_adp ${whereClause}`
  const stmt = db.prepare(sql)
  return stmt.all(params) as YahooADP[]
}

/**
 * Upsert Yahoo ADP data (insert or replace)
 */
export function upsertYahooADP(data: YahooADP[]): void {
  const db = getDatabase()
  ensureTable()

  const sql = `
    INSERT OR REPLACE INTO yahoo_adp (
      id, season, player_id, player_name, position, team, headshot_url,
      yahoo_player_id, adp, adp_round, percent_drafted, updated_at
    ) VALUES (
      @id, @season, @player_id, @player_name, @position, @team, @headshot_url,
      @yahoo_player_id, @adp, @adp_round, @percent_drafted, @updated_at
    )
  `

  const stmt = db.prepare(sql)
  const transaction = db.transaction((items: YahooADP[]) => {
    for (const item of items) {
      stmt.run(item)
    }
  })

  transaction(data)
}

/**
 * Get the last update timestamp for Yahoo ADP data
 */
export function getLastYahooADPUpdate(season: number): string | null {
  const db = getDatabase()
  ensureTable()

  const sql = 'SELECT MAX(updated_at) as last_update FROM yahoo_adp WHERE season = @season'
  const stmt = db.prepare(sql)
  const result = stmt.get({ season }) as { last_update: string | null } | undefined

  return result?.last_update || null
}

/**
 * Check if Yahoo ADP data is stale (older than 24 hours)
 */
export function isYahooADPStale(season: number): boolean {
  const lastUpdate = getLastYahooADPUpdate(season)
  if (!lastUpdate) return true

  const lastUpdateDate = new Date(lastUpdate)
  const now = new Date()
  const hoursDiff = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60)

  return hoursDiff > 24
}

/**
 * Clear Yahoo ADP data for a season
 */
export function clearYahooADP(season: number): void {
  const db = getDatabase()
  ensureTable()
  const sql = 'DELETE FROM yahoo_adp WHERE season = @season'
  const stmt = db.prepare(sql)
  stmt.run({ season })
}

/**
 * Ensure the yahoo_adp table exists
 */
function ensureTable() {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS yahoo_adp (
      id TEXT PRIMARY KEY,
      season INTEGER,
      player_id TEXT,
      player_name TEXT,
      position TEXT,
      team TEXT,
      headshot_url TEXT,
      yahoo_player_id INTEGER,
      adp REAL,
      adp_round REAL,
      percent_drafted REAL,
      updated_at TEXT
    )
  `)
}
