// ============================================================
// Connections Game Types
// ============================================================

export interface ConnectionsPlayer {
  name: string
  playerId: string
  headshotUrl?: string | null
}

export interface ConnectionsCategory {
  name: string
  difficulty: 1 | 2 | 3 | 4
  players: ConnectionsPlayer[]
}

export interface ConnectionsPuzzle {
  id: string
  title: string
  categories: ConnectionsCategory[]
  status: "draft" | "published"
  tileOrder?: string[] // playerIds in display order for the 4x4 grid
  resetVersion?: number
  createdBy: { uid: string; email: string; username?: string }
  updatedBy: { uid: string; email: string; username?: string }
  createdAt: string
  updatedAt: string
  date?: string // set by API at runtime, not stored
}

export interface ConnectionsScheduleConfig {
  calendar: Record<string, string> // 'YYYY-MM-DD' -> puzzleId
  stack: string[] // puzzleId[]
  stackPointer: number
  fallbackPuzzleId: string | null
}

export interface ConnectionsResult {
  puzzleId: string
  date: string
  solved: boolean
  mistakes: number
  solveOrder: number[] // difficulty values in order solved
  completedAt: string
}

// NYT Connections difficulty colors
export const DIFFICULTY_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-yellow-400", text: "text-yellow-950", label: "Yellow" },
  2: { bg: "bg-green-500", text: "text-green-950", label: "Green" },
  3: { bg: "bg-blue-500", text: "text-white", label: "Blue" },
  4: { bg: "bg-purple-600", text: "text-white", label: "Purple" },
}
