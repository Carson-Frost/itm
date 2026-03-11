import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getDatabase } from "@/lib/database/connection"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl

  try {
    const db = getDatabase()

    const conditions: string[] = [
      "r.position IN ('QB', 'RB', 'WR', 'TE')",
      "s.fantasy_points_ppr IS NOT NULL",
    ]
    const queryParams: (string | number)[] = []

    // Array filters
    const colleges = searchParams.get("colleges")
    if (colleges) {
      const values = colleges.split(",").map((v) => v.trim()).filter(Boolean)
      if (values.length > 0) {
        const placeholders = values.map(() => "?").join(", ")
        conditions.push(`r.college IN (${placeholders})`)
        queryParams.push(...values)
      }
    }

    const teams = searchParams.get("teams")
    if (teams) {
      const values = teams.split(",").map((v) => v.trim()).filter(Boolean)
      if (values.length > 0) {
        const placeholders = values.map(() => "?").join(", ")
        conditions.push(`r.team IN (${placeholders})`)
        queryParams.push(...values)
      }
    }

    const positions = searchParams.get("positions")
    if (positions) {
      const values = positions.split(",").map((v) => v.trim()).filter(Boolean)
      if (values.length > 0) {
        const placeholders = values.map(() => "?").join(", ")
        conditions.push(`r.position IN (${placeholders})`)
        queryParams.push(...values)
      }
    }

    // Season range
    const seasonMin = searchParams.get("seasonMin")
    const seasonMax = searchParams.get("seasonMax")
    if (seasonMin) {
      conditions.push("r.season >= ?")
      queryParams.push(parseInt(seasonMin))
    }
    if (seasonMax) {
      conditions.push("r.season <= ?")
      queryParams.push(parseInt(seasonMax))
    }

    // Numeric minimum filters
    const numericFilters: [string, string][] = [
      ["minGames", "s.games"],
      ["minFantasyPointsPpr", "s.fantasy_points_ppr"],
      ["minPassingYards", "s.passing_yards"],
      ["minRushingYards", "s.rushing_yards"],
      ["minReceivingYards", "s.receiving_yards"],
      ["minPassingTds", "s.passing_tds"],
      ["minRushingTds", "s.rushing_tds"],
      ["minReceivingTds", "s.receiving_tds"],
    ]

    for (const [param, column] of numericFilters) {
      const value = searchParams.get(param)
      if (value) {
        conditions.push(`${column} >= ?`)
        queryParams.push(parseFloat(value))
      }
    }

    const where = `WHERE ${conditions.join(" AND ")}`

    // Get total count first
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM roster_data r
      LEFT JOIN season_stats s
        ON r.gsis_id = s.player_id AND r.season = s.season
      ${where}
    `
    const countRow = db.prepare(countQuery).get(...queryParams) as { total: number }
    const totalCount = countRow.total

    // Fetch players with optional limit
    const limit = parseInt(searchParams.get("limit") || "200")

    const query = `
      SELECT
        r.gsis_id AS player_id,
        r.full_name AS name,
        r.season,
        r.position,
        r.team,
        r.headshot_url,
        s.fantasy_points_ppr
      FROM roster_data r
      LEFT JOIN season_stats s
        ON r.gsis_id = s.player_id AND r.season = s.season
      ${where}
      ORDER BY s.fantasy_points_ppr DESC, r.full_name ASC
      ${limit > 0 ? `LIMIT ?` : ""}
    `

    const finalParams = limit > 0 ? [...queryParams, limit] : queryParams
    const rows = db.prepare(query).all(...finalParams) as Record<string, unknown>[]

    const players = rows.map((row) => ({
      playerId: row.player_id as string,
      name: row.name as string,
      season: row.season as number,
      position: row.position as string,
      team: row.team as string,
      headshotUrl: (row.headshot_url as string | null) || null,
      fantasyPointsPpr: (row.fantasy_points_ppr as number) ?? 0,
    }))

    return NextResponse.json({ players, totalCount })
  } catch (error: unknown) {
    console.error("Trivia category preview players error:", error)
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    )
  }
}
