"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { GameTile } from "./game-tile"
import { SolvedGroup } from "./solved-group"
import { GameHeader } from "./game-header"
import { GameResults } from "./game-results"
import { HowToPlayDialog } from "./how-to-play-dialog"
import { StatsDialog } from "./stats-dialog"
import { PuzzleCalendar } from "./puzzle-calendar"
import { Button } from "@/components/ui/button"
import { Shuffle, Undo2, Send } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type {
  ConnectionsPuzzle,
  ConnectionsCategory,
  ConnectionsPlayer,
} from "@/lib/types/connections"

const MAX_MISTAKES = 4
const STORAGE_KEY_PREFIX = "connections-game-"

interface GameState {
  solvedCategories: number[] // difficulties solved
  mistakes: number
  guessHistory: number[][] // each guess: difficulty of each player in the guess
  isComplete: boolean
  solved: boolean
  resetVersion?: number // tracks admin resets
}

interface TilePlayer extends ConnectionsPlayer {
  difficulty: number
  categoryName: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface GameBoardProps {
  puzzle: ConnectionsPuzzle
  currentDate: string
  onSelectDate: (date: string) => void
}

export function GameBoard({ puzzle, currentDate, onSelectDate }: GameBoardProps) {
  const { user } = useAuth()
  const storageKey = `${STORAGE_KEY_PREFIX}${puzzle.id}`

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Build flat tile list
  const allTiles: TilePlayer[] = useMemo(() => {
    return puzzle.categories.flatMap((cat) =>
      cat.players.map((p) => ({
        ...p,
        difficulty: cat.difficulty,
        categoryName: cat.name,
      }))
    )
  }, [puzzle])

  // Load saved state, checking resetVersion
  const loadState = useCallback((): GameState | null => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const state = JSON.parse(saved)
        // If admin has reset the puzzle, clear local state
        if (
          puzzle.resetVersion !== undefined &&
          (state.resetVersion ?? 0) !== puzzle.resetVersion
        ) {
          localStorage.removeItem(storageKey)
          return null
        }
        return state
      }
    } catch {}
    return null
  }, [storageKey, puzzle.resetVersion])

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadState()
    return (
      saved || {
        solvedCategories: [],
        mistakes: 0,
        guessHistory: [],
        isComplete: false,
        solved: false,
      }
    )
  })

  const [tiles, setTiles] = useState<TilePlayer[]>(() => {
    const saved = loadState()
    if (saved) {
      // Remove solved tiles
      const solvedSet = new Set(saved.solvedCategories)
      return shuffleArray(allTiles.filter((t) => !solvedSet.has(t.difficulty)))
    }
    // Use tileOrder if available, otherwise shuffle
    if (puzzle.tileOrder && puzzle.tileOrder.length === allTiles.length) {
      const tileMap = new Map(allTiles.map((t) => [t.playerId, t]))
      const ordered = puzzle.tileOrder
        .map((id) => tileMap.get(id))
        .filter((t): t is TilePlayer => !!t)
      return ordered.length === allTiles.length ? ordered : shuffleArray(allTiles)
    }
    return shuffleArray(allTiles)
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set())
  const [boardAlert, setBoardAlert] = useState<string | null>(null)
  const [pastGuesses, setPastGuesses] = useState<Set<string>>(new Set())

  // Track whether the game was completed during THIS session (not loaded from storage)
  const completedThisSession = useRef(false)
  const hasSavedResult = useRef(false)

  // Persist state with resetVersion
  useEffect(() => {
    const stateToSave = {
      ...gameState,
      resetVersion: puzzle.resetVersion ?? 0,
    }
    localStorage.setItem(storageKey, JSON.stringify(stateToSave))
  }, [gameState, storageKey, puzzle.resetVersion])

  // Save result to Firestore — only when completed during this session, and only once
  useEffect(() => {
    if (!gameState.isComplete || !user || !completedThisSession.current || hasSavedResult.current) return
    hasSavedResult.current = true

    const saveResult = async () => {
      try {
        const idToken = await user.getIdToken()
        await fetch("/api/connections/results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            date: puzzle.date,
            solved: gameState.solved,
            mistakes: gameState.mistakes,
            solveOrder: gameState.solvedCategories,
          }),
        })
      } catch {
        // silently fail
      }
    }

    saveResult()
  }, [gameState.isComplete, gameState.solved, gameState.mistakes, gameState.solvedCategories, puzzle.id, puzzle.date, user])

  const solvedCategories = useMemo(() => {
    return puzzle.categories
      .filter((cat) => gameState.solvedCategories.includes(cat.difficulty))
      .sort((a, b) => a.difficulty - b.difficulty)
  }, [puzzle.categories, gameState.solvedCategories])

  const handleTileClick = (playerId: string) => {
    if (gameState.isComplete) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < 4) {
        next.add(playerId)
      }
      return next
    })
  }

  const handleShuffle = () => {
    setTiles((prev) => shuffleArray(prev))
  }

  const handleDeselect = () => {
    setSelected(new Set())
  }

  const showBoardAlert = (message: string) => {
    setBoardAlert(message)
    setTimeout(() => setBoardAlert(null), 2000)
  }

  const handleSubmit = () => {
    if (selected.size !== 4) return

    // Check for duplicate guess
    const guessKey = [...selected].sort().join(",")
    if (pastGuesses.has(guessKey)) {
      showBoardAlert("Already guessed!")
      return
    }

    const selectedTiles = tiles.filter((t) => selected.has(t.playerId))
    const difficulties = selectedTiles.map((t) => t.difficulty)

    // Check if all 4 belong to the same category
    const isCorrect = new Set(difficulties).size === 1

    // Record the guess in history (difficulties of the guessed players)
    const guessRow = selectedTiles.map((t) => t.difficulty)

    // Track this guess
    setPastGuesses((prev) => new Set(prev).add(guessKey))

    if (isCorrect) {
      const solvedDifficulty = difficulties[0]

      setGameState((prev) => {
        const newSolvedCategories = [...prev.solvedCategories, solvedDifficulty]
        const allSolved = newSolvedCategories.length === 4
        if (allSolved) completedThisSession.current = true
        return {
          ...prev,
          solvedCategories: newSolvedCategories,
          guessHistory: [...prev.guessHistory, guessRow],
          isComplete: allSolved,
          solved: allSolved,
        }
      })

      // Remove solved tiles
      setTiles((prev) => prev.filter((t) => !selected.has(t.playerId)))
      setSelected(new Set())
    } else {
      // Check if 3 of 4 belong to the same category ("one away")
      const diffCounts = new Map<number, number>()
      for (const d of difficulties) {
        diffCounts.set(d, (diffCounts.get(d) || 0) + 1)
      }
      const isOneAway = Array.from(diffCounts.values()).some((count) => count === 3)

      // Shake incorrect tiles
      setShakingIds(new Set(selected))
      setTimeout(() => {
        setShakingIds(new Set())
        if (isOneAway) {
          showBoardAlert("One away...")
        }
      }, 500)

      setGameState((prev) => {
        const newMistakes = prev.mistakes + 1
        const isGameOver = newMistakes >= MAX_MISTAKES
        if (isGameOver) completedThisSession.current = true
        return {
          ...prev,
          mistakes: newMistakes,
          guessHistory: [...prev.guessHistory, guessRow],
          isComplete: isGameOver,
          solved: false,
        }
      })

      setSelected(new Set())
    }
  }

  // On game over (loss), auto-reveal remaining
  useEffect(() => {
    if (gameState.isComplete && !gameState.solved) {
      // Auto-solve remaining categories for display
      const remaining = puzzle.categories
        .filter((c) => !gameState.solvedCategories.includes(c.difficulty))
        .map((c) => c.difficulty)

      if (remaining.length > 0) {
        setGameState((prev) => ({
          ...prev,
          solvedCategories: [
            ...prev.solvedCategories,
            ...remaining,
          ],
        }))
        setTiles([])
      }
    }
  }, [gameState.isComplete, gameState.solved, gameState.solvedCategories, puzzle.categories])

  return (
    <div className="max-w-lg mx-auto">
      <GameHeader
        date={puzzle.date || new Date().toISOString().split("T")[0]}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      {/* Board area — relative for centered alerts */}
      <div className="relative">
        {/* Solved groups */}
        <div className="flex flex-col gap-1.5 mb-1.5">
          {solvedCategories.map((cat) => (
            <SolvedGroup key={cat.difficulty} category={cat} />
          ))}
        </div>

        {/* Unsolved tiles grid */}
        {tiles.length > 0 && (
          <div className="grid grid-cols-4 gap-1 mb-1">
            {tiles.map((tile) => (
              <GameTile
                key={tile.playerId}
                name={tile.name}
                headshotUrl={tile.headshotUrl}
                isSelected={selected.has(tile.playerId)}
                isShaking={shakingIds.has(tile.playerId)}
                disabled={gameState.isComplete}
                onClick={() => handleTileClick(tile.playerId)}
              />
            ))}
          </div>
        )}

        {/* Board alert — centered on board */}
        {boardAlert && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-md shadow-lg">
              {boardAlert}
            </div>
          </div>
        )}
      </div>

      {/* Mistakes remaining (below grid) */}
      {!gameState.isComplete && (
        <div className="flex items-center justify-center gap-2 mt-3 mb-4">
          <span className="text-xs text-muted-foreground">
            Mistakes remaining:
          </span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i < MAX_MISTAKES - gameState.mistakes
                    ? "bg-foreground"
                    : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {!gameState.isComplete && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleShuffle}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
          <Button
            variant="outline"
            onClick={handleDeselect}
            disabled={selected.size === 0}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Deselect
          </Button>
          <Button
            className="btn-chamfer"
            onClick={handleSubmit}
            disabled={selected.size !== 4}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      )}

      {/* Results */}
      {gameState.isComplete && (
        <GameResults
          solved={gameState.solved}
          mistakes={gameState.mistakes}
          solveOrder={gameState.solvedCategories}
          guessHistory={gameState.guessHistory}
          categories={puzzle.categories}
          date={puzzle.date || new Date().toISOString().split("T")[0]}
        />
      )}

      {/* Dialogs */}
      <HowToPlayDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <StatsDialog open={isStatsOpen} onOpenChange={setIsStatsOpen} />
      <PuzzleCalendar
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        currentDate={currentDate}
        onSelectDate={onSelectDate}
      />
    </div>
  )
}
