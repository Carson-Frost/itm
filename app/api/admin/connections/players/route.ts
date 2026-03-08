import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getDatabase } from "@/lib/database/connection"

const SEASON_SORT_FIELDS: Record<string, string> = {
  name: "r.full_name",
  team: "r.team",
  position: "r.position",
  season: "r.season",
  fantasyPoints: "COALESCE(s.fantasy_points_ppr, 0)",
  games: "COALESCE(s.games, 0)",
  // Passing
  passingAttempts: "COALESCE(s.attempts, 0)",
  completions: "COALESCE(s.completions, 0)",
  passingYards: "COALESCE(s.passing_yards, 0)",
  passingTds: "COALESCE(s.passing_tds, 0)",
  passingInterceptions: "COALESCE(s.passing_interceptions, 0)",
  sacks: "COALESCE(s.sacks_suffered, 0)",
  passingEpa: "COALESCE(s.passing_epa, 0)",
  passingAirYards: "COALESCE(s.passing_air_yards, 0)",
  passingYac: "COALESCE(s.passing_yards_after_catch, 0)",
  passingFirstDowns: "COALESCE(s.passing_first_downs, 0)",
  passingCpoe: "COALESCE(s.passing_cpoe, 0)",
  passing2pt: "COALESCE(s.passing_2pt_conversions, 0)",
  sackFumbles: "COALESCE(s.sack_fumbles, 0)",
  sackYardsLost: "COALESCE(s.sack_yards_lost, 0)",
  pacr: "COALESCE(s.pacr, 0)",
  // Rushing
  carries: "COALESCE(s.carries, 0)",
  rushingYards: "COALESCE(s.rushing_yards, 0)",
  rushingTds: "COALESCE(s.rushing_tds, 0)",
  rushingFumbles: "COALESCE(s.rushing_fumbles, 0)",
  rushingFumblesLost: "COALESCE(s.rushing_fumbles_lost, 0)",
  rushingEpa: "COALESCE(s.rushing_epa, 0)",
  rushingFirstDowns: "COALESCE(s.rushing_first_downs, 0)",
  rushing2pt: "COALESCE(s.rushing_2pt_conversions, 0)",
  // Receiving
  targets: "COALESCE(s.targets, 0)",
  receptions: "COALESCE(s.receptions, 0)",
  receivingYards: "COALESCE(s.receiving_yards, 0)",
  receivingTds: "COALESCE(s.receiving_tds, 0)",
  receivingFumbles: "COALESCE(s.receiving_fumbles, 0)",
  receivingYac: "COALESCE(s.receiving_yards_after_catch, 0)",
  receivingEpa: "COALESCE(s.receiving_epa, 0)",
  receivingAirYards: "COALESCE(s.receiving_air_yards, 0)",
  receivingFirstDowns: "COALESCE(s.receiving_first_downs, 0)",
  targetShare: "COALESCE(s.target_share, 0)",
  airYardsShare: "COALESCE(s.air_yards_share, 0)",
  wopr: "COALESCE(s.wopr, 0)",
  racr: "COALESCE(s.racr, 0)",
  receiving2pt: "COALESCE(s.receiving_2pt_conversions, 0)",
}

const WEEKLY_SORT_FIELDS: Record<string, string> = {
  name: "w.player_display_name",
  team: "w.team",
  position: "w.position",
  fantasyPoints: "COALESCE(w.fantasy_points_ppr, 0)",
  // Passing
  passingAttempts: "COALESCE(w.attempts, 0)",
  completions: "COALESCE(w.completions, 0)",
  passingYards: "COALESCE(w.passing_yards, 0)",
  passingTds: "COALESCE(w.passing_tds, 0)",
  passingInterceptions: "COALESCE(w.passing_interceptions, 0)",
  sacks: "COALESCE(w.sacks_suffered, 0)",
  passingEpa: "COALESCE(w.passing_epa, 0)",
  passingAirYards: "COALESCE(w.passing_air_yards, 0)",
  passingYac: "COALESCE(w.passing_yards_after_catch, 0)",
  passingFirstDowns: "COALESCE(w.passing_first_downs, 0)",
  passingCpoe: "COALESCE(w.passing_cpoe, 0)",
  passing2pt: "COALESCE(w.passing_2pt_conversions, 0)",
  sackFumbles: "COALESCE(w.sack_fumbles, 0)",
  sackYardsLost: "COALESCE(w.sack_yards_lost, 0)",
  pacr: "COALESCE(w.pacr, 0)",
  // Rushing
  carries: "COALESCE(w.carries, 0)",
  rushingYards: "COALESCE(w.rushing_yards, 0)",
  rushingTds: "COALESCE(w.rushing_tds, 0)",
  rushingFumbles: "COALESCE(w.rushing_fumbles, 0)",
  rushingFumblesLost: "COALESCE(w.rushing_fumbles_lost, 0)",
  rushingEpa: "COALESCE(w.rushing_epa, 0)",
  rushingFirstDowns: "COALESCE(w.rushing_first_downs, 0)",
  rushing2pt: "COALESCE(w.rushing_2pt_conversions, 0)",
  // Receiving
  targets: "COALESCE(w.targets, 0)",
  receptions: "COALESCE(w.receptions, 0)",
  receivingYards: "COALESCE(w.receiving_yards, 0)",
  receivingTds: "COALESCE(w.receiving_tds, 0)",
  receivingFumbles: "COALESCE(w.receiving_fumbles, 0)",
  receivingYac: "COALESCE(w.receiving_yards_after_catch, 0)",
  receivingEpa: "COALESCE(w.receiving_epa, 0)",
  receivingAirYards: "COALESCE(w.receiving_air_yards, 0)",
  receivingFirstDowns: "COALESCE(w.receiving_first_downs, 0)",
  targetShare: "COALESCE(w.target_share, 0)",
  airYardsShare: "COALESCE(w.air_yards_share, 0)",
  wopr: "COALESCE(w.wopr, 0)",
  racr: "COALESCE(w.racr, 0)",
  receiving2pt: "COALESCE(w.receiving_2pt_conversions, 0)",
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") || ""
  const position = searchParams.get("position") || ""
  const team = searchParams.get("team") || ""
  const season = searchParams.get("season") || ""
  const week = searchParams.get("week") || ""
  const sortBy = searchParams.get("sortBy") || "fantasyPoints"
  const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC"
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200)
  const offset = parseInt(searchParams.get("offset") || "0")

  try {
    const db = getDatabase()

    // Weekly stats mode
    if (week) {
      return handleWeeklyQuery(db, {
        search, position, team, season, week, sortBy, sortDir, limit, offset,
      })
    }

    // Season stats mode (default)
    return handleSeasonQuery(db, {
      search, position, team, season, sortBy, sortDir, limit, offset,
    })
  } catch (error: unknown) {
    console.error("Player search error:", error)
    return NextResponse.json(
      { error: "Failed to search players" },
      { status: 500 }
    )
  }
}

function mapSeasonRow(row: Record<string, unknown>) {
  const key = (row.gsis_id as string) || `${row.full_name}-${row.position}`
  return {
    name: row.full_name as string,
    playerId: key,
    position: row.position as string,
    team: row.team as string,
    season: row.season as number,
    headshotUrl: row.headshot_url as string | null,
    college: row.college as string | null,
    yearsExp: row.years_exp as number | null,
    jerseyNumber: row.jersey_number as number | null,
    games: (row.games as number) ?? 0,
    fantasyPoints: (row.fantasy_points_ppr as number) ?? 0,
    // Passing
    passingAttempts: (row.passing_attempts as number) ?? 0,
    completions: (row.completions as number) ?? 0,
    passingYards: (row.passing_yards as number) ?? 0,
    passingTds: (row.passing_tds as number) ?? 0,
    passingInterceptions: (row.passing_interceptions as number) ?? 0,
    sacks: (row.sacks_suffered as number) ?? 0,
    passingEpa: (row.passing_epa as number) ?? 0,
    passingAirYards: (row.passing_air_yards as number) ?? 0,
    passingYac: (row.passing_yac as number) ?? 0,
    passingFirstDowns: (row.passing_first_downs as number) ?? 0,
    passingCpoe: (row.passing_cpoe as number) ?? 0,
    passing2pt: (row.passing_2pt as number) ?? 0,
    sackFumbles: (row.sack_fumbles as number) ?? 0,
    sackYardsLost: (row.sack_yards_lost as number) ?? 0,
    pacr: (row.pacr as number) ?? 0,
    // Rushing
    carries: (row.carries as number) ?? 0,
    rushingYards: (row.rushing_yards as number) ?? 0,
    rushingTds: (row.rushing_tds as number) ?? 0,
    rushingFumbles: (row.rushing_fumbles as number) ?? 0,
    rushingFumblesLost: (row.rushing_fumbles_lost as number) ?? 0,
    rushingEpa: (row.rushing_epa as number) ?? 0,
    rushingFirstDowns: (row.rushing_first_downs as number) ?? 0,
    rushing2pt: (row.rushing_2pt as number) ?? 0,
    // Receiving
    targets: (row.targets as number) ?? 0,
    receptions: (row.receptions as number) ?? 0,
    receivingYards: (row.receiving_yards as number) ?? 0,
    receivingTds: (row.receiving_tds as number) ?? 0,
    receivingFumbles: (row.receiving_fumbles as number) ?? 0,
    receivingYac: (row.receiving_yac as number) ?? 0,
    receivingEpa: (row.receiving_epa as number) ?? 0,
    receivingAirYards: (row.receiving_air_yards as number) ?? 0,
    receivingFirstDowns: (row.receiving_first_downs as number) ?? 0,
    targetShare: (row.target_share as number) ?? 0,
    airYardsShare: (row.air_yards_share as number) ?? 0,
    wopr: (row.wopr as number) ?? 0,
    racr: (row.racr as number) ?? 0,
    receiving2pt: (row.receiving_2pt as number) ?? 0,
  }
}

function handleSeasonQuery(
  db: ReturnType<typeof getDatabase>,
  opts: {
    search: string; position: string; team: string; season: string
    sortBy: string; sortDir: string; limit: number; offset: number
  }
) {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (opts.search) {
    conditions.push("r.full_name LIKE ?")
    params.push(`%${opts.search}%`)
  }
  if (opts.position) {
    conditions.push("r.position = ?")
    params.push(opts.position)
  }
  if (opts.team) {
    conditions.push("r.team = ?")
    params.push(opts.team)
  }
  if (opts.season) {
    conditions.push("r.season = ?")
    params.push(parseInt(opts.season))
  }

  if (!opts.position && !opts.search) {
    conditions.push("r.position IN ('QB', 'RB', 'WR', 'TE', 'K')")
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const orderCol = SEASON_SORT_FIELDS[opts.sortBy] || SEASON_SORT_FIELDS.fantasyPoints

  const query = `
    SELECT
      r.full_name, r.position, r.team, r.season, r.gsis_id, r.headshot_url, r.college,
      r.years_exp, r.jersey_number,
      s.games, s.fantasy_points_ppr,
      s.attempts AS passing_attempts, s.completions,
      s.passing_yards, s.passing_tds, s.passing_interceptions,
      s.sacks_suffered, s.passing_epa,
      s.passing_air_yards, s.passing_yards_after_catch AS passing_yac,
      s.passing_first_downs, s.passing_cpoe, s.passing_2pt_conversions AS passing_2pt,
      s.sack_fumbles, s.sack_yards_lost, s.pacr,
      s.carries, s.rushing_yards, s.rushing_tds,
      s.rushing_fumbles, s.rushing_fumbles_lost,
      s.rushing_epa, s.rushing_first_downs, s.rushing_2pt_conversions AS rushing_2pt,
      s.targets, s.receptions, s.receiving_yards, s.receiving_tds,
      s.receiving_fumbles, s.receiving_yards_after_catch AS receiving_yac,
      s.receiving_epa, s.receiving_air_yards, s.receiving_first_downs,
      s.target_share, s.air_yards_share, s.wopr, s.racr,
      s.receiving_2pt_conversions AS receiving_2pt
    FROM roster_data r
    LEFT JOIN season_stats s
      ON r.gsis_id = s.player_id AND r.season = s.season
    ${where}
    ORDER BY ${orderCol} ${opts.sortDir}, r.full_name ASC
    LIMIT ? OFFSET ?
  `

  params.push(opts.limit, opts.offset)

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[]

  const seen = new Set<string>()
  const players = []

  for (const row of rows) {
    const key = (row.gsis_id as string) || `${row.full_name}-${row.position}`
    if (seen.has(key)) continue
    seen.add(key)
    players.push(mapSeasonRow(row))
  }

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(DISTINCT COALESCE(r.gsis_id, r.full_name || '-' || r.position)) as total
    FROM roster_data r
    LEFT JOIN season_stats s ON r.gsis_id = s.player_id AND r.season = s.season
    ${where}
  `
  const countParams = params.slice(0, -2) // remove limit and offset
  const countResult = db.prepare(countQuery).get(...countParams) as { total: number }

  const seasons = db
    .prepare("SELECT DISTINCT season FROM roster_data ORDER BY season DESC")
    .all() as { season: number }[]

  return NextResponse.json({
    players,
    totalCount: countResult.total,
    availableSeasons: seasons.map((s) => s.season),
  })
}

function handleWeeklyQuery(
  db: ReturnType<typeof getDatabase>,
  opts: {
    search: string; position: string; team: string; season: string; week: string
    sortBy: string; sortDir: string; limit: number; offset: number
  }
) {
  const conditions: string[] = ["w.week = ?"]
  const params: (string | number)[] = [parseInt(opts.week)]

  if (opts.search) {
    conditions.push("w.player_display_name LIKE ?")
    params.push(`%${opts.search}%`)
  }
  if (opts.position) {
    conditions.push("w.position = ?")
    params.push(opts.position)
  }
  if (opts.team) {
    conditions.push("w.team = ?")
    params.push(opts.team)
  }
  if (opts.season) {
    conditions.push("w.season = ?")
    params.push(parseInt(opts.season))
  }

  if (!opts.position && !opts.search) {
    conditions.push("w.position IN ('QB', 'RB', 'WR', 'TE', 'K')")
  }

  const where = `WHERE ${conditions.join(" AND ")}`
  const orderCol = WEEKLY_SORT_FIELDS[opts.sortBy] || WEEKLY_SORT_FIELDS.fantasyPoints

  const query = `
    SELECT
      w.player_display_name, w.position, w.team, w.season, w.player_id, w.headshot_url,
      w.opponent_team, w.week,
      w.fantasy_points_ppr,
      w.attempts AS passing_attempts, w.completions,
      w.passing_yards, w.passing_tds, w.passing_interceptions,
      w.sacks_suffered, w.passing_epa,
      w.passing_air_yards, w.passing_yards_after_catch AS passing_yac,
      w.passing_first_downs, w.passing_cpoe, w.passing_2pt_conversions AS passing_2pt,
      w.sack_fumbles, w.sack_yards_lost, w.pacr,
      w.carries, w.rushing_yards, w.rushing_tds,
      w.rushing_fumbles, w.rushing_fumbles_lost,
      w.rushing_epa, w.rushing_first_downs, w.rushing_2pt_conversions AS rushing_2pt,
      w.targets, w.receptions, w.receiving_yards, w.receiving_tds,
      w.receiving_fumbles, w.receiving_yards_after_catch AS receiving_yac,
      w.receiving_epa, w.receiving_air_yards, w.receiving_first_downs,
      w.target_share, w.air_yards_share, w.wopr, w.racr,
      w.receiving_2pt_conversions AS receiving_2pt,
      r.jersey_number, r.college, r.years_exp
    FROM weekly_stats w
    LEFT JOIN roster_data r
      ON w.player_id = r.gsis_id AND w.season = r.season
    ${where}
    ORDER BY ${orderCol} ${opts.sortDir}, w.player_display_name ASC
    LIMIT ? OFFSET ?
  `

  params.push(opts.limit, opts.offset)

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[]

  const seen = new Set<string>()
  const players = []

  for (const row of rows) {
    const key = (row.player_id as string) || `${row.player_display_name}-${row.position}`
    if (seen.has(key)) continue
    seen.add(key)
    players.push({
      name: row.player_display_name as string,
      playerId: key,
      position: row.position as string,
      team: row.team as string,
      season: row.season as number,
      headshotUrl: row.headshot_url as string | null,
      college: row.college as string | null,
      yearsExp: row.years_exp as number | null,
      jerseyNumber: row.jersey_number as number | null,
      opponentTeam: row.opponent_team as string | null,
      fantasyPoints: (row.fantasy_points_ppr as number) ?? 0,
      // Passing
      passingAttempts: (row.passing_attempts as number) ?? 0,
      completions: (row.completions as number) ?? 0,
      passingYards: (row.passing_yards as number) ?? 0,
      passingTds: (row.passing_tds as number) ?? 0,
      passingInterceptions: (row.passing_interceptions as number) ?? 0,
      sacks: (row.sacks_suffered as number) ?? 0,
      passingEpa: (row.passing_epa as number) ?? 0,
      passingAirYards: (row.passing_air_yards as number) ?? 0,
      passingYac: (row.passing_yac as number) ?? 0,
      passingFirstDowns: (row.passing_first_downs as number) ?? 0,
      passingCpoe: (row.passing_cpoe as number) ?? 0,
      passing2pt: (row.passing_2pt as number) ?? 0,
      sackFumbles: (row.sack_fumbles as number) ?? 0,
      sackYardsLost: (row.sack_yards_lost as number) ?? 0,
      pacr: (row.pacr as number) ?? 0,
      // Rushing
      carries: (row.carries as number) ?? 0,
      rushingYards: (row.rushing_yards as number) ?? 0,
      rushingTds: (row.rushing_tds as number) ?? 0,
      rushingFumbles: (row.rushing_fumbles as number) ?? 0,
      rushingFumblesLost: (row.rushing_fumbles_lost as number) ?? 0,
      rushingEpa: (row.rushing_epa as number) ?? 0,
      rushingFirstDowns: (row.rushing_first_downs as number) ?? 0,
      rushing2pt: (row.rushing_2pt as number) ?? 0,
      // Receiving
      targets: (row.targets as number) ?? 0,
      receptions: (row.receptions as number) ?? 0,
      receivingYards: (row.receiving_yards as number) ?? 0,
      receivingTds: (row.receiving_tds as number) ?? 0,
      receivingFumbles: (row.receiving_fumbles as number) ?? 0,
      receivingYac: (row.receiving_yac as number) ?? 0,
      receivingEpa: (row.receiving_epa as number) ?? 0,
      receivingAirYards: (row.receiving_air_yards as number) ?? 0,
      receivingFirstDowns: (row.receiving_first_downs as number) ?? 0,
      targetShare: (row.target_share as number) ?? 0,
      airYardsShare: (row.air_yards_share as number) ?? 0,
      wopr: (row.wopr as number) ?? 0,
      racr: (row.racr as number) ?? 0,
      receiving2pt: (row.receiving_2pt as number) ?? 0,
    })
  }

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(DISTINCT COALESCE(w.player_id, w.player_display_name || '-' || w.position)) as total
    FROM weekly_stats w
    LEFT JOIN roster_data r ON w.player_id = r.gsis_id AND w.season = r.season
    ${where}
  `
  const countParams = params.slice(0, -2)
  const countResult = db.prepare(countQuery).get(...countParams) as { total: number }

  const seasons = db
    .prepare("SELECT DISTINCT season FROM roster_data ORDER BY season DESC")
    .all() as { season: number }[]

  return NextResponse.json({
    players,
    totalCount: countResult.total,
    availableSeasons: seasons.map((s) => s.season),
  })
}
