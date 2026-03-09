import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

// Database file path
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'itm-scouting.db')

let db: Database.Database | null = null

/**
 * Gets the SQLite database connection
 * Creates a new connection if one doesn't exist (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  // Create database connection
  db = new Database(DB_PATH, {
    // Read-only in production, read-write during development/migration
    readonly: process.env.NODE_ENV === 'production' && process.env.DB_READONLY !== 'false',
    fileMustExist: false,
  })

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')

  // Initialize schema if needed
  initializeSchema(db)

  return db
}

/**
 * Initializes the database schema if tables don't exist
 */
function initializeSchema(database: Database.Database) {
  // Check if tables exist
  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('metadata', 'roster_data', 'season_stats', 'weekly_stats', 'schedule_data', 'sleeper_adp', 'yahoo_adp')"
    )
    .all()

  // If all tables exist, skip initialization
  if (tables.length === 7) {
    return
  }

  // Read and execute schema file
  const schemaPath = join(process.cwd(), 'lib', 'database', 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')

  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0)

  for (const statement of statements) {
    database.exec(statement)
  }
}

/**
 * Closes the database connection
 * Useful for cleanup in scripts
 */
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
