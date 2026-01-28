import { getDatabase } from '@/lib/database/connection'
import { SeasonStats, WeeklyStats, RosterData, ScheduleData } from '@/lib/types/mongodb-schemas'

// Query filter interfaces
export interface SeasonStatsFilter {
  season?: number
  position?: string
  playerId?: string
  playerName?: string
  team?: string
  minGames?: number
}

export interface WeeklyStatsFilter {
  season?: number
  week?: number
  position?: string
  playerId?: string
  playerName?: string
  team?: string
}

export interface RosterDataFilter {
  season?: number
  position?: string
  team?: string
  gsis_id?: string
}

/**
 * Get season statistics with optional filters
 */
export function getSeasonStats(filter: SeasonStatsFilter = {}): SeasonStats[] {
  const db = getDatabase()

  // Build WHERE clauses and parameters
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

  if (filter.playerId) {
    whereClauses.push('player_id = @playerId')
    params.playerId = filter.playerId
  }

  if (filter.playerName) {
    whereClauses.push('player_display_name LIKE @playerName')
    params.playerName = `%${filter.playerName}%`
  }

  if (filter.team) {
    whereClauses.push('LOWER(recent_team) = LOWER(@team)')
    params.team = filter.team
  }

  if (filter.minGames !== undefined) {
    whereClauses.push('games >= @minGames')
    params.minGames = filter.minGames
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `SELECT * FROM season_stats ${whereClause}`
  const stmt = db.prepare(sql)
  const results = stmt.all(params) as SeasonStats[]

  // Map id to _id to match MongoDB interface
  return results.map((row) => ({
    ...row,
    _id: row.id,
  })) as SeasonStats[]
}

/**
 * Get weekly statistics with optional filters
 */
export function getWeeklyStats(filter: WeeklyStatsFilter = {}): WeeklyStats[] {
  const db = getDatabase()

  const whereClauses: string[] = []
  const params: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    whereClauses.push('season = @season')
    params.season = filter.season
  }

  if (filter.week !== undefined) {
    whereClauses.push('week = @week')
    params.week = filter.week
  }

  if (filter.position) {
    whereClauses.push('position = @position')
    params.position = filter.position
  }

  if (filter.playerId) {
    whereClauses.push('player_id = @playerId')
    params.playerId = filter.playerId
  }

  if (filter.playerName) {
    whereClauses.push('player_display_name LIKE @playerName')
    params.playerName = `%${filter.playerName}%`
  }

  if (filter.team) {
    whereClauses.push('LOWER(team) = LOWER(@team)')
    params.team = filter.team
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `SELECT * FROM weekly_stats ${whereClause}`
  const stmt = db.prepare(sql)
  const results = stmt.all(params) as WeeklyStats[]

  // Map id to _id to match MongoDB interface
  return results.map((row) => ({
    ...row,
    _id: row.id,
  })) as WeeklyStats[]
}

/**
 * Get roster data with optional filters
 */
export function getRosterData(filter: RosterDataFilter = {}): RosterData[] {
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

  if (filter.team) {
    whereClauses.push('LOWER(team) = LOWER(@team)')
    params.team = filter.team
  }

  if (filter.gsis_id) {
    whereClauses.push('gsis_id = @gsis_id')
    params.gsis_id = filter.gsis_id
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `SELECT * FROM roster_data ${whereClause}`
  const stmt = db.prepare(sql)
  const results = stmt.all(params) as RosterData[]

  // Map id to _id to match MongoDB interface
  return results.map((row) => ({
    ...row,
    _id: row.id,
  })) as RosterData[]
}

/**
 * Get available seasons from season_stats table
 */
export function getAvailableSeasons(): number[] {
  const db = getDatabase()

  const sql = 'SELECT DISTINCT season FROM season_stats ORDER BY season DESC'
  const stmt = db.prepare(sql)
  const results = stmt.all() as Array<{ season: number }>

  return results.map((row) => row.season)
}

export interface ScheduleFilter {
  season?: number
  week?: number
  gameType?: string
  team?: string
}

/**
 * Get schedule data with optional filters
 */
export function getScheduleData(filter: ScheduleFilter = {}): ScheduleData[] {
  const db = getDatabase()

  const whereClauses: string[] = []
  const params: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    whereClauses.push('season = @season')
    params.season = filter.season
  }

  if (filter.week !== undefined) {
    whereClauses.push('week = @week')
    params.week = filter.week
  }

  if (filter.gameType) {
    whereClauses.push('game_type = @gameType')
    params.gameType = filter.gameType
  }

  if (filter.team) {
    whereClauses.push('(LOWER(away_team) = LOWER(@team) OR LOWER(home_team) = LOWER(@team))')
    params.team = filter.team
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `SELECT * FROM schedule_data ${whereClause} ORDER BY season DESC, week ASC`
  const stmt = db.prepare(sql)
  return stmt.all(params) as ScheduleData[]
}

/**
 * Get available seasons from schedule_data table
 */
export function getAvailableScheduleSeasons(): number[] {
  const db = getDatabase()

  const sql = 'SELECT DISTINCT season FROM schedule_data ORDER BY season DESC'
  const stmt = db.prepare(sql)
  const results = stmt.all() as Array<{ season: number }>

  return results.map((row) => row.season)
}

/**
 * Get available weeks for a given season
 */
export function getAvailableWeeks(season: number): number[] {
  const db = getDatabase()

  const sql = 'SELECT DISTINCT week FROM schedule_data WHERE season = @season ORDER BY week ASC'
  const stmt = db.prepare(sql)
  const results = stmt.all({ season }) as Array<{ week: number }>

  return results.map((row) => row.week)
}

/**
 * Get last import date from metadata
 */
export function getLastImportDate(): string | null {
  const db = getDatabase()

  const sql = 'SELECT value FROM metadata WHERE key = ?'
  const stmt = db.prepare(sql)
  const result = stmt.get('last_import_date') as { value: string } | undefined

  return result?.value || null
}
