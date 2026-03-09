-- ITM Scouting Database Schema
-- SQLite database for NFL player statistics

-- ============================================================
-- METADATA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================
-- ROSTER DATA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roster_data (
  id TEXT PRIMARY KEY,
  season INTEGER,
  team TEXT,
  position TEXT,
  depth_chart_position TEXT,
  jersey_number INTEGER,
  status TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  height INTEGER,
  weight INTEGER,
  college TEXT,
  gsis_id TEXT,
  espn_id INTEGER,
  sportradar_id TEXT,
  yahoo_id INTEGER,
  rotowire_id INTEGER,
  pff_id INTEGER,
  pfr_id TEXT,
  fantasy_data_id INTEGER,
  sleeper_id INTEGER,
  years_exp INTEGER,
  headshot_url TEXT,
  ngs_position TEXT,
  week INTEGER,
  game_type TEXT,
  status_description_abbr TEXT,
  football_name TEXT,
  esb_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_roster_season ON roster_data(season);
CREATE INDEX IF NOT EXISTS idx_roster_gsis_id ON roster_data(gsis_id);
CREATE INDEX IF NOT EXISTS idx_roster_season_gsis ON roster_data(season, gsis_id);
CREATE INDEX IF NOT EXISTS idx_roster_position ON roster_data(position);
CREATE INDEX IF NOT EXISTS idx_roster_team ON roster_data(team);

-- ============================================================
-- SEASON STATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS season_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT,
  player_name TEXT,
  player_display_name TEXT,
  position TEXT,
  position_group TEXT,
  headshot_url TEXT,
  season INTEGER,
  season_type TEXT,
  recent_team TEXT,
  games INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  passing_yards INTEGER DEFAULT 0,
  passing_tds INTEGER DEFAULT 0,
  passing_interceptions INTEGER DEFAULT 0,
  sacks_suffered INTEGER DEFAULT 0,
  sack_yards_lost INTEGER DEFAULT 0,
  sack_fumbles INTEGER DEFAULT 0,
  sack_fumbles_lost INTEGER DEFAULT 0,
  passing_air_yards INTEGER DEFAULT 0,
  passing_yards_after_catch INTEGER DEFAULT 0,
  passing_first_downs INTEGER DEFAULT 0,
  passing_epa REAL DEFAULT 0,
  passing_cpoe REAL DEFAULT 0,
  passing_2pt_conversions INTEGER DEFAULT 0,
  pacr REAL DEFAULT 0,
  carries INTEGER DEFAULT 0,
  rushing_yards INTEGER DEFAULT 0,
  rushing_tds INTEGER DEFAULT 0,
  rushing_fumbles INTEGER DEFAULT 0,
  rushing_fumbles_lost INTEGER DEFAULT 0,
  rushing_first_downs INTEGER DEFAULT 0,
  rushing_epa REAL DEFAULT 0,
  rushing_2pt_conversions INTEGER DEFAULT 0,
  receptions INTEGER DEFAULT 0,
  targets INTEGER DEFAULT 0,
  receiving_yards INTEGER DEFAULT 0,
  receiving_tds INTEGER DEFAULT 0,
  receiving_fumbles INTEGER DEFAULT 0,
  receiving_fumbles_lost INTEGER DEFAULT 0,
  receiving_air_yards INTEGER DEFAULT 0,
  receiving_yards_after_catch INTEGER DEFAULT 0,
  receiving_first_downs INTEGER DEFAULT 0,
  receiving_epa REAL DEFAULT 0,
  receiving_2pt_conversions INTEGER DEFAULT 0,
  racr REAL DEFAULT 0,
  target_share REAL DEFAULT 0,
  air_yards_share REAL DEFAULT 0,
  wopr REAL DEFAULT 0,
  special_teams_tds INTEGER DEFAULT 0,
  fantasy_points REAL DEFAULT 0,
  fantasy_points_ppr REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_season_stats_season ON season_stats(season);
CREATE INDEX IF NOT EXISTS idx_season_stats_player_id ON season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_season_stats_season_player ON season_stats(season, player_id);
CREATE INDEX IF NOT EXISTS idx_season_stats_position ON season_stats(position);
CREATE INDEX IF NOT EXISTS idx_season_stats_team ON season_stats(recent_team);
CREATE INDEX IF NOT EXISTS idx_season_stats_games ON season_stats(games);
CREATE INDEX IF NOT EXISTS idx_season_stats_display_name ON season_stats(player_display_name);

-- ============================================================
-- WEEKLY STATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT,
  player_name TEXT,
  player_display_name TEXT,
  position TEXT,
  position_group TEXT,
  headshot_url TEXT,
  season INTEGER,
  week INTEGER,
  season_type TEXT,
  team TEXT,
  opponent_team TEXT,
  completions INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  passing_yards INTEGER DEFAULT 0,
  passing_tds INTEGER DEFAULT 0,
  passing_interceptions INTEGER DEFAULT 0,
  sacks_suffered INTEGER DEFAULT 0,
  sack_yards_lost INTEGER DEFAULT 0,
  sack_fumbles INTEGER DEFAULT 0,
  sack_fumbles_lost INTEGER DEFAULT 0,
  passing_air_yards INTEGER DEFAULT 0,
  passing_yards_after_catch INTEGER DEFAULT 0,
  passing_first_downs INTEGER DEFAULT 0,
  passing_epa REAL DEFAULT 0,
  passing_cpoe REAL DEFAULT 0,
  passing_2pt_conversions INTEGER DEFAULT 0,
  pacr REAL DEFAULT 0,
  carries INTEGER DEFAULT 0,
  rushing_yards INTEGER DEFAULT 0,
  rushing_tds INTEGER DEFAULT 0,
  rushing_fumbles INTEGER DEFAULT 0,
  rushing_fumbles_lost INTEGER DEFAULT 0,
  rushing_first_downs INTEGER DEFAULT 0,
  rushing_epa REAL DEFAULT 0,
  rushing_2pt_conversions INTEGER DEFAULT 0,
  receptions INTEGER DEFAULT 0,
  targets INTEGER DEFAULT 0,
  receiving_yards INTEGER DEFAULT 0,
  receiving_tds INTEGER DEFAULT 0,
  receiving_fumbles INTEGER DEFAULT 0,
  receiving_fumbles_lost INTEGER DEFAULT 0,
  receiving_air_yards INTEGER DEFAULT 0,
  receiving_yards_after_catch INTEGER DEFAULT 0,
  receiving_first_downs INTEGER DEFAULT 0,
  receiving_epa REAL DEFAULT 0,
  receiving_2pt_conversions INTEGER DEFAULT 0,
  racr REAL DEFAULT 0,
  target_share REAL DEFAULT 0,
  air_yards_share REAL DEFAULT 0,
  wopr REAL DEFAULT 0,
  special_teams_tds INTEGER DEFAULT 0,
  def_tackles_solo INTEGER DEFAULT 0,
  def_tackles_with_assist INTEGER DEFAULT 0,
  def_tackle_assists INTEGER DEFAULT 0,
  def_tackles_for_loss INTEGER DEFAULT 0,
  def_tackles_for_loss_yards INTEGER DEFAULT 0,
  def_fumbles_forced INTEGER DEFAULT 0,
  def_sacks INTEGER DEFAULT 0,
  def_sack_yards INTEGER DEFAULT 0,
  def_qb_hits INTEGER DEFAULT 0,
  def_interceptions INTEGER DEFAULT 0,
  def_interception_yards INTEGER DEFAULT 0,
  def_pass_defended INTEGER DEFAULT 0,
  def_tds INTEGER DEFAULT 0,
  def_fumbles INTEGER DEFAULT 0,
  def_safeties INTEGER DEFAULT 0,
  misc_yards INTEGER DEFAULT 0,
  fumble_recovery_own INTEGER DEFAULT 0,
  fumble_recovery_yards_own INTEGER DEFAULT 0,
  fumble_recovery_opp INTEGER DEFAULT 0,
  fumble_recovery_yards_opp INTEGER DEFAULT 0,
  fumble_recovery_tds INTEGER DEFAULT 0,
  penalties INTEGER DEFAULT 0,
  penalty_yards INTEGER DEFAULT 0,
  punt_returns INTEGER DEFAULT 0,
  punt_return_yards INTEGER DEFAULT 0,
  kickoff_returns INTEGER DEFAULT 0,
  kickoff_return_yards INTEGER DEFAULT 0,
  fg_made INTEGER DEFAULT 0,
  fg_att INTEGER DEFAULT 0,
  fg_missed INTEGER DEFAULT 0,
  fg_blocked INTEGER DEFAULT 0,
  fg_long INTEGER DEFAULT 0,
  fg_pct REAL DEFAULT 0,
  fg_made_0_19 INTEGER DEFAULT 0,
  fg_made_20_29 INTEGER DEFAULT 0,
  fg_made_30_39 INTEGER DEFAULT 0,
  fg_made_40_49 INTEGER DEFAULT 0,
  fg_made_50_59 INTEGER DEFAULT 0,
  fg_made_60_ INTEGER DEFAULT 0,
  fg_missed_0_19 INTEGER DEFAULT 0,
  fg_missed_20_29 INTEGER DEFAULT 0,
  fg_missed_30_39 INTEGER DEFAULT 0,
  fg_missed_40_49 INTEGER DEFAULT 0,
  fg_missed_50_59 INTEGER DEFAULT 0,
  fg_missed_60_ INTEGER DEFAULT 0,
  fg_made_list TEXT,
  fg_missed_list TEXT,
  fg_blocked_list TEXT,
  fg_made_distance INTEGER DEFAULT 0,
  fg_missed_distance INTEGER DEFAULT 0,
  fg_blocked_distance INTEGER DEFAULT 0,
  pat_made INTEGER DEFAULT 0,
  pat_att INTEGER DEFAULT 0,
  pat_missed INTEGER DEFAULT 0,
  pat_blocked INTEGER DEFAULT 0,
  pat_pct REAL DEFAULT 0,
  gwfg_made INTEGER DEFAULT 0,
  gwfg_att INTEGER DEFAULT 0,
  gwfg_missed INTEGER DEFAULT 0,
  gwfg_blocked INTEGER DEFAULT 0,
  gwfg_distance INTEGER DEFAULT 0,
  fantasy_points REAL DEFAULT 0,
  fantasy_points_ppr REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_weekly_stats_season ON weekly_stats(season);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON weekly_stats(week);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_player_id ON weekly_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_season_player ON weekly_stats(season, player_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_season_week ON weekly_stats(season, week);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_position ON weekly_stats(position);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_team ON weekly_stats(team);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_display_name ON weekly_stats(player_display_name);

-- ============================================================
-- SCHEDULE DATA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_data (
  game_id TEXT PRIMARY KEY,
  season INTEGER,
  game_type TEXT,
  week INTEGER,
  gameday TEXT,
  weekday TEXT,
  gametime TEXT,
  away_team TEXT,
  away_score INTEGER,
  home_team TEXT,
  home_score INTEGER,
  location TEXT,
  result INTEGER,
  total INTEGER,
  overtime INTEGER DEFAULT 0,
  old_game_id TEXT,
  gsis INTEGER,
  nfl_detail_id TEXT,
  pfr TEXT,
  pff INTEGER,
  espn INTEGER,
  ftn INTEGER,
  away_rest INTEGER,
  home_rest INTEGER,
  away_moneyline INTEGER,
  home_moneyline INTEGER,
  spread_line REAL,
  away_spread_odds INTEGER,
  home_spread_odds INTEGER,
  total_line REAL,
  under_odds INTEGER,
  over_odds INTEGER,
  div_game INTEGER DEFAULT 0,
  roof TEXT,
  surface TEXT,
  temp INTEGER,
  wind INTEGER,
  away_qb_id TEXT,
  home_qb_id TEXT,
  away_qb_name TEXT,
  home_qb_name TEXT,
  away_coach TEXT,
  home_coach TEXT,
  referee TEXT,
  stadium_id TEXT,
  stadium TEXT
);

CREATE INDEX IF NOT EXISTS idx_schedule_season ON schedule_data(season);
CREATE INDEX IF NOT EXISTS idx_schedule_week ON schedule_data(week);
CREATE INDEX IF NOT EXISTS idx_schedule_season_week ON schedule_data(season, week);
CREATE INDEX IF NOT EXISTS idx_schedule_game_type ON schedule_data(game_type);
CREATE INDEX IF NOT EXISTS idx_schedule_away_team ON schedule_data(away_team);
CREATE INDEX IF NOT EXISTS idx_schedule_home_team ON schedule_data(home_team);
CREATE INDEX IF NOT EXISTS idx_schedule_gameday ON schedule_data(gameday);

-- ============================================================
-- SLEEPER ADP TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sleeper_adp (
  id TEXT PRIMARY KEY,
  season INTEGER,
  player_id TEXT,
  player_name TEXT,
  position TEXT,
  team TEXT,
  headshot_url TEXT,
  adp_ppr REAL,
  adp_half_ppr REAL,
  adp_std REAL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sleeper_adp_season ON sleeper_adp(season);
CREATE INDEX IF NOT EXISTS idx_sleeper_adp_position ON sleeper_adp(position);

-- ============================================================
-- YAHOO ADP TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS yahoo_adp (
  id TEXT PRIMARY KEY,
  season INTEGER,
  player_id TEXT,
  player_name TEXT,
  position TEXT,
  team TEXT,
  headshot_url TEXT,
  yahoo_player_id INTEGER,
  adp REAL,
  adp_round REAL,
  percent_drafted REAL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_yahoo_adp_season ON yahoo_adp(season);
CREATE INDEX IF NOT EXISTS idx_yahoo_adp_position ON yahoo_adp(position);
