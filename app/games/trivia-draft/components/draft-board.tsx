"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PositionBadge } from "@/components/position-badge"
import { Eye, EyeOff, SkipForward, ChevronRight } from "lucide-react"
import { DraftPickDialog } from "./draft-pick-dialog"
import {
  type TriviaDraftSettings,
  type DraftPick,
  type DraftState,
  type GameSession,
  type DraftResult,
  type TriviaCategoryPlayer,
  type LineupSlot,
  SLOT_VALID_POSITIONS,
} from "@/lib/types/trivia-draft"
import { cn } from "@/lib/utils"

interface DraftBoardProps {
  session: GameSession
  onSessionUpdate: (session: GameSession) => void
}

function getSnakeOrder(playerCount: number, round: number): number[] {
  const order = Array.from({ length: playerCount }, (_, i) => i)
  return round % 2 === 0 ? order.reverse() : order
}

function getSlotForPick(
  settings: TriviaDraftSettings,
  pickNumber: number,
  playerIndex: number,
  existingPicks: DraftPick[]
): LineupSlot | null {
  const playerPicks = existingPicks.filter(
    (p) => p.draftPlayerId === settings.players[playerIndex].id
  )
  const filledSlotIds = new Set(playerPicks.map((p) => p.slotLabel))

  if (settings.onePositionAtATime) {
    // In this mode, all players fill the same slot position each round
    const round = Math.floor(pickNumber / settings.players.length)
    const slot = settings.lineupSlots[round]
    return slot || null
  }

  // Free pick mode: find the next unfilled slot
  for (const slot of settings.lineupSlots) {
    if (!filledSlotIds.has(slot.label)) {
      return slot
    }
  }
  return null
}

export function DraftBoard({ session, onSessionUpdate }: DraftBoardProps) {
  const { settings } = session
  const draft = session.drafts[session.currentDraftIndex] || null
  const currentCategoryId = session.categoryIds[session.currentDraftIndex]

  const [draftState, setDraftState] = useState<DraftState>(() => ({
    draftNumber: session.currentDraftIndex + 1,
    categoryId: currentCategoryId,
    categoryName: "",
    round: 1,
    pickNumber: 0,
    currentPlayerIndex: 0,
    picks: [],
    phase: "drafting",
  }))

  const [isPickDialogOpen, setIsPickDialogOpen] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [categoryName, setCategoryName] = useState("")

  // Fetch category name (just the name, not valid players)
  useEffect(() => {
    async function fetchCategoryName() {
      try {
        const res = await fetch("/api/games/trivia-categories")
        if (res.ok) {
          const data = await res.json()
          const cat = data.categories?.find(
            (c: { id: string }) => c.id === currentCategoryId
          )
          if (cat) setCategoryName(cat.name)
        }
      } catch {
        // silent
      }
    }
    fetchCategoryName()
  }, [currentCategoryId])

  // Fetch available seasons
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch("/api/fantasy/players/search?limit=1")
        if (res.ok) {
          const data = await res.json()
          setAvailableSeasons(data.availableSeasons || [])
        }
      } catch {
        setAvailableSeasons([2024, 2023, 2022, 2021, 2020])
      }
    }
    fetchSeasons()
  }, [])

  const usedPlayerSeasons = useMemo(() => {
    const set = new Set(session.usedPlayerSeasons)
    draftState.picks.forEach((p) => {
      set.add(`${p.nflPlayer.playerId}-${p.nflPlayer.season}`)
    })
    return set
  }, [session.usedPlayerSeasons, draftState.picks])

  const totalPicks = settings.lineupSlots.length * settings.players.length
  const currentRound =
    Math.floor(draftState.pickNumber / settings.players.length) + 1
  const snakeOrder = getSnakeOrder(settings.players.length, currentRound)
  const pickInRound = draftState.pickNumber % settings.players.length
  const currentPlayerIndex = snakeOrder[pickInRound]
  const currentPlayer = settings.players[currentPlayerIndex]

  const currentSlot = getSlotForPick(
    settings,
    draftState.pickNumber,
    currentPlayerIndex,
    draftState.picks
  )

  const isDraftComplete = draftState.pickNumber >= totalPicks

  // Build the board data: for each player, their picks organized by slot
  const boardData = useMemo(() => {
    return settings.players.map((player) => {
      const playerPicks = draftState.picks.filter(
        (p) => p.draftPlayerId === player.id
      )
      return {
        player,
        picks: settings.lineupSlots.map((slot) => {
          return playerPicks.find((p) => p.slotLabel === slot.label) || null
        }),
        totalPoints: playerPicks.reduce(
          (sum, p) => sum + (p.pointsAwarded ?? p.fantasyPointsPpr),
          0
        ),
      }
    })
  }, [settings.players, settings.lineupSlots, draftState.picks])

  const handlePick = useCallback(
    (searchResult: {
      name: string
      playerId: string
      position: string
      team: string
      season: number
      headshotUrl: string | null
      fantasyPoints: number
    }) => {
      if (!currentSlot) return

      const pick: DraftPick = {
        pickNumber: draftState.pickNumber + 1,
        round: currentRound,
        draftPlayerId: currentPlayer.id,
        nflPlayer: {
          playerId: searchResult.playerId,
          name: searchResult.name,
          position: searchResult.position,
          team: searchResult.team,
          season: searchResult.season,
          headshotUrl: searchResult.headshotUrl,
        },
        slotPosition: currentSlot.position,
        slotLabel: currentSlot.label,
        fantasyPointsPpr: searchResult.fantasyPoints,
      }

      setDraftState((prev) => ({
        ...prev,
        picks: [...prev.picks, pick],
        pickNumber: prev.pickNumber + 1,
      }))
      setIsPickDialogOpen(false)
    },
    [draftState.pickNumber, currentRound, currentPlayer, currentSlot]
  )

  const handlePassTurn = useCallback(() => {
    if (!currentSlot) return

    const pick: DraftPick = {
      pickNumber: draftState.pickNumber + 1,
      round: currentRound,
      draftPlayerId: currentPlayer.id,
      nflPlayer: {
        playerId: "PASS",
        name: "Pass",
        position: "-",
        team: "-",
        season: 0,
        headshotUrl: null,
      },
      slotPosition: currentSlot.position,
      slotLabel: currentSlot.label,
      fantasyPointsPpr: 0,
    }

    setDraftState((prev) => ({
      ...prev,
      picks: [...prev.picks, pick],
      pickNumber: prev.pickNumber + 1,
    }))
  }, [draftState.pickNumber, currentRound, currentPlayer, currentSlot])

  // Reveal results
  const handleReveal = useCallback(async () => {
    setDraftState((prev) => ({ ...prev, phase: "revealing" }))

    try {
      const res = await fetch(
        `/api/games/trivia-categories/${currentCategoryId}`
      )
      if (!res.ok) throw new Error("Failed to fetch category")
      const data = await res.json()
      const validPlayers: TriviaCategoryPlayer[] = data.validPlayers || []

      const validSet = new Set(
        validPlayers.map((vp) => `${vp.playerId}-${vp.season}`)
      )

      const scoredPicks = draftState.picks.map((pick) => {
        if (pick.nflPlayer.playerId === "PASS") {
          return { ...pick, fitsCategory: false, pointsAwarded: 0 }
        }

        const key = `${pick.nflPlayer.playerId}-${pick.nflPlayer.season}`
        const fits = validSet.has(key)

        let pointsAwarded: number
        if (fits) {
          pointsAwarded = pick.fantasyPointsPpr
        } else if (settings.invalidPickPenalty === "points") {
          pointsAwarded = -session.penaltyPoints
        } else if (settings.invalidPickPenalty === "skip") {
          pointsAwarded = 0
        } else {
          pointsAwarded = pick.fantasyPointsPpr
        }

        return { ...pick, fitsCategory: fits, pointsAwarded }
      })

      // Calculate scores per player
      const scores: Record<string, number> = {}
      settings.players.forEach((p) => {
        scores[p.id] = scoredPicks
          .filter((pick) => pick.draftPlayerId === p.id)
          .reduce((sum, pick) => sum + (pick.pointsAwarded ?? 0), 0)
      })

      const maxScore = Math.max(...Object.values(scores))
      const winners = Object.entries(scores).filter(
        ([, score]) => score === maxScore
      )
      const winner = winners.length === 1 ? winners[0][0] : null

      const draftResult: DraftResult = {
        draftNumber: session.currentDraftIndex + 1,
        categoryId: currentCategoryId,
        categoryName: categoryName,
        picks: scoredPicks,
        scores,
        winner,
      }

      setDraftState((prev) => ({
        ...prev,
        picks: scoredPicks,
        phase: "complete",
        revealedPlayers: validPlayers,
      }))

      // Update session
      const newDrafts = [...session.drafts]
      newDrafts[session.currentDraftIndex] = draftResult

      const newUsedPlayerSeasons = [
        ...session.usedPlayerSeasons,
        ...scoredPicks
          .filter((p) => p.nflPlayer.playerId !== "PASS")
          .map(
            (p) => `${p.nflPlayer.playerId}-${p.nflPlayer.season}`
          ),
      ]

      onSessionUpdate({
        ...session,
        drafts: newDrafts,
        usedPlayerSeasons: newUsedPlayerSeasons,
      })
    } catch {
      // If reveal fails, still mark as complete with unscored picks
      setDraftState((prev) => ({ ...prev, phase: "complete" }))
    }
  }, [
    currentCategoryId,
    categoryName,
    draftState.picks,
    settings,
    session,
    onSessionUpdate,
  ])

  const handleNextDraft = useCallback(() => {
    onSessionUpdate({
      ...session,
      currentDraftIndex: session.currentDraftIndex + 1,
      phase: "drafting",
    })
  }, [session, onSessionUpdate])

  const handleFinishGame = useCallback(() => {
    onSessionUpdate({
      ...session,
      phase: "final-results",
    })
  }, [session, onSessionUpdate])

  const isLastDraft =
    session.currentDraftIndex >= settings.numberOfDrafts - 1

  return (
    <div className="space-y-4">
      {/* Draft Header */}
      <div className="text-center space-y-2">
        {settings.numberOfDrafts > 1 && (
          <div className="text-sm font-mono text-muted-foreground">
            Draft {session.currentDraftIndex + 1} of {settings.numberOfDrafts}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-bold">{categoryName || "Loading..."}</h2>

        {!isDraftComplete && draftState.phase === "drafting" && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Round {currentRound} &middot; Pick{" "}
              {draftState.pickNumber + 1} of {totalPicks}
            </span>
            {currentSlot && settings.onePositionAtATime && (
              <span className="font-mono bg-muted px-2 py-0.5 text-xs">
                Drafting: {currentSlot.label}
              </span>
            )}
          </div>
        )}

        {/* Current player indicator */}
        {!isDraftComplete && draftState.phase === "drafting" && currentPlayer && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 border-2 text-sm font-bold"
            style={{ borderColor: currentPlayer.color }}
          >
            <div
              className="size-3"
              style={{ backgroundColor: currentPlayer.color }}
            />
            {currentPlayer.name}&apos;s Turn
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {draftState.phase === "drafting" && !isDraftComplete && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => setIsPickDialogOpen(true)}
            className="btn-chamfer h-10 px-6 font-bold"
          >
            Make Pick
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePassTurn}
          >
            <SkipForward className="size-3.5 mr-1" />
            Pass
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPoints(!showPoints)}
          >
            {showPoints ? (
              <EyeOff className="size-3.5 mr-1" />
            ) : (
              <Eye className="size-3.5 mr-1" />
            )}
            {showPoints ? "Hide" : "Show"} Points
          </Button>
        </div>
      )}

      {isDraftComplete && draftState.phase === "drafting" && (
        <div className="flex justify-center">
          <Button
            onClick={handleReveal}
            className="btn-chamfer h-10 px-6 font-bold"
          >
            Reveal Results
          </Button>
        </div>
      )}

      {draftState.phase === "complete" && (
        <div className="flex justify-center gap-2">
          {isLastDraft ? (
            <Button
              onClick={handleFinishGame}
              className="btn-chamfer h-10 px-6 font-bold"
            >
              Final Results
            </Button>
          ) : (
            <Button
              onClick={handleNextDraft}
              className="btn-chamfer h-10 px-6 font-bold"
            >
              Next Draft
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Draft Board Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-px bg-border min-w-fit"
          style={{
            gridTemplateColumns: `80px repeat(${settings.players.length}, minmax(140px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="bg-background p-2" />
          {settings.players.map((player, i) => {
            const playerScore = boardData[i]?.totalPoints ?? 0
            return (
              <div
                key={player.id}
                className="bg-background p-2 text-center border-b-2"
                style={{ borderBottomColor: player.color }}
              >
                <div
                  className="font-bold text-sm truncate"
                  style={{ color: player.color }}
                >
                  {player.name}
                </div>
                {(showPoints || draftState.phase === "complete") && (
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {playerScore.toFixed(1)} pts
                  </div>
                )}
              </div>
            )
          })}

          {/* Rows per lineup slot */}
          {settings.lineupSlots.map((slot, slotIndex) => (
            <>
              {/* Slot label */}
              <div
                key={`label-${slot.id}`}
                className="bg-muted/30 p-2 flex items-center justify-center"
              >
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {slot.label}
                </span>
              </div>

              {/* Player cells */}
              {settings.players.map((player, playerIdx) => {
                const pick = boardData[playerIdx]?.picks[slotIndex] || null
                const isCurrentPick =
                  draftState.phase === "drafting" &&
                  !isDraftComplete &&
                  currentPlayerIndex === playerIdx &&
                  !pick

                return (
                  <div
                    key={`${slot.id}-${player.id}`}
                    className={cn(
                      "bg-background p-1.5 min-h-[56px] transition-colors",
                      isCurrentPick && "bg-primary/5 ring-1 ring-primary/30 ring-inset"
                    )}
                  >
                    {pick ? (
                      <PickCell
                        pick={pick}
                        showPoints={showPoints || draftState.phase === "complete"}
                        isRevealed={draftState.phase === "complete"}
                      />
                    ) : (
                      isCurrentPick && (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs text-primary/50 font-medium animate-pulse">
                            On the clock
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* Results scoreboard */}
      {draftState.phase === "complete" && (
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-bold text-lg text-center">
            Draft {session.currentDraftIndex + 1} Results
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {boardData
              .slice()
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map(({ player, totalPoints }, rank) => {
                const draftResult =
                  session.drafts[session.currentDraftIndex]
                const isWinner = draftResult?.winner === player.id
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border",
                      isWinner && "border-primary bg-primary/5"
                    )}
                  >
                    <span className="text-lg font-mono font-bold text-muted-foreground">
                      #{rank + 1}
                    </span>
                    <div
                      className="size-3"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-bold">{player.name}</span>
                    <span className="font-mono font-bold text-lg">
                      {totalPoints.toFixed(1)}
                    </span>
                    {isWinner && (
                      <span className="text-xs font-bold text-primary">
                        WINNER
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Pick Dialog */}
      {currentSlot && currentPlayer && (
        <DraftPickDialog
          isOpen={isPickDialogOpen}
          onClose={() => setIsPickDialogOpen(false)}
          onPick={handlePick}
          slotPosition={currentSlot.position}
          slotLabel={currentSlot.label}
          playerName={currentPlayer.name}
          usedPlayerSeasons={usedPlayerSeasons}
          availableSeasons={availableSeasons}
        />
      )}
    </div>
  )
}

function PickCell({
  pick,
  showPoints,
  isRevealed,
}: {
  pick: DraftPick
  showPoints: boolean
  isRevealed: boolean
}) {
  if (pick.nflPlayer.playerId === "PASS") {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
        Pass
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {pick.nflPlayer.headshotUrl ? (
        <img
          src={pick.nflPlayer.headshotUrl}
          alt=""
          className="size-9 object-cover shrink-0"
        />
      ) : (
        <div className="size-9 bg-muted shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate leading-tight">
          {pick.nflPlayer.name}
        </div>
        <div className="flex items-center gap-1">
          <PositionBadge position={pick.nflPlayer.position} size="compact" />
          <span className="text-[10px] text-muted-foreground font-mono">
            {pick.nflPlayer.season}
          </span>
        </div>
        {showPoints && (
          <div
            className={cn(
              "text-[10px] font-mono font-bold mt-0.5",
              isRevealed &&
                pick.fitsCategory !== undefined &&
                (pick.fitsCategory
                  ? "text-emerald-500"
                  : "text-destructive")
            )}
          >
            {isRevealed && pick.fitsCategory !== undefined && (
              <span className="mr-0.5">
                {pick.fitsCategory ? "\u2713" : "\u2717"}
              </span>
            )}
            {(pick.pointsAwarded ?? pick.fantasyPointsPpr).toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}
