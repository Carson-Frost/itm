import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getDatabase } from "@/lib/database/connection"

const SEASON_SORT_FIELDS: Record<string, string> = {
  name: "r.full_name",
  team: "r.team",
  position: "r.position",
  season: "r.season",
  fantasyPoints: "COALESCE(s.fantasy_points_ppr, 0)",
  passingYards: "COALESCE(s.passing_yards, 0)",
  passingTds: "COALESCE(s.passing_tds, 0)",
  passingInterceptions: "COALESCE(s.passing_interceptions, 0)",
  sacks: "COALESCE(s.sacks_suffered, 0)",
  passingEpa: "COALESCE(s.passing_epa, 0)",
  passingAttempts: "COALESCE(s.attempts, 0)",
  completions: "COALESCE(s.completions, 0)",
  rushingYards: "COALESCE(s.rushing_yards, 0)",
  rushingTds: "COALESCE(s.rushing_tds, 0)",
  rushingFumbles: "COALESCE(s.rushing_fumbles, 0)",
  rushingEpa: "COALESCE(s.rushing_epa, 0)",
  receivingYards: "COALESCE(s.receiving_yards, 0)",
  receivingTds: "COALESCE(s.receiving_tds, 0)",
  receivingYac: "COALESCE(s.receiving_yards_after_catch, 0)",
  receivingEpa: "COALESCE(s.receiving_epa, 0)",
  receptions: "COALESCE(s.receptions, 0)",
  targets: "COALESCE(s.targets, 0)",
  carries: "COALESCE(s.carries, 0)",
  games: "COALESCE(s.games, 0)",
}

const WEEKLY_SORT_FIELDS: Record<string, string> = {
  name: "w.player_display_name",
  team: "w.team",
  position: "w.position",
  fantasyPoints: "COALESCE(w.fantasy_points_ppr, 0)",
  passingYards: "COALESCE(w.passing_yards, 0)",
  passingTds: "COALESCE(w.passing_tds, 0)",
  passingInterceptions: "COALESCE(w.passing_interceptions, 0)",
  sacks: "COALESCE(w.sacks_suffered, 0)",
  passingEpa: "COALESCE(w.passing_epa, 0)",
  passingAttempts: "COALESCE(w.attempts, 0)",
  completions: "COALESCE(w.completions, 0)",
  rushingYards: "COALESCE(w.rushing_yards, 0)",
  rushingTds: "COALESCE(w.rushing_tds, 0)",
  rushingFumbles: "COALESCE(w.rushing_fumbles, 0)",
  rushingEpa: "COALESCE(w.rushing_epa, 0)",
  receivingYards: "COALESCE(w.receiving_yards, 0)",
  receivingTds: "COALESCE(w.receiving_tds, 0)",
  receivingYac: "COALESCE(w.receiving_yards_after_catch, 0)",
  receivingEpa: "COALESCE(w.receiving_epa, 0)",
  receptions: "COALESCE(w.receptions, 0)",
  targets: "COALESCE(w.targets, 0)",
  carries: "COALESCE(w.carries, 0)",
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
      s.games, s.fantasy_points_ppr, s.passing_yards, s.passing_tds,
      s.passing_interceptions, s.sacks_suffered, s.passing_epa,
      s.attempts AS passing_attempts, s.completions,
      s.rushing_yards, s.rushing_tds, s.carries, s.rushing_fumbles, s.rushing_epa,
      s.receptions, s.targets, s.receiving_yards, s.receiving_tds,
      s.receiving_yards_after_catch, s.receiving_epa
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
    players.push({
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
      passingAttempts: (row.passing_attempts as number) ?? 0,
      completions: (row.completions as number) ?? 0,
      passingYards: (row.passing_yards as number) ?? 0,
      passingTds: (row.passing_tds as number) ?? 0,
      passingInterceptions: (row.passing_interceptions as number) ?? 0,
      sacks: (row.sacks_suffered as number) ?? 0,
      passingEpa: (row.passing_epa as number) ?? 0,
      carries: (row.carries as number) ?? 0,
      rushingYards: (row.rushing_yards as number) ?? 0,
      rushingTds: (row.rushing_tds as number) ?? 0,
      rushingFumbles: (row.rushing_fumbles as number) ?? 0,
      rushingEpa: (row.rushing_epa as number) ?? 0,
      targets: (row.targets as number) ?? 0,
      receptions: (row.receptions as number) ?? 0,
      receivingYards: (row.receiving_yards as number) ?? 0,
      receivingTds: (row.receiving_tds as number) ?? 0,
      receivingYac: (row.receiving_yards_after_catch as number) ?? 0,
      receivingEpa: (row.receiving_epa as number) ?? 0,
    })
  }

  const seasons = db
    .prepare("SELECT DISTINCT season FROM roster_data ORDER BY season DESC")
    .all() as { season: number }[]

  return NextResponse.json({
    players,
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
      w.passing_yards, w.passing_tds, w.passing_interceptions,
      w.sacks_suffered, w.passing_epa, w.attempts AS passing_attempts, w.completions,
      w.rushing_yards, w.rushing_tds, w.carries, w.rushing_fumbles, w.rushing_epa,
      w.receptions, w.targets, w.receiving_yards, w.receiving_tds,
      w.receiving_yards_after_catch, w.receiving_epa,
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
      passingAttempts: (row.passing_attempts as number) ?? 0,
      completions: (row.completions as number) ?? 0,
      passingYards: (row.passing_yards as number) ?? 0,
      passingTds: (row.passing_tds as number) ?? 0,
      passingInterceptions: (row.passing_interceptions as number) ?? 0,
      sacks: (row.sacks_suffered as number) ?? 0,
      passingEpa: (row.passing_epa as number) ?? 0,
      carries: (row.carries as number) ?? 0,
      rushingYards: (row.rushing_yards as number) ?? 0,
      rushingTds: (row.rushing_tds as number) ?? 0,
      rushingFumbles: (row.rushing_fumbles as number) ?? 0,
      rushingEpa: (row.rushing_epa as number) ?? 0,
      targets: (row.targets as number) ?? 0,
      receptions: (row.receptions as number) ?? 0,
      receivingYards: (row.receiving_yards as number) ?? 0,
      receivingTds: (row.receiving_tds as number) ?? 0,
      receivingYac: (row.receiving_yards_after_catch as number) ?? 0,
      receivingEpa: (row.receiving_epa as number) ?? 0,
    })
  }

  const seasons = db
    .prepare("SELECT DISTINCT season FROM roster_data ORDER BY season DESC")
    .all() as { season: number }[]

  return NextResponse.json({
    players,
    availableSeasons: seasons.map((s) => s.season),
  })
}
