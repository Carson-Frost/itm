import { Timestamp } from 'firebase/firestore'

// Position types for fantasy football
export type FantasyPosition = 'QB' | 'RB' | 'WR' | 'TE'
export type ScoringFormat = 'PPR' | 'Half' | 'STD'
export type RankingType = 'redraft' | 'dynasty'
export type QBFormat = '1qb' | 'superflex' | '2qb'

// Team filter can be 'all', a conference, a division, or a team abbreviation
export type TeamFilter = string

// Player in a user's ranking list
export interface RankedPlayer {
  rank: number
  playerId: string // gsis_id
  sleeperId?: string
  name: string
  position: FantasyPosition
  team: string
  headshotUrl?: string
}

// User's custom ranking stored in Firestore
export interface UserRanking {
  id: string
  name: string
  type: RankingType
  positions: FantasyPosition[]

  // Filter fields (ranges are inclusive)
  draftClassRange: [number, number]  // [oldestYear, newestYear], e.g. [2015, 2025]
  ageRange: [number, number]         // [minAge, maxAge], e.g. [18, 40]
  teamFilter: TeamFilter             // 'all', 'AFC', 'NFC East', 'BUF', etc.

  // Settings
  scoring: ScoringFormat
  qbFormat: QBFormat
  tePremium: number  // 0, 0.5, or 1

  createdAt: Timestamp
  updatedAt: Timestamp
  players: RankedPlayer[]
}

// Sleeper ADP data stored in SQLite
export interface SleeperADP {
  id: string
  season: number
  player_id: string
  player_name: string
  position: string
  team: string
  headshot_url: string | null
  adp_ppr: number
  adp_half_ppr: number
  adp_std: number
  updated_at: string
}
