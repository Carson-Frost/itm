# SQLite Database Setup

This document explains how to set up the SQLite database for ITM Scouting.

## Overview

The application uses SQLite for:
- **Cost savings** - No database hosting fees
- **Simplicity** - Database is a single file on disk
- **Performance** - No network latency for read-heavy workloads
- **Deployment ease** - Database ships with your code

## Database Location

The SQLite database is stored at: `./data/itm-scouting.db`

You can customize this location using the `DATABASE_PATH` environment variable.

## Environment Variables

Update your `.env.local` file:

```bash
DATABASE_PATH=./data/itm-scouting.db  # Optional: defaults to this path
DB_READONLY=false                      # Set to true in production for safety
```

## Importing Data

### 1. Prepare Your CSV Files

Place your CSV files in the appropriate data subdirectories:
- `data/roster/` - roster data files (any .csv files)
- `data/season/` - season stats files (any .csv files)
- `data/weekly/` - weekly stats files (any .csv files)
- `data/schedule/` - schedule/game data files (any .csv files)

The import script will automatically find and import ALL CSV files in each directory.

See `data/README.md` for detailed format requirements.

### 2. Import the Data

```bash
npm run import-data
```

The script will:
- Find CSV files in each data subdirectory
- Parse and validate the data
- Insert records into SQLite using transactions
- Show progress and final counts

### 3. Verify the Import

After import, verify the data:

```bash
# Install sqlite3 CLI (optional)
brew install sqlite3  # macOS
# or
apt-get install sqlite3  # Linux

# Check record counts
sqlite3 data/itm-scouting.db "SELECT COUNT(*) FROM roster_data;"
sqlite3 data/itm-scouting.db "SELECT COUNT(*) FROM season_stats;"
sqlite3 data/itm-scouting.db "SELECT COUNT(*) FROM weekly_stats;"
sqlite3 data/itm-scouting.db "SELECT COUNT(*) FROM schedule_data;"
```

### 4. Test the Application

Start the dev server and test all fantasy data endpoints:

```bash
npm run dev
```

Visit:
- http://localhost:3000/fantasy/charts
- Test player searches, filters, and player cards

## Schema

The SQLite schema includes four tables:

### `roster_data`
Player roster information by season (height, weight, college, etc.)

### `season_stats`
Aggregated season statistics for players

### `weekly_stats`
Week-by-week statistics for players

### `schedule_data`
NFL game schedule and results (scores, betting lines, venue info, etc.)

All tables have proper indexes on:
- `season`, `week`, `player_id`
- `position`, `team`
- `player_display_name`

## Updating Data

To update your database with new data:

1. Export new CSV files from your data source
2. Place them in the appropriate data subdirectories
3. Run `npm run import-data` again
4. The script uses `INSERT OR REPLACE`, so it will update existing records

## Production Deployment

### Digital Ocean VPS

Since you're using Digital Ocean VPS:

1. Upload the SQLite database file to your server
2. Ensure the data directory has proper permissions
3. Set `DB_READONLY=true` in production environment
4. Database file persists on the VPS filesystem

### Backup Strategy

SQLite backups are simple:

```bash
# Backup
cp data/itm-scouting.db data/backups/itm-scouting-$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 data/itm-scouting.db ".backup data/backups/backup.db"
```

## Troubleshooting

### Database file doesn't exist

The database file is created automatically on first access. The schema is initialized from `lib/database/schema.sql`.

### Permission errors

Ensure the `data` directory is writable:

```bash
chmod 755 data
chmod 644 data/itm-scouting.db
```

### Import fails

Check that:
- CSV files are in the correct directories
- CSV files have proper headers (snake_case)
- The `data` directory exists

### Query performance

All common queries are indexed. If you notice slow queries:

```bash
sqlite3 data/itm-scouting.db
sqlite> ANALYZE;  # Update query planner statistics
```

## Additional Resources

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLite Performance Tips](https://www.sqlite.org/performance.html)
