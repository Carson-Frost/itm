// MongoDB collection schema types
// These represent the raw data structure from MongoDB (snake_case fields)

export interface RosterData {
  _id: string // Format: "season_gsis_id" (e.g., "2025_00-0023459")
  season: number
  team: string
  position: string
  full_name: string
  gsis_id: string
  espn_id?: string
  headshot_url?: string
}

// Exact match to MongoDB season_stats collection schema
export interface SeasonStats {
  _id: string
  player_id: string
  player_name: string
  player_display_name: string
  position: string
  position_group: string
  headshot_url: string
  season: number
  season_type: string
  recent_team: string
  games: number
  completions: number
  attempts: number
  passing_yards: number
  passing_tds: number
  passing_interceptions: number
  sacks_suffered: number
  sack_yards_lost: number
  sack_fumbles: number
  sack_fumbles_lost: number
  passing_air_yards: number
  passing_yards_after_catch: number
  passing_first_downs: number
  passing_epa: number
  passing_cpoe: number
  passing_2pt_conversions: number
  pacr: number
  carries: number
  rushing_yards: number
  rushing_tds: number
  rushing_fumbles: number
  rushing_fumbles_lost: number
  rushing_first_downs: number
  rushing_epa: number
  rushing_2pt_conversions: number
  receptions: number
  targets: number
  receiving_yards: number
  receiving_tds: number
  receiving_fumbles: number
  receiving_fumbles_lost: number
  receiving_air_yards: number
  receiving_yards_after_catch: number
  receiving_first_downs: number
  receiving_epa: number
  receiving_2pt_conversions: number
  racr: number
  target_share: number
  air_yards_share: number
  wopr: number
  special_teams_tds: number
  fantasy_points: number
  fantasy_points_ppr: number
}

export interface WeeklyStats {
  _id: string // Format: "season_week_player_id" (e.g., "2025_1_00-0023459")
  player_id: string
  player_display_name: string
  season: number
  week: number
  position: string
  recent_team: string

  // Same stat structure as SeasonStats
  completions: number
  attempts: number
  passing_yards: number
  passing_tds: number
  interceptions: number
  carries: number
  rushing_yards: number
  rushing_tds: number
  receptions: number
  targets: number
  receiving_yards: number
  receiving_tds: number
  fantasy_points: number
  fantasy_points_ppr: number
}
