# Data Directory

This directory contains NFL player statistics data organized by type.

## Structure

```
data/
├── roster/    - Player roster information (height, weight, college, etc.)
├── season/    - Season-level statistics aggregated across all weeks
├── weekly/    - Week-by-week game statistics
├── schedule/  - NFL game schedule and results
└── itm-scouting.db - SQLite database file (generated)
```

## CSV Import

Place your CSV files in the appropriate subdirectories:

- `data/roster/*.csv` - Any CSV files with roster data
- `data/season/*.csv` - Any CSV files with season stats
- `data/weekly/*.csv` - Any CSV files with weekly stats
- `data/schedule/*.csv` - Any CSV files with schedule/game data

The import script automatically finds and imports ALL `.csv` files in each directory.

### Running Import

```bash
npm run import-data
```

This will read all CSV files and populate the SQLite database.

## CSV Format

All CSV files should use **snake_case** column headers matching the database schema.

**Required columns vary by type:**

### Roster
- `season`, `team`, `position`, `full_name`, `gsis_id`

### Season
- `player_id`, `player_name`, `player_display_name`, `position`, `position_group`, `season`, `season_type`, `recent_team`

### Weekly
- Same as season, plus: `week`, `team`, `opponent_team`

### Schedule
- `game_id`, `season`, `game_type`, `week`, `away_team`, `home_team`

All stat columns (yards, touchdowns, etc.) are optional and default to 0 if not provided.

## Database

The SQLite database (`itm-scouting.db`) is created automatically on first import or when the app starts.

To inspect the database:

```bash
sqlite3 data/itm-scouting.db
```

Example queries:

```sql
-- Count records
SELECT COUNT(*) FROM roster_data;
SELECT COUNT(*) FROM season_stats;
SELECT COUNT(*) FROM weekly_stats;
SELECT COUNT(*) FROM schedule_data;

-- View a sample player
SELECT * FROM season_stats WHERE player_display_name LIKE '%Mahomes%' LIMIT 1;

-- View games from a specific week
SELECT * FROM schedule_data WHERE season = 2024 AND week = 1;
```

## Updating Data

To update the database with new data:

1. Replace CSV files in the subdirectories
2. Run `npm run import-data` again
3. The script uses `INSERT OR REPLACE`, so duplicate records will be updated

## Gitignore

The following are ignored by git:
- `*.db` - Database files
- CSV files (to avoid committing large datasets)

Only the directory structure is version controlled.
