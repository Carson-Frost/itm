"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PositionBadge } from "@/components/position-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, EyeOff, SkipForward, ChevronRight, Undo2, Search } from "lucide-react"
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
import { XButton } from "@/components/x-button"

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
    const round = Math.floor(pickNumber / settings.players.length)
    const slot = settings.lineupSlots[round]
    return slot || null
  }

  for (const slot of settings.lineupSlots) {
    if (!filledSlotIds.has(slot.label)) {
      return slot
    }
  }
  return null
}

interface SearchResult {
  name: string
  playerId: string
  position: string
  team: string
  season: number
  headshotUrl: string | null
  fantasyPoints: number
}

interface SelectedPlayerData {
  name: string
  playerId: string
  position: string
  headshotUrl: string | null
  availableSeasons: Array<{ season: number; fantasyPoints: number; team: string }>
}

export function DraftBoard({ session, onSessionUpdate }: DraftBoardProps) {
  const { settings } = session
  const currentCategoryId = session.categoryIds[session.currentDraftIndex]

  const [draftState, setDraftState] = useState<DraftState>({
    draftNumber: session.currentDraftIndex + 1,
    categoryId: currentCategoryId,
    categoryName: "",
    round: 1,
    pickNumber: 0,
    currentPlayerIndex: 0,
    picks: [],
    phase: "drafting",
  })

  const [showPoints, setShowPoints] = useState(false)
  const [categoryName, setCategoryName] = useState("")

  // Inline search state
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayerData | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [searchOpen, setSearchOpen] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Reset draft state when currentDraftIndex changes
  useEffect(() => {
    const catId = session.categoryIds[session.currentDraftIndex]
    setDraftState({
      draftNumber: session.currentDraftIndex + 1,
      categoryId: catId,
      categoryName: "",
      round: 1,
      pickNumber: 0,
      currentPlayerIndex: 0,
      picks: [],
      phase: "drafting",
    })
    setShowPoints(false)
    setCategoryName("")
    // Reset search state
    setSearch("")
    setSearchResults([])
    setSelectedPlayer(null)
    setSelectedSeason(null)
    setSearchOpen(true)

    // Fetch category name
    async function fetchCatName() {
      try {
        const res = await fetch(`/api/games/trivia-categories/${catId}`)
        if (res.ok) {
          const data = await res.json()
          setCategoryName(data.name || "")
        }
      } catch {
        // silent
      }
    }
    fetchCatName()
  }, [session.currentDraftIndex, session.categoryIds])

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!search.trim()) {
      setSearchResults([])
      setSearchLoading(false)
      setSelectedPlayer(null)
      setSelectedSeason(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/fantasy/players/search?search=${encodeURIComponent(search)}&limit=200&sortBy=fantasyPoints&includeAllSeasons=true`
        )
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.players || [])
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const usedPlayerSeasons = useMemo(() => {
    const set = new Set(session.usedPlayerSeasons)
    draftState.picks.forEach((p) => {
      if (p.nflPlayer.playerId !== "PASS") {
        set.add(`${p.nflPlayer.playerId}-${p.nflPlayer.season}`)
      }
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

  // Build board data
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

  // Group search results by player (collapse across seasons)
  const groupedSearchResults = useMemo(() => {
    const grouped = new Map<string, SearchResult[]>()
    searchResults.forEach((result) => {
      if (!grouped.has(result.playerId)) {
        grouped.set(result.playerId, [])
      }
      grouped.get(result.playerId)!.push(result)
    })
    return Array.from(grouped.values()).map((results) => {
      const first = results[0]
      const sorted = results.sort((a, b) => b.season - a.season)
      const availableSeasons = sorted.filter(
        (r) => !usedPlayerSeasons.has(`${r.playerId}-${r.season}`)
      )
      return {
        ...first,
        allSeasons: sorted,
        availableSeasons,
        hasAvailable: availableSeasons.length > 0,
      }
    })
  }, [searchResults, usedPlayerSeasons])

  const validPositions = currentSlot ? SLOT_VALID_POSITIONS[currentSlot.position] : []
  const filteredResults = groupedSearchResults.filter((r) =>
    validPositions.includes(r.position)
  )

  const handlePick = useCallback(
    (searchResult: SearchResult) => {
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
      setSearch("")
      setSearchResults([])
      setSelectedPlayer(null)
      setSelectedSeason(null)
      setSearchOpen(true)
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

  const handleUndoPick = useCallback(() => {
    if (draftState.picks.length === 0) return
    setDraftState((prev) => ({
      ...prev,
      picks: prev.picks.slice(0, -1),
      pickNumber: prev.pickNumber - 1,
    }))
  }, [draftState.picks.length])

  const handleReveal = useCallback(async () => {
    setDraftState((prev) => ({ ...prev, phase: "revealing" }))

    try {
      const res = await fetch(`/api/games/trivia-categories/${currentCategoryId}`)
      if (!res.ok) throw new Error("Failed to fetch category")
      const data = await res.json()
      const validPlayers: TriviaCategoryPlayer[] = data.validPlayers || []

      const validSet = new Set(validPlayers.map((vp) => `${vp.playerId}-${vp.season}`))

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

      const scores: Record<string, number> = {}
      settings.players.forEach((p) => {
        scores[p.id] = scoredPicks
          .filter((pick) => pick.draftPlayerId === p.id)
          .reduce((sum, pick) => sum + (pick.pointsAwarded ?? 0), 0)
      })

      const maxScore = Math.max(...Object.values(scores))
      const winners = Object.entries(scores).filter(([, score]) => score === maxScore)
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
      setShowPoints(true)

      const newDrafts = [...session.drafts]
      newDrafts[session.currentDraftIndex] = draftResult

      const newUsedPlayerSeasons = [
        ...session.usedPlayerSeasons,
        ...scoredPicks
          .filter((p) => p.nflPlayer.playerId !== "PASS")
          .map((p) => `${p.nflPlayer.playerId}-${p.nflPlayer.season}`),
      ]

      onSessionUpdate({
        ...session,
        drafts: newDrafts,
        usedPlayerSeasons: newUsedPlayerSeasons,
      })
    } catch {
      setDraftState((prev) => ({ ...prev, phase: "complete" }))
    }
  }, [currentCategoryId, categoryName, draftState.picks, settings, session, onSessionUpdate])

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

  const isLastDraft = session.currentDraftIndex >= settings.numberOfDrafts - 1

  const handleSelectPlayer = (playerData: SearchResult) => {
    const availableSeasons = playerData.allSeasons
      .filter((r) => !usedPlayerSeasons.has(`${r.playerId}-${r.season}`))
      .map((r) => ({
        season: r.season,
        fantasyPoints: r.fantasyPoints,
        team: r.team,
      }))

    setSelectedPlayer({
      name: playerData.name,
      playerId: playerData.playerId,
      position: playerData.position,
      headshotUrl: playerData.headshotUrl,
      availableSeasons,
    })
    setSelectedSeason(availableSeasons[0]?.season || null)
  }

  const handleConfirmPick = () => {
    if (!selectedPlayer || selectedSeason === null) return

    const seasonData = selectedPlayer.availableSeasons.find(
      (s) => s.season === selectedSeason
    )

    handlePick({
      name: selectedPlayer.name,
      playerId: selectedPlayer.playerId,
      position: selectedPlayer.position,
      team: seasonData?.team || "",
      season: selectedSeason,
      headshotUrl: selectedPlayer.headshotUrl,
      fantasyPoints: seasonData?.fantasyPoints || 0,
    })
  }

  return (
    <div className="space-y-4">
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
              Round {currentRound} · Pick {draftState.pickNumber + 1} of {totalPicks}
            </span>
            {currentSlot && settings.onePositionAtATime && (
              <span className="font-mono bg-muted px-2 py-0.5 text-xs">
                {currentSlot.label}
              </span>
            )}
          </div>
        )}

        {!isDraftComplete && draftState.phase === "drafting" && currentPlayer && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 border-2 text-sm font-bold"
            style={{ borderColor: currentPlayer.color }}
          >
            <div className="size-3" style={{ backgroundColor: currentPlayer.color }} />
            {currentPlayer.name}'s Turn
          </div>
        )}
      </div>

      {draftState.phase === "drafting" && !isDraftComplete && currentSlot && currentPlayer && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative w-full max-w-xs cursor-text">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={() => setSearchOpen(true)}
                  placeholder={`Search ${currentSlot.label}...`}
                  autoComplete="off"
                  className="pl-9 pr-8"
                />
                {search && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                    <XButton
                      size="xs"
                      variant="muted"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSearch("")
                      }}
                    />
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="w-[320px] p-0 bg-popover text-popover-foreground rounded-md border shadow-md max-h-[300px] overflow-auto">
                {selectedPlayer ? (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                      {selectedPlayer.headshotUrl ? (
                        <img src={selectedPlayer.headshotUrl} alt="" className="size-12 object-cover shrink-0" />
                      ) : (
                        <div className="size-12 bg-muted shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{selectedPlayer.name}</div>
                        <PositionBadge position={selectedPlayer.position} size="compact" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Select season:</span>
                      <Select value={selectedSeason?.toString() || ""} onValueChange={(v) => setSelectedSeason(parseInt(v))}>
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPlayer.availableSeasons.map((s) => (
                            <SelectItem key={s.season} value={s.season.toString()}>
                              {s.season} ({s.fantasyPoints.toFixed(1)} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSelectedPlayer(null)} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleConfirmPick} disabled={selectedSeason === null} className="btn-chamfer flex-1">
                        Confirm
                      </Button>
                    </div>
                  </div>
                ) : searchLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {search.trim() ? "No players found" : "Type a name to search"}
                  </div>
                ) : (
                  filteredResults.map((player) => (
                    <button
                      key={`${player.playerId}-group`}
                      disabled={!player.hasAvailable}
                      onClick={() => handleSelectPlayer(player)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 text-left disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {player.headshotUrl ? (
                        <img src={player.headshotUrl} alt="" className="h-9 w-9 object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{player.name}</div>
                        <div className="flex items-center gap-1.5">
                          <PositionBadge position={player.position} size="compact" />
                          <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
                          {player.availableSeasons.length < player.allSeasons.length && (
                            <span className="text-xs text-muted-foreground">
                              {player.availableSeasons.length}/{player.allSeasons.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {!player.hasAvailable && (
                        <span className="text-xs text-muted-foreground font-medium">Used</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handlePassTurn}>
            <SkipForward className="size-3.5 mr-1" />
            Pass
          </Button>
          <Button variant="outline" size="sm" onClick={handleUndoPick} disabled={draftState.picks.length === 0}>
            <Undo2 className="size-3.5 mr-1" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPoints(!showPoints)}>
            {showPoints ? <EyeOff className="size-3.5 mr-1" /> : <Eye className="size-3.5 mr-1" />}
            {showPoints ? "Hide" : "Show"} Points
          </Button>
        </div>
      )}

      {isDraftComplete && draftState.phase === "drafting" && (
        <div className="flex justify-center">
          <Button onClick={handleReveal} className="btn-chamfer h-10 px-6 font-bold">
            Reveal Results
          </Button>
        </div>
      )}

      {draftState.phase === "revealing" && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            Revealing results...
          </div>
        </div>
      )}

      {draftState.phase === "complete" && (
        <div className="flex justify-center gap-2">
          {isLastDraft ? (
            <Button onClick={handleFinishGame} className="btn-chamfer h-10 px-6 font-bold">
              {settings.numberOfDrafts > 1 ? "Final Results" : "Results"}
            </Button>
          ) : (
            <Button onClick={handleNextDraft} className="btn-chamfer h-10 px-6 font-bold">
              Next Draft
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto -mx-3 px-3">
        <div
          className="grid gap-px bg-border min-w-fit"
          style={{
            gridTemplateColumns: `80px repeat(${settings.players.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="bg-background p-2" />
          {settings.players.map((player, i) => {
            const playerScore = boardData[i]?.totalPoints ?? 0
            return (
              <div key={player.id} className="bg-background p-2 text-center border-b-2" style={{ borderBottomColor: player.color }}>
                <div className="font-bold text-sm truncate" style={{ color: player.color }}>
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

          {settings.lineupSlots.map((slot, slotIndex) => (
            <div key={`row-${slot.id}`} className="contents">
              <div className="bg-muted/30 p-2 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {slot.label}
                </span>
              </div>

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
            </div>
          ))}
        </div>
      </div>

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
                const draftResult = session.drafts[session.currentDraftIndex]
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
                    <div className="size-3" style={{ backgroundColor: player.color }} />
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
    </div>
  )
}

function PickCell({ pick, showPoints, isRevealed }: { pick: DraftPick; showPoints: boolean; isRevealed: boolean }) {
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
        <img src={pick.nflPlayer.headshotUrl} alt="" className="size-9 object-cover shrink-0" />
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
                (pick.fitsCategory ? "text-emerald-500" : "text-destructive")
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
