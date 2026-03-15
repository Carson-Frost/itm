"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
  CodenamesCard,
  LobbyPlayer,
  TurnEntry,
  CardAssignment,
} from "@/lib/types/codenames"
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

  // Guess alert state
  const [guessAlert, setGuessAlert] = useState<{
    cardName: string
    imageUrl: string | null
    result: CardAssignment
  } | null>(null)
  const isFirstRenderRef = useRef(true)
  const prevGuessCountRef = useRef(0)
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Detect new guesses and show alert
  useEffect(() => {
    const totalGuesses = gs.turnHistory.reduce((sum, t) => sum + t.guesses.length, 0)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      prevGuessCountRef.current = totalGuesses
      return
    }
    if (totalGuesses > prevGuessCountRef.current) {
      const lastTurn = gs.turnHistory[gs.turnHistory.length - 1]
      if (lastTurn?.guesses.length > 0) {
        const lastGuess = lastTurn.guesses[lastTurn.guesses.length - 1]
        const card = gs.cards.find((c) => c.id === lastGuess.cardId)
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
        setGuessAlert({
          cardName: lastGuess.cardName,
          imageUrl: card?.imageUrl ?? null,
          result: lastGuess.result,
        })
        alertTimeoutRef.current = setTimeout(() => setGuessAlert(null), 2200)
      }
    }
    prevGuessCountRef.current = totalGuesses
  }, [gs.turnHistory, gs.cards])

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

  const cardToConfirm = confirmGuess ? gs.cards.find((c) => c.id === confirmGuess) : null

  const canGiveClue = isDuet ? isMyTeamTurn && isCluePhase : isSpymaster && isMyTeamTurn && isCluePhase
  const canEndTurn = isGuessPhase && (isDuet ? !isMyTeamTurn : isMyTeamTurn && !isSpymaster)
  const canGuessCards = isGuessPhase && (isDuet ? !isMyTeamTurn : isMyTeamTurn && !isSpymaster)

  const getStatusText = () => {
    if (gs.winner) {
      if (isDuet) return gs.winReason === "all-found" ? "You Win!" : "Game Over"
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

  const getStatusColor = () => {
    if (gs.winner) {
      if (isDuet) return gs.winReason === "all-found" ? "text-emerald-400" : "text-zinc-400"
      return gs.winner === "red" ? "text-red-400" : "text-blue-400"
    }
    return gs.currentTeam === "red" ? "text-red-400" : "text-blue-400"
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] flex flex-col bg-background overflow-hidden">
      {/* ===== MAIN CONTENT — no top banner ===== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar */}
        <TeamPanel
          team="red"
          label={isDuet ? "Player A" : "Red Team"}
          players={redPlayers}
          found={isDuet ? (gs.duetGreenFound ?? 0) : gs.redFound}
          total={isDuet ? (gs.duetGreenTotal ?? 15) : gs.redTotal}
          isDuet={isDuet}
          playerId={playerId}
          duetTokens={isDuet ? gs.duetTokensRemaining : undefined}
          turnHistory={gs.turnHistory}
          cards={gs.cards}
        />

        {/* Center: status + grid */}
        <div className="flex-1 lg:flex-initial lg:w-[calc(100dvh-13rem)] flex flex-col min-w-0">
          <div className="flex-1 min-h-0" />
          {/* Status text + Leave button */}
          <div className="shrink-0 flex items-center justify-between px-2 sm:px-3 lg:px-4">
            <div className={cn("flex items-center gap-2.5", getStatusColor())}>
              {gs.winner && (gs.winReason === "assassin" || gs.winReason === "tokens-depleted"
                ? <Skull className="size-6 sm:size-7" />
                : <Trophy className="size-6 sm:size-7" />
              )}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-wide">
                {getStatusText()}
              </h2>
            </div>
            <button
              onClick={onLeave}
              className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-zinc-200/60 hover:bg-zinc-300/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/70 border border-zinc-400 dark:border-zinc-500/40 text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <LogOut className="size-3" />
              Leave
            </button>
          </div>
          <div className="flex-1 min-h-0" />

          {/* 5x5 grid */}
          <div className="shrink-0 flex items-center justify-center px-2 sm:px-3 lg:px-4">
            <div
              className="grid grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 w-full max-w-[min(100%,calc(100dvh-15rem))]"
              style={{ aspectRatio: "1" }}
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
                    if (!card.isRevealed && canGuessCards) setConfirmGuess(card.id)
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0" />
          {/* Clue strip — floating pill below board */}
          <div className="shrink-0 flex items-center justify-center gap-3 px-4">
            {gs.currentClue && !gs.winner && (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 dark:bg-zinc-900 p-1.5 sm:p-2">
                  <div className="rounded-full bg-zinc-200 dark:bg-zinc-700/60 px-7 sm:px-10 py-2 sm:py-2.5 text-center">
                    <span className="font-black text-lg sm:text-2xl lg:text-3xl font-mono tracking-[0.15em] uppercase text-zinc-900 dark:text-zinc-100">
                      {gs.currentClue.word}
                    </span>
                  </div>
                  <div className={cn(
                    "size-10 sm:size-12 shrink-0 rounded-full flex items-center justify-center font-mono font-black text-lg sm:text-2xl",
                    gs.currentClue.team === "red"
                      ? "bg-zinc-200 dark:bg-zinc-700/60 text-red-400"
                      : "bg-zinc-200 dark:bg-zinc-700/60 text-blue-400",
                  )}>
                    {gs.currentClue.number}
                  </div>
                </div>
                {canEndTurn && (
                  <Button variant="outline" className="gap-2 h-10 rounded-full text-sm font-bold" onClick={handleEndTurn}>
                    <SkipForward className="size-4" />
                    End Turn
                  </Button>
                )}
              </>
            )}

            {canGiveClue && !gs.winner && (
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 dark:bg-zinc-900 p-1.5 sm:p-2 w-full max-w-lg">
                <Input
                  value={clueWord}
                  onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ""))}
                  placeholder="One-word clue..."
                  autoComplete="off"
                  className="flex-1 h-9 sm:h-11 !rounded-full bg-zinc-200 dark:bg-zinc-700/60 border-0 text-base sm:text-lg font-mono uppercase tracking-wider text-center text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && clueWord.trim()) handleGiveClue()
                  }}
                />
                <div className="flex items-center shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700/60 overflow-hidden">
                  <button
                    className="size-8 sm:size-10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-base sm:text-lg transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30"
                    onClick={() => setClueNumber(Math.max(0, clueNumber - 1))}
                    disabled={clueNumber <= 0}
                  >
                    -
                  </button>
                  <span className="w-5 sm:w-6 text-center font-mono font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">{clueNumber}</span>
                  <button
                    className="size-8 sm:size-10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-base sm:text-lg transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600"
                    onClick={() => setClueNumber(Math.min(9, clueNumber + 1))}
                  >
                    +
                  </button>
                </div>
                <Button
                  onClick={handleGiveClue}
                  disabled={!clueWord.trim()}
                  size="icon"
                  className="size-9 sm:size-11 shrink-0 !rounded-full"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            )}

            {!gs.currentClue && !canGiveClue && !gs.winner && (
              <p className="text-sm text-muted-foreground py-1">
                {isDuet
                  ? isMyTeamTurn ? "Your turn to give a clue..." : "Waiting for partner's clue..."
                  : isSpymaster && !isMyTeamTurn ? "Waiting for other team..."
                  : !isSpymaster && isMyTeamTurn && isCluePhase ? "Waiting for spymaster..."
                  : !isMyTeamTurn ? "Waiting for other team..." : null}
              </p>
            )}

            {gs.winner && (
              <Button onClick={handlePlayAgain} className="btn-chamfer h-11 px-7 gap-2 text-base font-bold">
                <RotateCcw className="size-4" />
                Play Again
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0" />
        </div>

        {/* Right sidebar */}
        <TeamPanel
          team="blue"
          label={isDuet ? "Player B" : "Blue Team"}
          players={bluePlayers}
          found={isDuet ? (gs.duetGreenFound ?? 0) : gs.blueFound}
          total={isDuet ? (gs.duetGreenTotal ?? 15) : gs.blueTotal}
          isDuet={isDuet}
          playerId={playerId}
          duetTokens={isDuet ? gs.duetTokensRemaining : undefined}
          turnHistory={gs.turnHistory}
          cards={gs.cards}
        />
      </div>

      {/* Confirm dialog */}
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

      {/* Guess alert overlay */}
      {guessAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              "flex flex-col items-center gap-3 p-5 bg-background/95 backdrop-blur-sm border-[5px]",
              guessAlert.result === "red" ? "border-red-400"
                : guessAlert.result === "blue" ? "border-blue-400"
                : guessAlert.result === "green" ? "border-emerald-400"
                : guessAlert.result === "assassin" ? "border-zinc-700"
                : "border-zinc-600",
            )}
            style={{ animation: "guess-pop 2s ease-in-out forwards" }}
          >
            <div className={cn(
              "size-28 sm:size-32 relative overflow-hidden border-[3px]",
              guessAlert.result === "red" ? "border-red-400"
                : guessAlert.result === "blue" ? "border-blue-400"
                : guessAlert.result === "green" ? "border-emerald-400"
                : guessAlert.result === "assassin" ? "border-zinc-700"
                : "border-zinc-600",
            )}>
              {guessAlert.imageUrl ? (
                <img src={guessAlert.imageUrl} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                  <span className="text-4xl font-black text-muted-foreground/30">{guessAlert.cardName.charAt(0)}</span>
                </div>
              )}
            </div>
            <p className="text-xl font-bold uppercase tracking-wide">{guessAlert.cardName}</p>
            <p className={cn(
              "text-sm font-bold uppercase tracking-[0.2em]",
              guessAlert.result === "red" ? "text-red-400"
                : guessAlert.result === "blue" ? "text-blue-400"
                : guessAlert.result === "green" ? "text-emerald-400"
                : guessAlert.result === "assassin" ? "text-zinc-300"
                : "text-zinc-400",
            )}>
              {guessAlert.result === "red" ? "Red Agent"
                : guessAlert.result === "blue" ? "Blue Agent"
                : guessAlert.result === "green" ? "Green Agent"
                : guessAlert.result === "assassin" ? "Assassin!"
                : "Neutral"}
            </p>
          </div>
        </div>
      )}

      {/* Keyframe for guess alert animation */}
      <style>{`
        @keyframes guess-pop {
          0% { opacity: 0; transform: translateY(60px) scale(0.9); }
          12% { opacity: 1; transform: translateY(0) scale(1.03); }
          18% { transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(60px) scale(0.9); }
        }
      `}</style>
    </div>
  )
}

// ---- Team Sidebar Panel ----

function TeamPanel({
  team,
  label,
  players,
  found,
  total,
  isDuet,
  playerId,
  duetTokens,
  turnHistory,
  cards,
}: {
  team: "red" | "blue"
  label: string
  players: LobbyPlayer[]
  found: number
  total: number
  isDuet: boolean
  playerId: string
  duetTokens?: number
  turnHistory: TurnEntry[]
  cards: CodenamesCard[]
}) {
  const isRed = team === "red"
  const logEndRef = useRef<HTMLDivElement>(null)
  const remaining = total - found
  const pct = total > 0 ? (found / total) * 100 : 0
  const spymasters = players.filter((p) => p.role === "spymaster")
  const operatives = players.filter((p) => p.role === "operative")
  const teamTurns = turnHistory.filter((t) => t.team === team)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turnHistory.length])

  return (
    <div className={cn(
      "hidden lg:flex flex-col flex-1 @container",
      isRed ? "border-r border-border/20" : "border-l border-border/20",
    )}>
      {/* Team name + remaining count */}
      <div className="shrink-0 px-[5cqw] pt-[4cqw] pb-[4cqw]">
        <h2 className={cn(
          "font-black uppercase tracking-wide underline underline-offset-4 decoration-2",
          isRed ? "text-red-400 decoration-red-400/50" : "text-blue-400 decoration-blue-400/50",
        )} style={{ fontSize: "clamp(1.25rem, 7cqw, 2rem)", marginBottom: "clamp(0.75rem, 3cqw, 1.5rem)" }}>
          {label}
        </h2>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline" style={{ gap: "clamp(0.5rem, 2cqw, 0.75rem)" }}>
            <span className={cn(
              "font-black tabular-nums leading-none",
              isDuet ? "text-emerald-400" : isRed ? "text-red-400" : "text-blue-400",
            )} style={{ fontSize: "clamp(2.5rem, 14cqw, 5rem)" }}>
              {remaining}
            </span>
            <span className={cn(
              "font-bold uppercase tracking-wide",
              isDuet ? "text-emerald-400/60" : isRed ? "text-red-400/60" : "text-blue-400/60",
            )} style={{ fontSize: "clamp(0.875rem, 5cqw, 1.5rem)" }}>
              remaining
            </span>
          </div>
          <span className="font-bold tabular-nums text-muted-foreground" style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1rem)" }}>
            {found}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 border border-muted-foreground/25" style={{ marginTop: "clamp(0.25rem, 1cqw, 0.5rem)" }}>
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              isDuet ? "bg-emerald-500" : isRed ? "bg-red-400" : "bg-blue-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {isDuet && duetTokens !== undefined && (
          <div className="flex items-center" style={{ gap: "clamp(0.5rem, 2cqw, 0.75rem)", marginTop: "clamp(0.75rem, 3cqw, 1.25rem)" }}>
            <Coins className="text-amber-500" style={{ width: "clamp(1.25rem, 5cqw, 1.75rem)", height: "clamp(1.25rem, 5cqw, 1.75rem)" }} />
            <span className="font-bold text-amber-500 tabular-nums" style={{ fontSize: "clamp(1rem, 5cqw, 1.5rem)" }}>{duetTokens}</span>
            <span className="text-muted-foreground" style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1.125rem)" }}>tokens</span>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="shrink-0 pb-[3cqw] px-[5cqw]" style={{ display: "flex", flexDirection: "column", gap: "clamp(0.75rem, 3cqw, 1.25rem)" }}>
        {isDuet ? (
          <div>
            <p className="font-bold text-muted-foreground uppercase tracking-widest underline underline-offset-4 decoration-1 decoration-muted-foreground/50" style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1.125rem)", marginBottom: "clamp(0.375rem, 1.5cqw, 0.75rem)" }}>Players</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.125rem, 0.75cqw, 0.375rem)" }}>
              {players.map((p) => (
                <p
                  key={p.id}
                  className={cn(
                    p.id === playerId ? "text-foreground font-bold" : "text-foreground",
                  )}
                  style={{ fontSize: "clamp(1rem, 5cqw, 1.5rem)" }}
                >
                  {p.name}
                  {p.id === playerId && <span className="text-primary/50 ml-2" style={{ fontSize: "clamp(0.625rem, 3cqw, 0.875rem)" }}>you</span>}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className={cn(
                "font-bold uppercase tracking-widest underline underline-offset-4 decoration-1",
                isRed ? "text-red-400 decoration-red-400/50" : "text-blue-400 decoration-blue-400/50",
              )} style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1.125rem)", marginBottom: "clamp(0.375rem, 1.5cqw, 0.75rem)" }}>
                Spymaster
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.125rem, 0.75cqw, 0.375rem)" }}>
                {spymasters.length === 0 ? (
                  <p className="text-muted-foreground italic" style={{ fontSize: "clamp(0.875rem, 4.5cqw, 1.25rem)" }}>Empty</p>
                ) : spymasters.map((p) => (
                  <p
                    key={p.id}
                    className={cn(
                      p.id === playerId ? "text-foreground font-bold" : "text-foreground/60",
                    )}
                    style={{ fontSize: "clamp(1rem, 5cqw, 1.5rem)" }}
                  >
                    {p.name}
                    {p.id === playerId && <span className="text-primary/50 ml-2" style={{ fontSize: "clamp(0.625rem, 3cqw, 0.875rem)" }}>you</span>}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className={cn(
                "font-bold uppercase tracking-widest underline underline-offset-4 decoration-1",
                isRed ? "text-red-400 decoration-red-400/50" : "text-blue-400 decoration-blue-400/50",
              )} style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1.125rem)", marginBottom: "clamp(0.375rem, 1.5cqw, 0.75rem)" }}>
                Operatives
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.125rem, 0.75cqw, 0.375rem)" }}>
                {operatives.length === 0 ? (
                  <p className="text-muted-foreground italic" style={{ fontSize: "clamp(0.875rem, 4.5cqw, 1.25rem)" }}>Empty</p>
                ) : operatives.map((p) => (
                  <p
                    key={p.id}
                    className={cn(
                      p.id === playerId ? "text-foreground font-bold" : "text-foreground/60",
                    )}
                    style={{ fontSize: "clamp(1rem, 5cqw, 1.5rem)" }}
                  >
                    {p.name}
                    {p.id === playerId && <span className="text-primary/50 ml-2" style={{ fontSize: "clamp(0.625rem, 3cqw, 0.875rem)" }}>you</span>}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto min-h-0 border-t border-border/20">
        <div className="px-[5cqw] py-[3cqw]">
          <p className="font-bold text-muted-foreground uppercase tracking-widest underline underline-offset-4 decoration-1 decoration-muted-foreground/50" style={{ fontSize: "clamp(0.75rem, 3.5cqw, 1.125rem)", marginBottom: "clamp(0.5rem, 2cqw, 1rem)" }}>History</p>
          {teamTurns.length === 0 ? (
            <p className="text-muted-foreground" style={{ fontSize: "clamp(0.875rem, 4.5cqw, 1.25rem)" }}>No moves yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 4cqw, 1.75rem)" }}>
              {teamTurns.map((turn, i) => (
                <div key={i}>
                  {/* Turn number + clue word + clue number */}
                  <div className="flex items-baseline" style={{ gap: "clamp(0.5rem, 2cqw, 0.875rem)", marginBottom: "clamp(0.25rem, 1cqw, 0.5rem)" }}>
                    <span className="text-muted-foreground font-bold tabular-nums" style={{ fontSize: "clamp(0.875rem, 4cqw, 1.25rem)" }}>{i + 1}</span>
                    <span className="font-black font-mono uppercase tracking-wide text-foreground" style={{ fontSize: "clamp(1.125rem, 5.5cqw, 1.75rem)" }}>
                      {turn.clue.word}
                    </span>
                    <span className={cn(
                      "font-black tabular-nums",
                      isRed ? "text-red-400" : "text-blue-400",
                    )} style={{ fontSize: "clamp(1.125rem, 5.5cqw, 1.75rem)" }}>
                      {turn.clue.number}
                    </span>
                  </div>
                  {/* Guessed names listed line by line */}
                  {turn.guesses.length > 0 && (
                    <div style={{ marginLeft: "clamp(1.5rem, 6.5cqw, 2.5rem)", display: "flex", flexDirection: "column", gap: "clamp(0.0625rem, 0.5cqw, 0.25rem)" }}>
                      {turn.guesses.map((g, j) => (
                        <div key={j} className="flex items-center" style={{ gap: "clamp(0.375rem, 1.5cqw, 0.625rem)" }}>
                          <div className={cn(
                            "shrink-0",
                            g.result === "red" ? "bg-red-400"
                              : g.result === "blue" ? "bg-blue-400"
                              : g.result === "green" ? "bg-emerald-400"
                              : g.result === "assassin" ? "bg-zinc-400"
                              : "bg-zinc-600",
                          )} style={{ width: "clamp(0.375rem, 1.5cqw, 0.5rem)", height: "clamp(0.375rem, 1.5cqw, 0.5rem)" }} />
                          <span className={cn(
                            g.result === team || g.result === "green"
                              ? "text-foreground"
                              : g.result === "assassin"
                                ? "text-muted-foreground"
                                : "text-muted-foreground",
                          )} style={{ fontSize: "clamp(0.875rem, 4cqw, 1.25rem)" }}>
                            {g.cardName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
