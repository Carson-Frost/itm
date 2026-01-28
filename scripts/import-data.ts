/**
 * Data Import Script: Load CSV data into SQLite
 *
 * Usage: npm run import-data
 *
 * Place your CSV files in the data directories:
 * - data/roster/*.csv - roster data files
 * - data/season/*.csv - season stats files
 * - data/weekly/*.csv - weekly stats files
 * - data/schedule/*.csv - schedule data files
 *
 * The script will automatically find and import all CSV files in each directory.
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getDatabase, closeDatabase } from '../lib/database/connection'

const DATA_DIR = join(process.cwd(), 'data')

interface CSVRow {
  [key: string]: string | number | null
}

function findCSVFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return []
  }

  const files = readdirSync(dir)
  return files.filter((f) => f.endsWith('.csv')).map((f) => join(dir, f))
}

function parseCSV(filePath: string): CSVRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')

  if (lines.length === 0) {
    return []
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    if (values.length !== headers.length) {
      continue
    }

    const row: CSVRow = {}
    for (let j = 0; j < headers.length; j++) {
      const value = values[j].trim().replace(/^"|"$/g, '')
      row[headers[j]] = value === '' || value === 'NA' ? null : value
    }
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function convertValue(value: string | number | null, expectedType: 'text' | 'integer' | 'real'): string | number | null {
  if (value === null || value === '') {
    return null
  }

  const strValue = String(value)

  if (expectedType === 'integer') {
    const parsed = parseInt(strValue, 10)
    return isNaN(parsed) ? 0 : parsed
  }

  if (expectedType === 'real') {
    const parsed = parseFloat(strValue)
    return isNaN(parsed) ? 0 : parsed
  }

  return strValue
}

function importRosterData(): number {
  const csvPaths = findCSVFiles(join(DATA_DIR, 'roster'))
  if (csvPaths.length === 0) {
    return 0
  }

  let totalRows = 0

  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO roster_data (
      id, season, team, position, depth_chart_position, jersey_number, status,
      full_name, first_name, last_name, birth_date, height, weight, college,
      gsis_id, espn_id, sportradar_id, yahoo_id, rotowire_id, pff_id, pfr_id,
      fantasy_data_id, sleeper_id, years_exp, headshot_url, ngs_position,
      week, game_type, status_description_abbr, football_name, esb_id
    ) VALUES (
      @id, @season, @team, @position, @depth_chart_position, @jersey_number, @status,
      @full_name, @first_name, @last_name, @birth_date, @height, @weight, @college,
      @gsis_id, @espn_id, @sportradar_id, @yahoo_id, @rotowire_id, @pff_id, @pfr_id,
      @fantasy_data_id, @sleeper_id, @years_exp, @headshot_url, @ngs_position,
      @week, @game_type, @status_description_abbr, @football_name, @esb_id
    )
  `)

  const insertMany = db.transaction((records: CSVRow[]) => {
    for (const record of records) {
      stmt.run({
        id: record._id || record.id || `${record.season}_${record.gsis_id || record.esb_id || record.full_name}`,
        season: convertValue(record.season, 'integer'),
        team: record.team,
        position: record.position,
        depth_chart_position: record.depth_chart_position || null,
        jersey_number: convertValue(record.jersey_number, 'integer'),
        status: record.status || null,
        full_name: record.full_name,
        first_name: record.first_name || null,
        last_name: record.last_name || null,
        birth_date: record.birth_date || null,
        height: convertValue(record.height, 'integer'),
        weight: convertValue(record.weight, 'integer'),
        college: record.college || null,
        gsis_id: record.gsis_id,
        espn_id: convertValue(record.espn_id, 'integer'),
        sportradar_id: record.sportradar_id || null,
        yahoo_id: convertValue(record.yahoo_id, 'integer'),
        rotowire_id: convertValue(record.rotowire_id, 'integer'),
        pff_id: convertValue(record.pff_id, 'integer'),
        pfr_id: record.pfr_id || null,
        fantasy_data_id: convertValue(record.fantasy_data_id, 'integer'),
        sleeper_id: convertValue(record.sleeper_id, 'integer'),
        years_exp: convertValue(record.years_exp, 'integer'),
        headshot_url: record.headshot_url || null,
        ngs_position: record.ngs_position || null,
        week: convertValue(record.week, 'integer'),
        game_type: record.game_type || null,
        status_description_abbr: record.status_description_abbr || null,
        football_name: record.football_name || null,
        esb_id: record.esb_id || null,
      })
    }
  })

  for (const csvPath of csvPaths) {
    const rows = parseCSV(csvPath)
    insertMany(rows)
    totalRows += rows.length
  }

  return totalRows
}

function importSeasonStats(): number {
  const csvPaths = findCSVFiles(join(DATA_DIR, 'season'))
  if (csvPaths.length === 0) {
    return 0
  }

  let totalRows = 0

  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO season_stats (
      id, player_id, player_name, player_display_name, position, position_group,
      headshot_url, season, season_type, recent_team, games,
      completions, attempts, passing_yards, passing_tds, passing_interceptions,
      sacks_suffered, sack_yards_lost, sack_fumbles, sack_fumbles_lost,
      passing_air_yards, passing_yards_after_catch, passing_first_downs,
      passing_epa, passing_cpoe, passing_2pt_conversions, pacr,
      carries, rushing_yards, rushing_tds, rushing_fumbles, rushing_fumbles_lost,
      rushing_first_downs, rushing_epa, rushing_2pt_conversions,
      receptions, targets, receiving_yards, receiving_tds, receiving_fumbles,
      receiving_fumbles_lost, receiving_air_yards, receiving_yards_after_catch,
      receiving_first_downs, receiving_epa, receiving_2pt_conversions,
      racr, target_share, air_yards_share, wopr,
      special_teams_tds, fantasy_points, fantasy_points_ppr
    ) VALUES (
      @id, @player_id, @player_name, @player_display_name, @position, @position_group,
      @headshot_url, @season, @season_type, @recent_team, @games,
      @completions, @attempts, @passing_yards, @passing_tds, @passing_interceptions,
      @sacks_suffered, @sack_yards_lost, @sack_fumbles, @sack_fumbles_lost,
      @passing_air_yards, @passing_yards_after_catch, @passing_first_downs,
      @passing_epa, @passing_cpoe, @passing_2pt_conversions, @pacr,
      @carries, @rushing_yards, @rushing_tds, @rushing_fumbles, @rushing_fumbles_lost,
      @rushing_first_downs, @rushing_epa, @rushing_2pt_conversions,
      @receptions, @targets, @receiving_yards, @receiving_tds, @receiving_fumbles,
      @receiving_fumbles_lost, @receiving_air_yards, @receiving_yards_after_catch,
      @receiving_first_downs, @receiving_epa, @receiving_2pt_conversions,
      @racr, @target_share, @air_yards_share, @wopr,
      @special_teams_tds, @fantasy_points, @fantasy_points_ppr
    )
  `)

  const insertMany = db.transaction((records: CSVRow[]) => {
    for (const record of records) {
      stmt.run({
        id: record._id || record.id || `${record.season}_${record.player_id}`,
        player_id: record.player_id,
        player_name: record.player_name,
        player_display_name: record.player_display_name,
        position: record.position,
        position_group: record.position_group,
        headshot_url: record.headshot_url || null,
        season: convertValue(record.season, 'integer'),
        season_type: record.season_type,
        recent_team: record.recent_team,
        games: convertValue(record.games, 'integer'),
        completions: convertValue(record.completions, 'integer'),
        attempts: convertValue(record.attempts, 'integer'),
        passing_yards: convertValue(record.passing_yards, 'integer'),
        passing_tds: convertValue(record.passing_tds, 'integer'),
        passing_interceptions: convertValue(record.passing_interceptions, 'integer'),
        sacks_suffered: convertValue(record.sacks_suffered, 'integer'),
        sack_yards_lost: convertValue(record.sack_yards_lost, 'integer'),
        sack_fumbles: convertValue(record.sack_fumbles, 'integer'),
        sack_fumbles_lost: convertValue(record.sack_fumbles_lost, 'integer'),
        passing_air_yards: convertValue(record.passing_air_yards, 'integer'),
        passing_yards_after_catch: convertValue(record.passing_yards_after_catch, 'integer'),
        passing_first_downs: convertValue(record.passing_first_downs, 'integer'),
        passing_epa: convertValue(record.passing_epa, 'real'),
        passing_cpoe: convertValue(record.passing_cpoe, 'real'),
        passing_2pt_conversions: convertValue(record.passing_2pt_conversions, 'integer'),
        pacr: convertValue(record.pacr, 'real'),
        carries: convertValue(record.carries, 'integer'),
        rushing_yards: convertValue(record.rushing_yards, 'integer'),
        rushing_tds: convertValue(record.rushing_tds, 'integer'),
        rushing_fumbles: convertValue(record.rushing_fumbles, 'integer'),
        rushing_fumbles_lost: convertValue(record.rushing_fumbles_lost, 'integer'),
        rushing_first_downs: convertValue(record.rushing_first_downs, 'integer'),
        rushing_epa: convertValue(record.rushing_epa, 'real'),
        rushing_2pt_conversions: convertValue(record.rushing_2pt_conversions, 'integer'),
        receptions: convertValue(record.receptions, 'integer'),
        targets: convertValue(record.targets, 'integer'),
        receiving_yards: convertValue(record.receiving_yards, 'integer'),
        receiving_tds: convertValue(record.receiving_tds, 'integer'),
        receiving_fumbles: convertValue(record.receiving_fumbles, 'integer'),
        receiving_fumbles_lost: convertValue(record.receiving_fumbles_lost, 'integer'),
        receiving_air_yards: convertValue(record.receiving_air_yards, 'integer'),
        receiving_yards_after_catch: convertValue(record.receiving_yards_after_catch, 'integer'),
        receiving_first_downs: convertValue(record.receiving_first_downs, 'integer'),
        receiving_epa: convertValue(record.receiving_epa, 'real'),
        receiving_2pt_conversions: convertValue(record.receiving_2pt_conversions, 'integer'),
        racr: convertValue(record.racr, 'real'),
        target_share: convertValue(record.target_share, 'real'),
        air_yards_share: convertValue(record.air_yards_share, 'real'),
        wopr: convertValue(record.wopr, 'real'),
        special_teams_tds: convertValue(record.special_teams_tds, 'integer'),
        fantasy_points: convertValue(record.fantasy_points, 'real'),
        fantasy_points_ppr: convertValue(record.fantasy_points_ppr, 'real'),
      })
    }
  })

  for (const csvPath of csvPaths) {
    const rows = parseCSV(csvPath)
    insertMany(rows)
    totalRows += rows.length
  }

  return totalRows
}

function importWeeklyStats(): number {
  const csvPaths = findCSVFiles(join(DATA_DIR, 'weekly'))
  if (csvPaths.length === 0) {
    return 0
  }

  let totalRows = 0

  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO weekly_stats (
      id, player_id, player_name, player_display_name, position, position_group,
      headshot_url, season, week, season_type, team, opponent_team,
      completions, attempts, passing_yards, passing_tds, passing_interceptions,
      sacks_suffered, sack_yards_lost, sack_fumbles, sack_fumbles_lost,
      passing_air_yards, passing_yards_after_catch, passing_first_downs,
      passing_epa, passing_cpoe, passing_2pt_conversions, pacr,
      carries, rushing_yards, rushing_tds, rushing_fumbles, rushing_fumbles_lost,
      rushing_first_downs, rushing_epa, rushing_2pt_conversions,
      receptions, targets, receiving_yards, receiving_tds, receiving_fumbles,
      receiving_fumbles_lost, receiving_air_yards, receiving_yards_after_catch,
      receiving_first_downs, receiving_epa, receiving_2pt_conversions,
      racr, target_share, air_yards_share, wopr,
      special_teams_tds, fantasy_points, fantasy_points_ppr
    ) VALUES (
      @id, @player_id, @player_name, @player_display_name, @position, @position_group,
      @headshot_url, @season, @week, @season_type, @team, @opponent_team,
      @completions, @attempts, @passing_yards, @passing_tds, @passing_interceptions,
      @sacks_suffered, @sack_yards_lost, @sack_fumbles, @sack_fumbles_lost,
      @passing_air_yards, @passing_yards_after_catch, @passing_first_downs,
      @passing_epa, @passing_cpoe, @passing_2pt_conversions, @pacr,
      @carries, @rushing_yards, @rushing_tds, @rushing_fumbles, @rushing_fumbles_lost,
      @rushing_first_downs, @rushing_epa, @rushing_2pt_conversions,
      @receptions, @targets, @receiving_yards, @receiving_tds, @receiving_fumbles,
      @receiving_fumbles_lost, @receiving_air_yards, @receiving_yards_after_catch,
      @receiving_first_downs, @receiving_epa, @receiving_2pt_conversions,
      @racr, @target_share, @air_yards_share, @wopr,
      @special_teams_tds, @fantasy_points, @fantasy_points_ppr
    )
  `)

  const insertMany = db.transaction((records: CSVRow[]) => {
    for (const record of records) {
      stmt.run({
        id: record._id || record.id || `${record.season}_${record.week}_${record.player_id}`,
        player_id: record.player_id,
        player_name: record.player_name,
        player_display_name: record.player_display_name,
        position: record.position,
        position_group: record.position_group,
        headshot_url: record.headshot_url || null,
        season: convertValue(record.season, 'integer'),
        week: convertValue(record.week, 'integer'),
        season_type: record.season_type,
        team: record.team,
        opponent_team: record.opponent_team,
        completions: convertValue(record.completions, 'integer'),
        attempts: convertValue(record.attempts, 'integer'),
        passing_yards: convertValue(record.passing_yards, 'integer'),
        passing_tds: convertValue(record.passing_tds, 'integer'),
        passing_interceptions: convertValue(record.passing_interceptions, 'integer'),
        sacks_suffered: convertValue(record.sacks_suffered, 'integer'),
        sack_yards_lost: convertValue(record.sack_yards_lost, 'integer'),
        sack_fumbles: convertValue(record.sack_fumbles, 'integer'),
        sack_fumbles_lost: convertValue(record.sack_fumbles_lost, 'integer'),
        passing_air_yards: convertValue(record.passing_air_yards, 'integer'),
        passing_yards_after_catch: convertValue(record.passing_yards_after_catch, 'integer'),
        passing_first_downs: convertValue(record.passing_first_downs, 'integer'),
        passing_epa: convertValue(record.passing_epa, 'real'),
        passing_cpoe: convertValue(record.passing_cpoe, 'real'),
        passing_2pt_conversions: convertValue(record.passing_2pt_conversions, 'integer'),
        pacr: convertValue(record.pacr, 'real'),
        carries: convertValue(record.carries, 'integer'),
        rushing_yards: convertValue(record.rushing_yards, 'integer'),
        rushing_tds: convertValue(record.rushing_tds, 'integer'),
        rushing_fumbles: convertValue(record.rushing_fumbles, 'integer'),
        rushing_fumbles_lost: convertValue(record.rushing_fumbles_lost, 'integer'),
        rushing_first_downs: convertValue(record.rushing_first_downs, 'integer'),
        rushing_epa: convertValue(record.rushing_epa, 'real'),
        rushing_2pt_conversions: convertValue(record.rushing_2pt_conversions, 'integer'),
        receptions: convertValue(record.receptions, 'integer'),
        targets: convertValue(record.targets, 'integer'),
        receiving_yards: convertValue(record.receiving_yards, 'integer'),
        receiving_tds: convertValue(record.receiving_tds, 'integer'),
        receiving_fumbles: convertValue(record.receiving_fumbles, 'integer'),
        receiving_fumbles_lost: convertValue(record.receiving_fumbles_lost, 'integer'),
        receiving_air_yards: convertValue(record.receiving_air_yards, 'integer'),
        receiving_yards_after_catch: convertValue(record.receiving_yards_after_catch, 'integer'),
        receiving_first_downs: convertValue(record.receiving_first_downs, 'integer'),
        receiving_epa: convertValue(record.receiving_epa, 'real'),
        receiving_2pt_conversions: convertValue(record.receiving_2pt_conversions, 'integer'),
        racr: convertValue(record.racr, 'real'),
        target_share: convertValue(record.target_share, 'real'),
        air_yards_share: convertValue(record.air_yards_share, 'real'),
        wopr: convertValue(record.wopr, 'real'),
        special_teams_tds: convertValue(record.special_teams_tds, 'integer'),
        fantasy_points: convertValue(record.fantasy_points, 'real'),
        fantasy_points_ppr: convertValue(record.fantasy_points_ppr, 'real'),
      })
    }
  })

  for (const csvPath of csvPaths) {
    const rows = parseCSV(csvPath)
    insertMany(rows)
    totalRows += rows.length
  }

  return totalRows
}

function importScheduleData(): number {
  const csvPaths = findCSVFiles(join(DATA_DIR, 'schedule'))
  if (csvPaths.length === 0) {
    return 0
  }

  let totalRows = 0

  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO schedule_data (
      game_id, season, game_type, week, gameday, weekday, gametime,
      away_team, away_score, home_team, home_score, location, result, total, overtime,
      old_game_id, gsis, nfl_detail_id, pfr, pff, espn, ftn,
      away_rest, home_rest, away_moneyline, home_moneyline,
      spread_line, away_spread_odds, home_spread_odds, total_line, under_odds, over_odds,
      div_game, roof, surface, temp, wind,
      away_qb_id, home_qb_id, away_qb_name, home_qb_name,
      away_coach, home_coach, referee, stadium_id, stadium
    ) VALUES (
      @game_id, @season, @game_type, @week, @gameday, @weekday, @gametime,
      @away_team, @away_score, @home_team, @home_score, @location, @result, @total, @overtime,
      @old_game_id, @gsis, @nfl_detail_id, @pfr, @pff, @espn, @ftn,
      @away_rest, @home_rest, @away_moneyline, @home_moneyline,
      @spread_line, @away_spread_odds, @home_spread_odds, @total_line, @under_odds, @over_odds,
      @div_game, @roof, @surface, @temp, @wind,
      @away_qb_id, @home_qb_id, @away_qb_name, @home_qb_name,
      @away_coach, @home_coach, @referee, @stadium_id, @stadium
    )
  `)

  const insertMany = db.transaction((records: CSVRow[]) => {
    for (const record of records) {
      stmt.run({
        game_id: record.game_id,
        season: convertValue(record.season, 'integer'),
        game_type: record.game_type,
        week: convertValue(record.week, 'integer'),
        gameday: record.gameday || null,
        weekday: record.weekday || null,
        gametime: record.gametime || null,
        away_team: record.away_team,
        away_score: convertValue(record.away_score, 'integer'),
        home_team: record.home_team,
        home_score: convertValue(record.home_score, 'integer'),
        location: record.location || null,
        result: convertValue(record.result, 'integer'),
        total: convertValue(record.total, 'integer'),
        overtime: convertValue(record.overtime, 'integer'),
        old_game_id: record.old_game_id || null,
        gsis: convertValue(record.gsis, 'integer'),
        nfl_detail_id: record.nfl_detail_id || null,
        pfr: record.pfr || null,
        pff: convertValue(record.pff, 'integer'),
        espn: convertValue(record.espn, 'integer'),
        ftn: convertValue(record.ftn, 'integer'),
        away_rest: convertValue(record.away_rest, 'integer'),
        home_rest: convertValue(record.home_rest, 'integer'),
        away_moneyline: convertValue(record.away_moneyline, 'integer'),
        home_moneyline: convertValue(record.home_moneyline, 'integer'),
        spread_line: convertValue(record.spread_line, 'real'),
        away_spread_odds: convertValue(record.away_spread_odds, 'integer'),
        home_spread_odds: convertValue(record.home_spread_odds, 'integer'),
        total_line: convertValue(record.total_line, 'real'),
        under_odds: convertValue(record.under_odds, 'integer'),
        over_odds: convertValue(record.over_odds, 'integer'),
        div_game: convertValue(record.div_game, 'integer'),
        roof: record.roof || null,
        surface: record.surface || null,
        temp: convertValue(record.temp, 'integer'),
        wind: convertValue(record.wind, 'integer'),
        away_qb_id: record.away_qb_id || null,
        home_qb_id: record.home_qb_id || null,
        away_qb_name: record.away_qb_name || null,
        home_qb_name: record.home_qb_name || null,
        away_coach: record.away_coach || null,
        home_coach: record.home_coach || null,
        referee: record.referee || null,
        stadium_id: record.stadium_id || null,
        stadium: record.stadium || null,
      })
    }
  })

  for (const csvPath of csvPaths) {
    const rows = parseCSV(csvPath)
    insertMany(rows)
    totalRows += rows.length
  }

  return totalRows
}

function updateLastImportDate() {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run('last_import_date', now)
}

async function main() {
  try {
    const rosterRows = importRosterData()
    const seasonRows = importSeasonStats()
    const weeklyRows = importWeeklyStats()
    const scheduleRows = importScheduleData()

    updateLastImportDate()

    const db = getDatabase()
    const rosterCount = db.prepare('SELECT COUNT(*) as count FROM roster_data').get() as { count: number }
    const seasonCount = db.prepare('SELECT COUNT(*) as count FROM season_stats').get() as { count: number }
    const weeklyCount = db.prepare('SELECT COUNT(*) as count FROM weekly_stats').get() as { count: number }
    const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedule_data').get() as { count: number }

    process.stdout.write(
      `Import complete: roster=${rosterCount.count} season=${seasonCount.count} weekly=${weeklyCount.count} schedule=${scheduleCount.count}\n`
    )
  } catch (error) {
    process.stderr.write(`Import failed: ${error}\n`)
    process.exit(1)
  } finally {
    closeDatabase()
  }
}

main()
