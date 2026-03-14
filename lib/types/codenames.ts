// ---- Card types on the board ----
export type CardAssignment = "red" | "blue" | "neutral" | "assassin" | "green"
export type GameMode = "classic" | "duet"
export type TeamColor = "red" | "blue"
export type PlayerRole = "spymaster" | "operative"
export type CardContentType = "player" | "team" | "college" | "coach"

// ---- Lobby settings ----
export interface CodenamesSettings {
  gameMode: GameMode
  includePlayers: boolean
  includeTeams: boolean
  includeCollegeTeams: boolean
  includeCoaches: boolean
  turnTimer: number | null // seconds, null = unlimited
}

export const DEFAULT_SETTINGS: CodenamesSettings = {
  gameMode: "classic",
  includePlayers: true,
  includeTeams: true,
  includeCollegeTeams: false,
  includeCoaches: false,
  turnTimer: null,
}

// ---- Lobby player ----
export interface LobbyPlayer {
  id: string
  name: string
  team: TeamColor
  role: PlayerRole
}

// ---- Card on the board ----
export interface CodenamesCard {
  id: string
  name: string
  imageUrl: string | null
  contentType: CardContentType
  subtitle: string | null // e.g. "QB - KC"
  assignment: CardAssignment
  isRevealed: boolean
  revealedBy: TeamColor | null
}

// ---- Clue ----
export interface CodenamesClue {
  word: string
  number: number
  team: TeamColor
  spymasterName: string
}

// ---- Turn history entry ----
export interface TurnEntry {
  team: TeamColor
  clue: CodenamesClue
  guesses: { cardId: string; cardName: string; result: CardAssignment }[]
}

// ---- Game state ----
export interface CodenamesGameState {
  cards: CodenamesCard[]
  currentTeam: TeamColor
  currentClue: CodenamesClue | null
  guessesRemaining: number
  redFound: number
  blueFound: number
  redTotal: number
  blueTotal: number
  winner: TeamColor | null
  winReason: "all-found" | "assassin" | "tokens-depleted" | null
  turnHistory: TurnEntry[]
  // Duet mode fields
  gameMode: GameMode
  duetTokensRemaining?: number
  duetGreenFound?: number
  duetGreenTotal?: number
  duetAssignmentsA?: CardAssignment[]
  duetAssignmentsB?: CardAssignment[]
}

// ---- Full lobby document ----
export interface CodenamesLobby {
  code: string
  hostId: string
  players: LobbyPlayer[]
  settings: CodenamesSettings
  gameState: CodenamesGameState | null
  status: "waiting" | "playing" | "finished"
  createdAt: string
  updatedAt: string
}

// ---- Admin-managed content ----
export interface CodenamesContentItem {
  id: string
  name: string
  imageUrl: string | null
  type: "college" | "coach"
  subtitle: string | null
  createdAt: string
}

// ---- Word pool item (used when building the board) ----
export interface WordPoolItem {
  name: string
  imageUrl: string | null
  contentType: CardContentType
  subtitle: string | null
}

// ---- Team colors ----
export const TEAM_COLORS = {
  red: {
    bg: "bg-red-600",
    bgMuted: "bg-red-600/15",
    bgRevealed: "bg-red-600/90",
    text: "text-red-600",
    textLight: "text-red-400",
    border: "border-red-600",
    borderMuted: "border-red-600/30",
    shadow: "shadow-[0_0_12px_rgba(220,38,38,0.4)]",
    hex: "#dc2626",
  },
  blue: {
    bg: "bg-blue-600",
    bgMuted: "bg-blue-600/15",
    bgRevealed: "bg-blue-600/90",
    text: "text-blue-600",
    textLight: "text-blue-400",
    border: "border-blue-600",
    borderMuted: "border-blue-600/30",
    shadow: "shadow-[0_0_12px_rgba(37,99,235,0.4)]",
    hex: "#2563eb",
  },
} as const
