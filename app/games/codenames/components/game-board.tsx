"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Eye,
  EyeOff,
  Send,
  SkipForward,
  Trophy,
  Skull,
  RotateCcw,
} from "lucide-react"
import { GameCard } from "./game-card"
import type {
  CodenamesLobby,
  CodenamesGameState,
  CodenamesClue,
  LobbyPlayer,
  TeamColor,
} from "@/lib/types/codenames"
import { TEAM_COLORS } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

interface GameBoardProps {
  lobby: CodenamesLobby
  playerId: string
  onRefresh: () => void
}

export function GameBoard({ lobby, playerId, onRefresh }: GameBoardProps) {
  const gameState = lobby.gameState!
  const player = lobby.players.find((p) => p.id === playerId)
  const isSpymaster = player?.role === "spymaster"
  const isMyTeamTurn = player?.team === gameState.currentTeam
  const isCluePhase = !gameState.currentClue && !gameState.winner
  const isGuessPhase = !!gameState.currentClue && !gameState.winner

  // Clue input state
  const [clueWord, setClueWord] = useState("")
  const [clueNumber, setClueNumber] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmGuess, setConfirmGuess] = useState<string | null>(null)

  // Auto-poll for updates
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    pollRef.current = setInterval(() => {
      onRefresh()
    }, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [onRefresh])

  const handleGiveClue = useCallback(async () => {
    if (!clueWord.trim() || !isSpymaster || !isMyTeamTurn) return
    setIsSubmitting(true)
    try {
      const clue: CodenamesClue = {
        word: clueWord.trim().toUpperCase(),
        number: clueNumber,
        team: player!.team,
        spymasterName: player!.name,
      }
      const res = await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "give-clue", clue }),
      })
      if (!res.ok) throw new Error("Failed to give clue")
      setClueWord("")
      setClueNumber(1)
      onRefresh()
    } catch {
      toast.error("Failed to give clue")
    } finally {
      setIsSubmitting(false)
    }
  }, [clueWord, clueNumber, isSpymaster, isMyTeamTurn, player, lobby.code, onRefresh])

  const handleGuess = useCallback(async (cardId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "guess", cardId, playerId }),
      })
      if (!res.ok) throw new Error("Failed to guess")
      onRefresh()
    } catch {
      toast.error("Failed to submit guess")
    } finally {
      setIsSubmitting(false)
      setConfirmGuess(null)
    }
  }, [lobby.code, playerId, onRefresh])

  const handleEndTurn = useCallback(async () => {
    try {
      await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end-turn" }),
      })
      onRefresh()
    } catch {
      toast.error("Failed to end turn")
    }
  }, [lobby.code, onRefresh])

  const handlePlayAgain = useCallback(async () => {
    try {
      await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "play-again" }),
      })
      onRefresh()
    } catch {
      toast.error("Failed to restart")
    }
  }, [lobby.code, onRefresh])

  const currentTeamColors = TEAM_COLORS[gameState.currentTeam]
  const redPlayers = lobby.players.filter((p) => p.team === "red")
  const bluePlayers = lobby.players.filter((p) => p.team === "blue")

  const cardToConfirm = confirmGuess
    ? gameState.cards.find((c) => c.id === confirmGuess)
    : null

  return (
    <div className="flex flex-col gap-4">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-3 bg-red-500" />
            <span className="font-bold text-sm tabular-nums">
              {gameState.redFound}/{gameState.redTotal}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {redPlayers.map((p) => p.name).join(", ")}
            </span>
          </div>
        </div>

        {/* Turn indicator */}
        <div className={cn(
          "px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wider",
          gameState.winner
            ? TEAM_COLORS[gameState.winner].border + " " + TEAM_COLORS[gameState.winner].text
            : currentTeamColors.border + " " + currentTeamColors.text,
        )}>
          {gameState.winner ? (
            <span className="flex items-center gap-1.5">
              <Trophy className="size-3.5" />
              {gameState.winner === "red" ? "Red" : "Blue"} Wins
              {gameState.winReason === "assassin" && " (Assassin)"}
            </span>
          ) : isCluePhase ? (
            `${gameState.currentTeam === "red" ? "Red" : "Blue"} — Giving Clue`
          ) : (
            `${gameState.currentTeam === "red" ? "Red" : "Blue"} — Guessing (${gameState.guessesRemaining} left)`
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {bluePlayers.map((p) => p.name).join(", ")}
            </span>
            <span className="font-bold text-sm tabular-nums">
              {gameState.blueFound}/{gameState.blueTotal}
            </span>
            <div className="size-3 bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Current clue display */}
      {gameState.currentClue && !gameState.winner && (
        <div className={cn(
          "flex items-center justify-center gap-3 py-2 border-2",
          TEAM_COLORS[gameState.currentClue.team].border,
          TEAM_COLORS[gameState.currentClue.team].bgMuted,
        )}>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Clue:</span>
          <span className="font-bold text-lg tracking-wide font-mono">
            {gameState.currentClue.word}
          </span>
          <span className={cn(
            "text-lg font-bold font-mono",
            TEAM_COLORS[gameState.currentClue.team].text,
          )}>
            {gameState.currentClue.number}
          </span>
        </div>
      )}

      {/* Role indicator */}
      {player && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {isSpymaster ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <span className="font-medium">
              {player.name} — {player.team === "red" ? "Red" : "Blue"} {isSpymaster ? "Spymaster" : "Operative"}
            </span>
          </span>
          {isGuessPhase && isMyTeamTurn && !isSpymaster && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleEndTurn}
            >
              <SkipForward className="size-3" />
              End Turn
            </Button>
          )}
        </div>
      )}

      {/* 5x5 Card Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {gameState.cards.map((card) => (
          <GameCard
            key={card.id}
            card={card}
            isSpymaster={!!isSpymaster}
            isMyTurn={isMyTeamTurn}
            canGuess={isGuessPhase && !isSubmitting}
            onClick={() => setConfirmGuess(card.id)}
          />
        ))}
      </div>

      {/* Spymaster clue input */}
      {isSpymaster && isMyTeamTurn && isCluePhase && !gameState.winner && (
        <>
          <Separator />
          <div className="flex items-center gap-3 max-w-lg mx-auto w-full">
            <Input
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ""))}
              placeholder="One-word clue..."
              autoComplete="off"
              className="flex-1 h-11 font-mono uppercase tracking-wider text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clueWord.trim()) handleGiveClue()
              }}
            />
            <div className="flex items-center gap-1 border-3 border-border">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setClueNumber(Math.max(0, clueNumber - 1))}
                disabled={clueNumber <= 0}
              >
                -
              </Button>
              <span className="w-8 text-center font-mono font-bold text-lg">
                {clueNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setClueNumber(Math.min(9, clueNumber + 1))}
              >
                +
              </Button>
            </div>
            <Button
              onClick={handleGiveClue}
              disabled={!clueWord.trim() || isSubmitting}
              className="btn-chamfer h-11 px-6 gap-2"
            >
              <Send className="size-4" />
              Give Clue
            </Button>
          </div>
        </>
      )}

      {/* Waiting messages */}
      {isSpymaster && !isMyTeamTurn && !gameState.winner && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Waiting for the other team...
        </p>
      )}
      {!isSpymaster && isMyTeamTurn && isCluePhase && !gameState.winner && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Waiting for your spymaster to give a clue...
        </p>
      )}
      {!isMyTeamTurn && !isSpymaster && !gameState.winner && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Waiting for the other team...
        </p>
      )}

      {/* Game over */}
      {gameState.winner && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className={cn(
            "flex items-center gap-3 text-2xl font-bold",
            TEAM_COLORS[gameState.winner].text,
          )}>
            {gameState.winReason === "assassin" ? (
              <Skull className="size-7" />
            ) : (
              <Trophy className="size-7" />
            )}
            {gameState.winner === "red" ? "Red" : "Blue"} Team Wins!
          </div>
          {gameState.winReason === "assassin" && (
            <p className="text-sm text-muted-foreground">
              The {gameState.winner === "red" ? "blue" : "red"} team hit the assassin!
            </p>
          )}
          <Button onClick={handlePlayAgain} className="btn-chamfer h-11 px-8 gap-2">
            <RotateCcw className="size-4" />
            Play Again
          </Button>
        </div>
      )}

      {/* Confirm guess dialog */}
      <AlertDialog open={!!confirmGuess} onOpenChange={() => setConfirmGuess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Guess</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to select{" "}
              <span className="font-bold text-foreground">{cardToConfirm?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmGuess && handleGuess(confirmGuess)}
              disabled={isSubmitting}
              className="btn-chamfer"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
