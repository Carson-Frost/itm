import { getDatabase } from '@/lib/mongodb'
import { SeasonStats, WeeklyStats, RosterData } from '@/lib/types/mongodb-schemas'
import { Collection } from 'mongodb'

// Collection names
const COLLECTIONS = {
  SEASON_STATS: 'season_stats',
  WEEKLY_STATS: 'weekly_stats',
  ROSTER_DATA: 'roster_data',
} as const

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

// Data access functions

export async function getSeasonStats(
  filter: SeasonStatsFilter = {}
): Promise<SeasonStats[]> {
  const db = await getDatabase()
  const collection: Collection<SeasonStats> = db.collection(COLLECTIONS.SEASON_STATS)

  // Build MongoDB query from filter
  const query: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    query.season = filter.season
  }

  if (filter.position) {
    query.position = filter.position
  }

  if (filter.playerId) {
    query.player_id = filter.playerId
  }

  if (filter.playerName) {
    // Case-insensitive partial match
    query.player_display_name = { $regex: filter.playerName, $options: 'i' }
  }

  if (filter.team) {
    // Case-insensitive exact match
    query.recent_team = { $regex: `^${filter.team}$`, $options: 'i' }
  }

  if (filter.minGames !== undefined) {
    query.games = { $gte: filter.minGames }
  }

  const results = await collection.find(query).toArray()

  return results.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }))
}

export async function getWeeklyStats(
  filter: WeeklyStatsFilter = {}
): Promise<WeeklyStats[]> {
  const db = await getDatabase()
  const collection: Collection<WeeklyStats> = db.collection(COLLECTIONS.WEEKLY_STATS)

  const query: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    query.season = filter.season
  }

  if (filter.week !== undefined) {
    query.week = filter.week
  }

  if (filter.position) {
    query.position = filter.position
  }

  if (filter.playerId) {
    query.player_id = filter.playerId
  }

  if (filter.playerName) {
    query.player_display_name = { $regex: filter.playerName, $options: 'i' }
  }

  if (filter.team) {
    query.recent_team = { $regex: `^${filter.team}$`, $options: 'i' }
  }

  const results = await collection.find(query).toArray()

  return results.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }))
}

export async function getRosterData(
  filter: RosterDataFilter = {}
): Promise<RosterData[]> {
  const db = await getDatabase()
  const collection: Collection<RosterData> = db.collection(COLLECTIONS.ROSTER_DATA)

  const query: Record<string, unknown> = {}

  if (filter.season !== undefined) {
    query.season = filter.season
  }

  if (filter.position) {
    query.position = filter.position
  }

  if (filter.team) {
    query.team = { $regex: `^${filter.team}$`, $options: 'i' }
  }

  if (filter.gsis_id) {
    query.gsis_id = filter.gsis_id
  }

  const results = await collection.find(query).toArray()

  return results.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }))
}

// Get available seasons from season_stats collection
export async function getAvailableSeasons(): Promise<number[]> {
  const db = await getDatabase()
  const collection: Collection<SeasonStats> = db.collection(COLLECTIONS.SEASON_STATS)

  const seasons = await collection.distinct('season')

  // Sort descending (most recent first)
  return seasons.sort((a, b) => b - a)
}
