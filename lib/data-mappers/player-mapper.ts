import { Player, Position } from '@/lib/mock-fantasy-data'
import { SeasonStats } from '@/lib/types/mongodb-schemas'

// Maps MongoDB SeasonStats to UI Player interface
export function mapSeasonStatsToPlayer(
  stats: SeasonStats,
  rank: number
): Player {
  // Validate position is one of the expected types
  const validPositions: Position[] = ['QB', 'RB', 'WR', 'TE']
  const position = validPositions.includes(stats.position as Position)
    ? (stats.position as Position)
    : 'WR' // Default fallback

  const player: Player = {
    id: stats._id,
    rank,
    name: stats.player_display_name,
    position,
    team: stats.recent_team,
    gamesPlayed: stats.games,
    headshotUrl: stats.headshot_url,
    fantasyPoints: stats.fantasy_points_ppr, // Using PPR scoring
    pointsPerGame: stats.games > 0 ? stats.fantasy_points_ppr / stats.games : 0,
  }

  // Add all relevant stats for the player
  // Rushing stats
  player.carries = stats.carries
  player.rushingYards = stats.rushing_yards
  player.rushingTDs = stats.rushing_tds

  // Receiving stats
  player.targets = stats.targets
  player.receptions = stats.receptions
  player.receivingYards = stats.receiving_yards
  player.receivingTDs = stats.receiving_tds

  // Passing stats
  player.attempts = stats.attempts
  player.completions = stats.completions
  player.passingYards = stats.passing_yards
  player.passingTDs = stats.passing_tds

  return player
}

// Maps array of SeasonStats to Player array with calculated ranks
export function mapSeasonStatsArrayToPlayers(
  statsArray: SeasonStats[]
): Player[] {
  // Sort by fantasy points (PPR) descending to assign ranks
  const sortedStats = [...statsArray].sort(
    (a, b) => b.fantasy_points_ppr - a.fantasy_points_ppr
  )

  return sortedStats.map((stats, index) =>
    mapSeasonStatsToPlayer(stats, index + 1)
  )
}
