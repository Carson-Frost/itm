import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { getDatabase } from "@/lib/database/connection"
import { logAudit } from "@/lib/audit"

// Tables allowed to be queried
const ALLOWED_TABLES = [
  "roster_data",
  "season_stats",
  "weekly_stats",
  "schedule_data",
  "sleeper_adp",
  "yahoo_adp",
  "metadata",
] as const

type AllowedTable = (typeof ALLOWED_TABLES)[number]

// Fields that can be edited via the admin panel
const EDITABLE_FIELDS: Record<string, string[]> = {
  roster_data: ["position", "jersey_number", "status", "depth_chart_position", "headshot_url"],
  season_stats: ["position", "position_group", "headshot_url"],
  weekly_stats: ["position", "position_group", "headshot_url"],
  schedule_data: ["location", "stadium"],
  sleeper_adp: ["position", "team"],
  yahoo_adp: ["position", "team"],
  metadata: ["value"],
}

// Primary key column per table
const PRIMARY_KEYS: Record<string, string> = {
  roster_data: "id",
  season_stats: "id",
  weekly_stats: "id",
  schedule_data: "game_id",
  sleeper_adp: "id",
  yahoo_adp: "id",
  metadata: "key",
}

// Columns that can be used as dropdown filters per table
const FILTER_COLUMNS: Record<string, string[]> = {
  roster_data: ["team", "position", "status", "season"],
  season_stats: ["position", "recent_team", "season", "season_type"],
  weekly_stats: ["position", "team", "season", "week", "season_type"],
  schedule_data: ["season", "week", "game_type"],
  sleeper_adp: ["position", "team", "season"],
  yahoo_adp: ["position", "team", "season"],
  metadata: [],
}

// Columns to show in the table listing (ordered, human-friendly subset)
const TABLE_DISPLAY_COLUMNS: Record<string, string[]> = {
  roster_data: ["full_name", "team", "position", "jersey_number", "status", "season", "college", "years_exp"],
  season_stats: ["player_display_name", "position", "recent_team", "season", "games", "passing_yards", "rushing_yards", "receiving_yards", "fantasy_points_ppr"],
  weekly_stats: ["player_display_name", "position", "team", "season", "week", "passing_yards", "rushing_yards", "receiving_yards", "fantasy_points_ppr"],
  schedule_data: ["season", "week", "game_type", "away_team", "away_score", "home_team", "home_score", "gameday"],
  sleeper_adp: ["player_name", "position", "team", "season", "adp_ppr", "adp_half_ppr", "adp_std"],
  yahoo_adp: ["player_name", "position", "team", "season", "adp", "adp_round", "percent_drafted"],
  metadata: ["key", "value"],
}

const PAGE_SIZE = 50

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable)
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const table = searchParams.get("table") || "roster_data"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const sort = searchParams.get("sort") || ""
  const sortDir = searchParams.get("sortDir") === "desc" ? "DESC" : "ASC"
  const search = searchParams.get("search") || ""
  const id = searchParams.get("id") || ""
  const getFilters = searchParams.get("filters") === "true"

  if (!isAllowedTable(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  }

  const db = getDatabase()

  // Return distinct filter values for filterable columns
  if (getFilters) {
    const filterCols = FILTER_COLUMNS[table] || []
    const filters: Record<string, string[]> = {}
    for (const col of filterCols) {
      try {
        const rows = db
          .prepare(`SELECT DISTINCT ${col} FROM ${table} WHERE ${col} IS NOT NULL AND ${col} != '' ORDER BY ${col}`)
          .all() as Record<string, unknown>[]
        filters[col] = rows.map((r) => String(r[col]))
      } catch {
        filters[col] = []
      }
    }
    return NextResponse.json({ filters })
  }

  // If requesting a single record by ID
  if (id) {
    const pk = PRIMARY_KEYS[table]
    const row = db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(id)
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({
      row,
      editableFields: EDITABLE_FIELDS[table] || [],
    })
  }

  // Get column info
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
    type: string
  }[]

  // Build query
  const conditions: string[] = []
  const params: unknown[] = []

  // Parse filter params (filter_column=value)
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("filter_") && value) {
      const col = key.replace("filter_", "")
      const validCol = columns.find((c) => c.name === col)
      if (validCol) {
        conditions.push(`${col} = ?`)
        params.push(value)
      }
    }
  }

  // Global search — search across text columns
  if (search) {
    const textCols = columns
      .filter((c) => c.type.toUpperCase().includes("TEXT"))
      .map((c) => c.name)
    if (textCols.length > 0) {
      const searchConditions = textCols.map((c) => `${c} LIKE ?`)
      conditions.push(`(${searchConditions.join(" OR ")})`)
      for (const _col of textCols) {
        params.push(`%${search}%`)
      }
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  // Sort validation
  let orderClause = ""
  if (sort && columns.find((c) => c.name === sort)) {
    orderClause = `ORDER BY ${sort} ${sortDir}`
  }

  // Count total
  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`)
    .get(...params) as { total: number }

  // Fetch page
  const offset = (page - 1) * PAGE_SIZE
  const rows = db
    .prepare(
      `SELECT * FROM ${table} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset)

  // Last updated from metadata
  let lastUpdated: string | null = null
  try {
    const meta = db
      .prepare("SELECT value FROM metadata WHERE key = 'last_import_date'")
      .get() as { value: string } | undefined
    lastUpdated = meta?.value ?? null
  } catch {
    // ignore
  }

  return NextResponse.json({
    rows,
    total: countRow.total,
    page,
    pageSize: PAGE_SIZE,
    columns: columns.map((c) => ({ name: c.name, type: c.type })),
    displayColumns: TABLE_DISPLAY_COLUMNS[table] || columns.slice(0, 8).map((c) => c.name),
    filterColumns: FILTER_COLUMNS[table] || [],
    editableFields: EDITABLE_FIELDS[table] || [],
    lastUpdated,
  })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { table, id, field, value } = body

  if (!table || !id || !field || value === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: table, id, field, value" },
      { status: 400 }
    )
  }

  if (!isAllowedTable(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  }

  const allowedFields = EDITABLE_FIELDS[table]
  if (!allowedFields || !allowedFields.includes(field)) {
    return NextResponse.json(
      { error: `Field "${field}" is not editable on table "${table}"` },
      { status: 403 }
    )
  }

  const db = getDatabase()
  const pk = PRIMARY_KEYS[table]

  // Read current value for audit log
  const currentRow = db
    .prepare(`SELECT ${field} FROM ${table} WHERE ${pk} = ?`)
    .get(id) as Record<string, unknown> | undefined

  if (!currentRow) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const beforeValue = currentRow[field]

  // Log audit BEFORE the write
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown"
  try {
    await logAudit({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `UPDATE_${table.toUpperCase()}_${field.toUpperCase()}`,
      resource: `${table}/${id}`,
      before: beforeValue,
      after: value,
      ip,
    })
  } catch (err) {
    console.error("Audit log failed:", err)
    // Continue with the update even if audit log fails in dev
    // In production, you may want to block the update
  }

  // Perform the update
  db.prepare(`UPDATE ${table} SET ${field} = ? WHERE ${pk} = ?`).run(
    value,
    id
  )

  // Return updated record
  const updatedRow = db
    .prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`)
    .get(id)

  return NextResponse.json({ row: updatedRow })
}
