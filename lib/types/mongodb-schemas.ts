// MongoDB collection schema types
// These represent the raw data structure from MongoDB (snake_case fields)

export interface RosterData {
  _id: string // Format: "season_gsis_id" (e.g., "2025_00-0023459")
  season: number
  team: string
  position: string
  depth_chart_position?: string
  jersey_number?: number
  status?: string
  full_name: string
  first_name?: string
  last_name?: string
  birth_date?: string
  height?: number
  weight?: number
  college?: string
  gsis_id: string
  espn_id?: number
  sportradar_id?: string
  yahoo_id?: number
  rotowire_id?: number
  pff_id?: number
  pfr_id?: string
  fantasy_data_id?: number
  sleeper_id?: number
  years_exp?: number
  headshot_url?: string
  ngs_position?: string | null
  week?: number
  game_type?: string
  status_description_abbr?: string
  football_name?: string
  esb_id?: string
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
  player_name: string
  player_display_name: string
  position: string
  position_group: string
  headshot_url?: string
  season: number
  week: number
  season_type: string
  team: string
  opponent_team: string

  // Passing stats
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

  // Rushing stats
  carries: number
  rushing_yards: number
  rushing_tds: number
  rushing_fumbles: number
  rushing_fumbles_lost: number
  rushing_first_downs: number
  rushing_epa: number
  rushing_2pt_conversions: number

  // Receiving stats
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

  // Special teams & defense
  special_teams_tds: number
  def_tackles_solo: number
  def_tackles_with_assist: number
  def_tackle_assists: number
  def_tackles_for_loss: number
  def_tackles_for_loss_yards: number
  def_fumbles_forced: number
  def_sacks: number
  def_sack_yards: number
  def_qb_hits: number
  def_interceptions: number
  def_interception_yards: number
  def_pass_defended: number
  def_tds: number
  def_fumbles: number
  def_safeties: number

  // Misc
  misc_yards: number
  fumble_recovery_own: number
  fumble_recovery_yards_own: number
  fumble_recovery_opp: number
  fumble_recovery_yards_opp: number
  fumble_recovery_tds: number
  penalties: number
  penalty_yards: number
  punt_returns: number
  punt_return_yards: number
  kickoff_returns: number
  kickoff_return_yards: number

  // Kicking
  fg_made: number
  fg_att: number
  fg_missed: number
  fg_blocked: number
  fg_long: number
  fg_pct: number
  fg_made_0_19: number
  fg_made_20_29: number
  fg_made_30_39: number
  fg_made_40_49: number
  fg_made_50_59: number
  fg_made_60_: number
  fg_missed_0_19: number
  fg_missed_20_29: number
  fg_missed_30_39: number
  fg_missed_40_49: number
  fg_missed_50_59: number
  fg_missed_60_: number
  fg_made_list: string | null
  fg_missed_list: string | null
  fg_blocked_list: string | null
  fg_made_distance: number
  fg_missed_distance: number
  fg_blocked_distance: number
  pat_made: number
  pat_att: number
  pat_missed: number
  pat_blocked: number
  pat_pct: number
  gwfg_made: number
  gwfg_att: number
  gwfg_missed: number
  gwfg_blocked: number
  gwfg_distance: number

  // Fantasy points
  fantasy_points: number
  fantasy_points_ppr: number
}

export interface ScheduleData {
  game_id: string
  season: number
  game_type: string
  week: number
  gameday?: string
  weekday?: string
  gametime?: string
  away_team: string
  away_score?: number
  home_team: string
  home_score?: number
  location?: string
  result?: number
  total?: number
  overtime?: number
  old_game_id?: string
  gsis?: number
  nfl_detail_id?: string
  pfr?: string
  pff?: number
  espn?: number
  ftn?: number
  away_rest?: number
  home_rest?: number
  away_moneyline?: number
  home_moneyline?: number
  spread_line?: number
  away_spread_odds?: number
  home_spread_odds?: number
  total_line?: number
  under_odds?: number
  over_odds?: number
  div_game?: number
  roof?: string
  surface?: string
  temp?: number
  wind?: number
  away_qb_id?: string
  home_qb_id?: string
  away_qb_name?: string
  home_qb_name?: string
  away_coach?: string
  home_coach?: string
  referee?: string
  stadium_id?: string
  stadium?: string
}
