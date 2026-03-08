import { Player, Position } from '@/lib/types/player'
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
    playerId: stats.player_id,
    rank,
    name: stats.player_display_name,
    position,
    team: stats.recent_team,
    gamesPlayed: stats.games,
    headshotUrl: stats.headshot_url,
    fantasyPoints: stats.fantasy_points, // STD scoring
    fantasyPointsPPR: stats.fantasy_points_ppr, // PPR scoring
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
  player.interceptions = stats.passing_interceptions
  player.sacks = stats.sacks_suffered

  // Fumbles
  player.rushingFumbles = stats.rushing_fumbles
  player.receivingFumbles = stats.receiving_fumbles

  // Advanced stats
  player.targetShare = stats.target_share
  player.airYardsShare = stats.air_yards_share
  player.wopr = stats.wopr
  player.racr = stats.racr
  player.receivingEpa = stats.receiving_epa
  player.rushingEpa = stats.rushing_epa
  player.passingEpa = stats.passing_epa
  player.passingCpoe = stats.passing_cpoe
  player.receivingYac = stats.receiving_yards_after_catch
  player.passingYac = stats.passing_yards_after_catch
  player.receivingFirstDowns = stats.receiving_first_downs
  player.rushingFirstDowns = stats.rushing_first_downs
  player.passingFirstDowns = stats.passing_first_downs

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
