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
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ background: "radial-gradient(ellipse at 50% 40%, oklch(0.24 0.015 160 / 0.8), transparent 70%)" }}
        >
          {/* Status text + Leave button — above the board */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-1">
            <div className={cn("flex items-center gap-2.5", getStatusColor())}>
              {gs.winner && (gs.winReason === "assassin" || gs.winReason === "tokens-depleted"
                ? <Skull className="size-6 sm:size-7" />
                : <Trophy className="size-6 sm:size-7" />
              )}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-wide">
                {getStatusText()}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={onLeave} className="gap-2 shrink-0">
              <LogOut className="size-4" />
              Leave
            </Button>
          </div>

          {/* 5x5 grid */}
          <div className="flex-1 flex items-center justify-center p-3 sm:p-4 lg:p-6">
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

      {/* ===== BOTTOM BAR ===== */}
      <div className="shrink-0 border-t bg-card/50 backdrop-blur-sm">
        {/* Active clue — large, centered */}
        {gs.currentClue && !gs.winner && (
          <div className="flex items-center justify-center gap-4 px-4 pt-4 pb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium">Clue</span>
            <span className="font-bold text-2xl sm:text-3xl font-mono tracking-wider">{gs.currentClue.word}</span>
            <span className={cn(
              "font-bold font-mono text-xl sm:text-2xl size-9 sm:size-11 flex items-center justify-center text-white",
              gs.currentClue.team === "red" ? "bg-red-400" : "bg-blue-400",
            )}>
              {gs.currentClue.number}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 sm:px-6 py-3 flex items-center justify-center gap-3">
          {canGiveClue && !gs.winner && (
            <div className="flex items-center gap-2 w-full max-w-lg">
              <Input
                value={clueWord}
                onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ""))}
                placeholder="One-word clue..."
                autoComplete="off"
                className="flex-1 h-12 text-lg font-mono uppercase tracking-wider text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && clueWord.trim()) handleGiveClue()
                }}
              />
              <div className="flex items-center gap-0.5 bg-muted/30 px-1.5 py-1">
                <button
                  className="size-9 flex items-center justify-center hover:bg-muted/50 text-muted-foreground font-bold text-lg transition-colors"
                  onClick={() => setClueNumber(Math.max(0, clueNumber - 1))}
                  disabled={clueNumber <= 0}
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-bold text-lg">{clueNumber}</span>
                <button
                  className="size-9 flex items-center justify-center hover:bg-muted/50 text-muted-foreground font-bold text-lg transition-colors"
                  onClick={() => setClueNumber(Math.min(9, clueNumber + 1))}
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleGiveClue}
                disabled={!clueWord.trim()}
                className="btn-chamfer h-12 px-6 gap-2 text-base"
              >
                <Send className="size-4" />
                Give Clue
              </Button>
            </div>
          )}

          {canEndTurn && !gs.winner && (
            <Button variant="outline" className="gap-2 h-10 text-sm" onClick={handleEndTurn}>
              <SkipForward className="size-4" />
              End Turn
            </Button>
          )}

          {!canGiveClue && !canEndTurn && !gs.winner && (
            <p className="text-sm text-muted-foreground py-1">
              {isDuet
                ? isMyTeamTurn ? "Your turn to give a clue..." : "Waiting for partner's clue..."
                : isSpymaster && !isMyTeamTurn ? "Waiting for other team..."
                : !isSpymaster && isMyTeamTurn && isCluePhase ? "Waiting for spymaster..."
                : !isMyTeamTurn ? "Waiting for other team..." : null}
            </p>
          )}

          {gs.winner && (
            <div className="flex items-center gap-5">
              <div className={cn(
                "flex items-center gap-2.5 font-bold text-xl",
                isDuet
                  ? gs.winReason === "all-found" ? "text-emerald-400" : "text-foreground"
                  : gs.winner === "red" ? "text-red-400" : "text-blue-400",
              )}>
                {gs.winReason === "assassin" || gs.winReason === "tokens-depleted" ? <Skull className="size-6" /> : <Trophy className="size-6" />}
                {isDuet
                  ? gs.winReason === "all-found" ? "All found!" : gs.winReason === "tokens-depleted" ? "Out of tokens!" : "Assassin!"
                  : `${gs.winner === "red" ? "Red" : "Blue"} Wins!`
                }
              </div>
              <Button onClick={handlePlayAgain} className="btn-chamfer h-11 px-7 gap-2 text-base">
                <RotateCcw className="size-4" />
                Play Again
              </Button>
            </div>
          )}
        </div>
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
                : guessAlert.result === "assassin" ? "border-zinc-900"
                : "border-zinc-600",
            )}
            style={{ animation: "guess-pop 2s ease-in-out forwards" }}
          >
            <div className={cn(
              "size-28 sm:size-32 relative overflow-hidden border-[3px]",
              guessAlert.result === "red" ? "border-red-400"
                : guessAlert.result === "blue" ? "border-blue-400"
                : guessAlert.result === "green" ? "border-emerald-400"
                : guessAlert.result === "assassin" ? "border-zinc-900"
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
                : guessAlert.result === "assassin" ? "text-white"
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
  const pct = total > 0 ? (found / total) * 100 : 0
  const spymasters = players.filter((p) => p.role === "spymaster")
  const operatives = players.filter((p) => p.role === "operative")

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turnHistory.length])

  return (
    <div className={cn(
      "hidden lg:flex flex-col w-[260px] shrink-0",
      isRed ? "border-r border-border/20" : "border-l border-border/20",
    )}>
      {/* Score header */}
      <div className="shrink-0 p-5 pb-4">
        <p className={cn(
          "text-sm font-bold uppercase tracking-widest mb-4",
          isRed ? "text-red-400" : "text-blue-400",
        )}>
          {label}
        </p>

        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-5xl font-black tabular-nums leading-none",
            isDuet ? "text-emerald-400" : isRed ? "text-red-400" : "text-blue-400",
          )}>
            {found}
          </span>
          <span className="text-2xl text-muted-foreground/30 tabular-nums font-bold">/ {total}</span>
        </div>

        <div className="h-2 bg-muted/20 mt-4">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              isDuet ? "bg-emerald-500" : isRed ? "bg-red-400" : "bg-blue-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {isDuet && duetTokens !== undefined && (
          <div className="flex items-center gap-2 mt-4">
            <Coins className="size-5 text-amber-500" />
            <span className="text-lg font-bold text-amber-500 tabular-nums">{duetTokens}</span>
            <span className="text-sm text-muted-foreground/40">tokens</span>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="shrink-0 px-5 pb-4 space-y-5">
        {isDuet ? (
          <div>
            <p className="text-sm font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">Players</p>
            <div className="space-y-2">
              {players.map((p) => (
                <p
                  key={p.id}
                  className={cn(
                    "text-lg",
                    p.id === playerId ? "text-foreground font-bold" : "text-foreground/60",
                  )}
                >
                  {p.name}
                  {p.id === playerId && <span className="text-sm text-primary/50 ml-2">you</span>}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className={cn(
                "text-sm font-bold uppercase tracking-widest mb-3",
                isRed ? "text-red-400/50" : "text-blue-400/50",
              )}>
                Spymaster
              </p>
              <div className="space-y-2">
                {spymasters.length === 0 ? (
                  <p className="text-base text-muted-foreground/25 italic">Empty</p>
                ) : spymasters.map((p) => (
                  <p
                    key={p.id}
                    className={cn(
                      "text-lg",
                      p.id === playerId ? "text-foreground font-bold" : "text-foreground/60",
                    )}
                  >
                    {p.name}
                    {p.id === playerId && <span className="text-sm text-primary/50 ml-2">you</span>}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className={cn(
                "text-sm font-bold uppercase tracking-widest mb-3",
                isRed ? "text-red-400/50" : "text-blue-400/50",
              )}>
                Operatives
              </p>
              <div className="space-y-2">
                {operatives.length === 0 ? (
                  <p className="text-base text-muted-foreground/25 italic">Empty</p>
                ) : operatives.map((p) => (
                  <p
                    key={p.id}
                    className={cn(
                      "text-lg",
                      p.id === playerId ? "text-foreground font-bold" : "text-foreground/60",
                    )}
                  >
                    {p.name}
                    {p.id === playerId && <span className="text-sm text-primary/50 ml-2">you</span>}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Game log — turn numbers + thumbnail squares */}
      <div className="flex-1 overflow-y-auto min-h-0 border-t border-border/20">
        <div className="p-5">
          <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest mb-4">Game Log</p>
          {turnHistory.length === 0 ? (
            <p className="text-base text-muted-foreground/25">No moves yet</p>
          ) : (
            <div className="space-y-5">
              {turnHistory.map((turn, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground/30 font-bold tabular-nums">#{i + 1}</span>
                    <p className={cn(
                      "text-lg font-bold font-mono uppercase",
                      turn.team === "red" ? "text-red-400" : "text-blue-400",
                    )}>
                      {turn.clue.word}
                      <span className="text-muted-foreground/30 ml-2">{turn.clue.number}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {turn.guesses.map((g, j) => {
                      const card = cards.find((c) => c.id === g.cardId)
                      return (
                        <div
                          key={j}
                          className={cn(
                            "size-10 border-[3px] relative overflow-hidden",
                            g.result === "red" ? "border-red-400"
                              : g.result === "blue" ? "border-blue-400"
                              : g.result === "green" ? "border-emerald-400"
                              : g.result === "assassin" ? "border-zinc-900"
                              : "border-zinc-600/50",
                          )}
                        >
                          {card?.imageUrl ? (
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover object-top" />
                          ) : (
                            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-muted-foreground/40">
                                {g.cardName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
