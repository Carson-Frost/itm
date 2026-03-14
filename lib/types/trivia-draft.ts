// ---- Firestore document shape ----
export interface TriviaCategory {
  id: string
  name: string
  description: string
  status: "draft" | "published"
  validPlayers: TriviaCategoryPlayer[]
  filters?: TriviaCategoryFilter
  createdBy: { uid: string; email: string }
  updatedBy: { uid: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface TriviaCategoryPlayer {
  playerId: string
  name: string
  season: number
  position: string
  team: string
  headshotUrl?: string | null
  fantasyPointsPpr: number
}

export interface TriviaCategoryFilter {
  colleges?: string[]
  teams?: string[]
  positions?: string[]
  seasonRange?: [number, number]
  minGames?: number
  minFantasyPointsPpr?: number
  minPassingYards?: number
  minRushingYards?: number
  minReceivingYards?: number
  minPassingTds?: number
  minRushingTds?: number
  minReceivingTds?: number
}

// ---- Game settings ----
export interface TriviaDraftSettings {
  players: DraftPlayer[]
  numberOfDrafts: number
  lineupSlots: LineupSlot[]
  onePositionAtATime: boolean
  invalidPickPenalty: InvalidPickPenalty
  scoringFormat: "PPR" | "Half" | "STD"
}

export type InvalidPickPenalty = "points" | "none" | "skip"

export interface DraftPlayer {
  id: string
  name: string
  color: string
}

export interface LineupSlot {
  id: string
  position: SlotPosition
  label: string
}

export type SlotPosition = "QB" | "RB" | "WR" | "TE" | "FLEX" | "SUPERFLEX"

export const SLOT_VALID_POSITIONS: Record<SlotPosition, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  SUPERFLEX: ["QB", "RB", "WR", "TE"],
}

// ---- Draft state ----
export interface DraftState {
  draftNumber: number
  categoryId: string
  categoryName: string
  round: number
  pickNumber: number
  currentPlayerIndex: number
  picks: DraftPick[]
  phase: "drafting" | "revealing" | "complete"
  revealedPlayers?: TriviaCategoryPlayer[]
}

export interface DraftPick {
  pickNumber: number
  round: number
  draftPlayerId: string
  nflPlayer: {
    playerId: string
    name: string
    position: string
    team: string
    season: number
    headshotUrl?: string | null
  }
  slotPosition: SlotPosition
  slotLabel: string
  fantasyPointsPpr: number
  fitsCategory?: boolean
  pointsAwarded?: number
}

// ---- Multi-draft tracking ----
export interface GameSession {
  settings: TriviaDraftSettings
  drafts: DraftResult[]
  usedPlayerSeasons: string[]
  currentDraftIndex: number
  categoryIds: string[]
  phase: "setup" | "drafting" | "between-drafts" | "final-results"
  penaltyPoints: number
}

export interface DraftResult {
  draftNumber: number
  categoryId: string
  categoryName: string
  picks: DraftPick[]
  scores: Record<string, number>
  winner: string | null
}

// ---- Player colors for draft board ----
export const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // purple
] as const

// ---- Default lineup ----
export const DEFAULT_LINEUP_SLOTS: LineupSlot[] = [
  { id: "qb1", position: "QB", label: "QB1" },
  { id: "rb1", position: "RB", label: "RB1" },
  { id: "rb2", position: "RB", label: "RB2" },
  { id: "wr1", position: "WR", label: "WR1" },
  { id: "wr2", position: "WR", label: "WR2" },
  { id: "te1", position: "TE", label: "TE1" },
  { id: "flex1", position: "FLEX", label: "FLEX1" },
]

export const SUPERFLEX_SLOT: LineupSlot = {
  id: "sflex1",
  position: "SUPERFLEX",
  label: "SFLEX",
}
