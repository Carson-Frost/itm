export type Position = 'QB' | 'RB' | 'WR' | 'TE'

export interface Player {
  id: string
  playerId: string // Consistent player ID across seasons
  rank: number
  name: string
  position: Position
  team: string
  gamesPlayed: number
  headshotUrl?: string

  // Passing stats
  attempts?: number
  completions?: number
  passingYards?: number
  passingTDs?: number
  interceptions?: number

  // Rushing stats
  carries?: number
  rushingYards?: number
  rushingTDs?: number

  // Receiving stats
  targets?: number
  receptions?: number
  receivingYards?: number
  receivingTDs?: number

  // Advanced stats
  targetShare?: number
  airYardsShare?: number
  wopr?: number
  racr?: number
  receivingEpa?: number
  rushingEpa?: number
  passingEpa?: number
  passingCpoe?: number
  receivingYac?: number
  passingYac?: number
  receivingFirstDowns?: number
  rushingFirstDowns?: number
  passingFirstDowns?: number

  // Calculated
  fantasyPoints: number // STD scoring
  fantasyPointsPPR: number // PPR scoring
  pointsPerGame: number
}
