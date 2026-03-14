"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Eye,
  Send,
  SkipForward,
  Trophy,
  Skull,
  RotateCcw,
  LogOut,
  Coins,
} from "lucide-react"
import { GameCard } from "./game-card"
import type {
  CodenamesLobby,
  CodenamesClue,
  LobbyPlayer,
} from "@/lib/types/codenames"
import { TEAM_COLORS } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

interface GameBoardProps {
  lobby: CodenamesLobby
  playerId: string
  send: (msg: object) => void
  onLeave: () => void
}

export function GameBoard({ lobby, playerId, send, onLeave }: GameBoardProps) {
  const gs = lobby.gameState!
  const isDuet = gs.gameMode === "duet"
  const player = lobby.players.find((p) => p.id === playerId)
  const isSpymaster = player?.role === "spymaster"
  const isMyTeamTurn = player?.team === gs.currentTeam
  const isCluePhase = !gs.currentClue && !gs.winner
  const isGuessPhase = !!gs.currentClue && !gs.winner

  const [clueWord, setClueWord] = useState("")
  const [clueNumber, setClueNumber] = useState(1)
  const [confirmGuess, setConfirmGuess] = useState<string | null>(null)

  const handleGiveClue = useCallback(() => {
    if (!clueWord.trim() || !player) return
    if (!isDuet && (!isSpymaster || !isMyTeamTurn)) return
    if (isDuet && !isMyTeamTurn) return
    const clue: CodenamesClue = {
      word: clueWord.trim().toUpperCase(),
      number: clueNumber,
      team: player.team,
      spymasterName: player.name,
    }
    send({ type: "give-clue", clue })
    setClueWord("")
    setClueNumber(1)
  }, [clueWord, clueNumber, isSpymaster, isMyTeamTurn, player, send, isDuet])

  const handleGuess = useCallback((cardId: string) => {
    send({ type: "guess", cardId, playerId })
    setConfirmGuess(null)
  }, [playerId, send])

  const handleEndTurn = useCallback(() => {
    send({ type: "end-turn" })
  }, [send])

  const handlePlayAgain = useCallback(() => {
    send({ type: "play-again" })
  }, [send])

  const redPlayers = lobby.players.filter((p) => p.team === "red")
  const bluePlayers = lobby.players.filter((p) => p.team === "blue")

  const cardToConfirm = confirmGuess
    ? gs.cards.find((c) => c.id === confirmGuess)
    : null

  // --- Determine what the bottom bar shows ---
  const canGiveClue = isDuet
    ? isMyTeamTurn && isCluePhase
    : isSpymaster && isMyTeamTurn && isCluePhase
  const canEndTurn = isGuessPhase && (isDuet ? !isMyTeamTurn : isMyTeamTurn && !isSpymaster)
  const canGuessCards = isGuessPhase && (isDuet ? !isMyTeamTurn : isMyTeamTurn && !isSpymaster)

  // Status text
  const getStatusText = () => {
    if (gs.winner) {
      if (isDuet) {
        return gs.winReason === "all-found" ? "You Win!" : "Game Over"
      }
      return `${gs.winner === "red" ? "Red" : "Blue"} Wins${gs.winReason === "assassin" ? " (Assassin)" : ""}`
    }
    if (isDuet) {
      const giverName = lobby.players.find((p) => p.team === gs.currentTeam)?.name ?? "?"
      if (isCluePhase) return `${giverName} — Giving Clue`
      return `Guessing (${gs.guessesRemaining} left)`
    }
    const teamLabel = gs.currentTeam === "red" ? "Red" : "Blue"
    if (isCluePhase) return `${teamLabel} — Giving Clue`
    return `${teamLabel} — Guessing (${gs.guessesRemaining} left)`
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* ===== STATUS BAR ===== */}
      <div className={cn(
        "flex items-center justify-between px-3 sm:px-4 py-2 border-b-2 shrink-0",
        gs.winner
          ? isDuet
            ? gs.winReason === "all-found" ? "border-emerald-500 bg-emerald-600/10" : "border-foreground bg-foreground/5"
            : TEAM_COLORS[gs.winner].border + " " + TEAM_COLORS[gs.winner].bgMuted
          : TEAM_COLORS[gs.currentTeam].border + " " + TEAM_COLORS[gs.currentTeam].bgMuted,
      )}>
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>

        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          {gs.winner ? (
            <span className="flex items-center gap-1.5">
              {gs.winReason === "assassin" || gs.winReason === "tokens-depleted" ? (
                <Skull className="size-4" />
              ) : (
                <Trophy className="size-4" />
              )}
              {getStatusText()}
            </span>
          ) : (
            getStatusText()
          )}
        </div>

        {/* Current clue display */}
        {gs.currentClue && !gs.winner ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:inline">Clue:</span>
            <span className="font-bold text-sm tracking-wide font-mono">
              {gs.currentClue.word}
            </span>
            <span className={cn(
              "font-bold font-mono text-sm",
              !isDuet && TEAM_COLORS[gs.currentClue.team].text,
              isDuet && "text-emerald-500",
            )}>
              {gs.currentClue.number}
            </span>
          </div>
        ) : (
          <div className="w-16" /> // spacer for alignment
        )}
      </div>

      {/* ===== MAIN CONTENT: sidebar | grid | sidebar ===== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar (Red / Player A) */}
        <TeamSidebar
          team="red"
          label={isDuet ? "Player A" : "Red"}
          players={redPlayers}
          found={isDuet ? (gs.duetGreenFound ?? 0) : gs.redFound}
          total={isDuet ? (gs.duetGreenTotal ?? 15) : gs.redTotal}
          isActive={gs.currentTeam === "red" && !gs.winner}
          isDuet={isDuet}
          playerId={playerId}
          duetTokens={isDuet ? gs.duetTokensRemaining : undefined}
        />

        {/* Center: Card grid */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-3 min-w-0">
          <div className="grid grid-cols-5 grid-rows-5 gap-1 sm:gap-1.5 w-full h-full max-h-full"
            style={{ aspectRatio: "1 / 1", maxWidth: "calc(100vh - 10rem)" }}
          >
            {gs.cards.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                isSpymaster={!!isSpymaster}
                isMyTurn={isMyTeamTurn}
                canGuess={canGuessCards}
                gameMode={gs.gameMode}
                onClick={() => {
                  if (!card.isRevealed && canGuessCards) {
                    setConfirmGuess(card.id)
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar (Blue / Player B) */}
        <TeamSidebar
          team="blue"
          label={isDuet ? "Player B" : "Blue"}
          players={bluePlayers}
          found={isDuet ? (gs.duetGreenFound ?? 0) : gs.blueFound}
          total={isDuet ? (gs.duetGreenTotal ?? 15) : gs.blueTotal}
          isActive={gs.currentTeam === "blue" && !gs.winner}
          isDuet={isDuet}
          playerId={playerId}
          duetTokens={isDuet ? gs.duetTokensRemaining : undefined}
        />
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="shrink-0 border-t border-border px-3 sm:px-4 py-2 flex items-center justify-center gap-3">
        {/* Spymaster clue input (or duet clue-giver) */}
        {canGiveClue && !gs.winner && (
          <div className="flex items-center gap-2 w-full max-w-lg">
            <Input
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ""))}
              placeholder="One-word clue..."
              autoComplete="off"
              className="flex-1 h-10 font-mono uppercase tracking-wider text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clueWord.trim()) handleGiveClue()
              }}
            />
            <div className="flex items-center gap-0.5 border-2 border-border">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setClueNumber(Math.max(0, clueNumber - 1))}
                disabled={clueNumber <= 0}
              >
                -
              </Button>
              <span className="w-6 text-center font-mono font-bold">{clueNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setClueNumber(Math.min(9, clueNumber + 1))}
              >
                +
              </Button>
            </div>
            <Button
              onClick={handleGiveClue}
              disabled={!clueWord.trim()}
              className="btn-chamfer h-10 px-4 gap-1.5"
            >
              <Send className="size-3.5" />
              Give Clue
            </Button>
          </div>
        )}

        {/* End turn button */}
        {canEndTurn && !gs.winner && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleEndTurn}
          >
            <SkipForward className="size-3.5" />
            End Turn
          </Button>
        )}

        {/* Waiting messages */}
        {!canGiveClue && !canEndTurn && !gs.winner && (
          <p className="text-xs text-muted-foreground py-1">
            {isDuet
              ? isMyTeamTurn
                ? "Give a clue for your partner..."
                : "Waiting for your partner's clue..."
              : isSpymaster && !isMyTeamTurn
                ? "Waiting for the other team..."
                : !isSpymaster && isMyTeamTurn && isCluePhase
                  ? "Waiting for your spymaster..."
                  : !isMyTeamTurn
                    ? "Waiting for the other team..."
                    : null}
          </p>
        )}

        {/* Game over controls */}
        {gs.winner && (
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 font-bold",
              isDuet
                ? gs.winReason === "all-found" ? "text-emerald-500" : "text-foreground"
                : TEAM_COLORS[gs.winner].text,
            )}>
              {gs.winReason === "assassin" || gs.winReason === "tokens-depleted" ? (
                <Skull className="size-5" />
              ) : (
                <Trophy className="size-5" />
              )}
              {isDuet
                ? gs.winReason === "all-found"
                  ? "All agents found!"
                  : gs.winReason === "tokens-depleted"
                    ? "Out of tokens!"
                    : "Hit an assassin!"
                : `${gs.winner === "red" ? "Red" : "Blue"} Team Wins!`
              }
            </div>
            <Button onClick={handlePlayAgain} className="btn-chamfer h-9 px-6 gap-1.5">
              <RotateCcw className="size-3.5" />
              Play Again
            </Button>
          </div>
        )}
      </div>

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

// ---- Team Sidebar ----

function TeamSidebar({
  team,
  label,
  players,
  found,
  total,
  isActive,
  isDuet,
  playerId,
  duetTokens,
}: {
  team: "red" | "blue"
  label: string
  players: LobbyPlayer[]
  found: number
  total: number
  isActive: boolean
  isDuet: boolean
  playerId: string
  duetTokens?: number
}) {
  const colors = TEAM_COLORS[team]
  const spymasters = players.filter((p) => p.role === "spymaster")
  const operatives = players.filter((p) => p.role === "operative")

  return (
    <div className={cn(
      "hidden lg:flex flex-col w-[170px] shrink-0 border-border overflow-y-auto",
      team === "red" ? "border-r" : "border-l",
      isActive ? colors.bgMuted : "bg-muted/5",
    )}>
      {/* Team header */}
      <div className={cn(
        "px-3 py-3 border-b border-border/50",
        isActive && colors.bg + " text-white",
        !isActive && "bg-transparent",
      )}>
        <p className={cn(
          "text-xs font-bold uppercase tracking-widest",
          !isActive && colors.text,
        )}>
          {label}
        </p>
      </div>

      {/* Score */}
      <div className="px-3 py-3 border-b border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
          {isDuet ? "Green Found" : "Found"}
        </p>
        <p className={cn("text-2xl font-bold tabular-nums", isDuet ? "text-emerald-500" : colors.text)}>
          {found}<span className="text-muted-foreground text-lg">/{total}</span>
        </p>
        {isDuet && duetTokens !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <Coins className="size-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {duetTokens} token{duetTokens !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Player list */}
      <div className="flex-1 px-3 py-3 space-y-3">
        {isDuet ? (
          // Duet: just list players
          <div className="space-y-1.5">
            {players.map((p) => (
              <PlayerName key={p.id} name={p.name} isMe={p.id === playerId} />
            ))}
          </div>
        ) : (
          // Classic: group by role
          <>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Eye className="size-3" /> Spymaster
              </p>
              <div className="space-y-1">
                {spymasters.map((p) => (
                  <PlayerName key={p.id} name={p.name} isMe={p.id === playerId} />
                ))}
                {spymasters.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 italic">—</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
                Operatives
              </p>
              <div className="space-y-1">
                {operatives.map((p) => (
                  <PlayerName key={p.id} name={p.name} isMe={p.id === playerId} />
                ))}
                {operatives.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 italic">—</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PlayerName({ name, isMe }: { name: string; isMe: boolean }) {
  return (
    <p className={cn(
      "text-xs truncate",
      isMe ? "text-primary font-bold" : "text-foreground/80",
    )}>
      {name}
      {isMe && <span className="text-[9px] text-primary/70 ml-1">(you)</span>}
    </p>
  )
}
