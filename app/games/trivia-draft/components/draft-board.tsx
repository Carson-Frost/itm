"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
/* select removed — season picker uses buttons */
/* popover removed — using inline dropdown */
import { PositionBadge } from "@/components/position-badge"
import { TeamLogo } from "@/components/team-logo"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SkipForward,
  ChevronRight,
  Undo2,
  Search,
  Trophy,
  Circle,
} from "lucide-react"
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

/* ────────────────────────────────────────────────────────────── */
/*  Helpers                                                       */
/* ────────────────────────────────────────────────────────────── */

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
    if (!filledSlotIds.has(slot.label)) return slot
  }
  return null
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
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
  availableSeasons: Array<{
    season: number
    fantasyPoints: number
    team: string
  }>
}

/* Position colors — bg for slot label, softer bg for row tint */
const posColors: Record<string, { label: string; row: string; text: string }> = {
  QB: { label: "bg-red-500/25 dark:bg-red-500/20", row: "bg-red-500/[.06] dark:bg-red-500/[.04]", text: "text-red-700 dark:text-red-300" },
  RB: { label: "bg-emerald-500/25 dark:bg-emerald-500/20", row: "bg-emerald-500/[.06] dark:bg-emerald-500/[.04]", text: "text-emerald-700 dark:text-emerald-300" },
  WR: { label: "bg-sky-500/25 dark:bg-sky-500/20", row: "bg-sky-500/[.06] dark:bg-sky-500/[.04]", text: "text-sky-700 dark:text-sky-300" },
  TE: { label: "bg-orange-500/25 dark:bg-orange-500/20", row: "bg-orange-500/[.06] dark:bg-orange-500/[.04]", text: "text-orange-700 dark:text-orange-300" },
  FLEX: { label: "bg-violet-500/25 dark:bg-violet-500/20", row: "bg-violet-500/[.06] dark:bg-violet-500/[.04]", text: "text-violet-700 dark:text-violet-300" },
  SUPERFLEX: { label: "bg-amber-500/25 dark:bg-amber-500/20", row: "bg-amber-500/[.06] dark:bg-amber-500/[.04]", text: "text-amber-700 dark:text-amber-300" },
}

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                     */
/* ────────────────────────────────────────────────────────────── */

export function DraftBoard({ session, onSessionUpdate }: DraftBoardProps) {
  const { settings } = session
  const currentCategoryId = session.categoryIds[session.currentDraftIndex]

  /* ── state ─────────────────────────────────────────────────── */

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

  const [showPoints, setShowPoints] = useState(true)
  const [categoryName, setCategoryName] = useState("")
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] =
    useState<SelectedPlayerData | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* close search dropdown on click outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /* ── reset on new draft ───────────────────────────────────── */

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
    setShowPoints(true)
    setCategoryName("")
    setSearch("")
    setSearchResults([])
    setSelectedPlayer(null)
    setSelectedSeason(null)
    setSearchOpen(false)

    async function fetchCatName() {
      try {
        const res = await fetch(`/api/games/trivia-categories/${catId}`)
        if (res.ok) {
          const data = await res.json()
          setCategoryName(data.name || "")
        }
      } catch {
        /* silent */
      }
    }
    fetchCatName()
  }, [session.currentDraftIndex, session.categoryIds])

  /* ── search debounce ──────────────────────────────────────── */

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

  /* ── derived ──────────────────────────────────────────────── */

  const usedPlayerSeasons = useMemo(() => {
    const set = new Set(session.usedPlayerSeasons)
    draftState.picks.forEach((p) => {
      if (p.nflPlayer.playerId !== "PASS")
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
  const isLastDraft =
    session.currentDraftIndex >= settings.numberOfDrafts - 1

  const boardData = useMemo(() => {
    return settings.players.map((player) => {
      const pp = draftState.picks.filter(
        (p) => p.draftPlayerId === player.id
      )
      return {
        player,
        picks: settings.lineupSlots.map(
          (slot) => pp.find((p) => p.slotLabel === slot.label) || null
        ),
        totalPoints: pp.reduce(
          (sum, p) => sum + (p.pointsAwarded ?? p.fantasyPointsPpr),
          0
        ),
      }
    })
  }, [settings.players, settings.lineupSlots, draftState.picks])

  const rankings = useMemo(() => {
    const sorted = boardData.map((d) => ({
      id: d.player.id,
      pts: d.totalPoints,
    }))
    sorted.sort((a, b) => b.pts - a.pts)
    const m: Record<string, number> = {}
    sorted.forEach((s, i) => {
      m[s.id] =
        i > 0 && s.pts === sorted[i - 1].pts ? m[sorted[i - 1].id] : i + 1
    })
    return m
  }, [boardData])

  const groupedSearchResults = useMemo(() => {
    const grouped = new Map<string, SearchResult[]>()
    searchResults.forEach((r) => {
      if (!grouped.has(r.playerId)) grouped.set(r.playerId, [])
      grouped.get(r.playerId)!.push(r)
    })
    return Array.from(grouped.values()).map((results) => {
      const first = results[0]
      const sorted = results.sort((a, b) => b.season - a.season)
      const avail = sorted.filter(
        (r) => !usedPlayerSeasons.has(`${r.playerId}-${r.season}`)
      )
      return {
        ...first,
        allSeasons: sorted,
        availableSeasons: avail,
        hasAvailable: avail.length > 0,
      }
    })
  }, [searchResults, usedPlayerSeasons])

  const validPositions = currentSlot
    ? SLOT_VALID_POSITIONS[currentSlot.position]
    : []
  const filteredResults = groupedSearchResults.filter((r) =>
    validPositions.includes(r.position)
  )

  const showScore = showPoints || draftState.phase === "complete"

  /* ── callbacks ────────────────────────────────────────────── */

  const handlePick = useCallback(
    (sr: SearchResult) => {
      if (!currentSlot) return
      const pick: DraftPick = {
        pickNumber: draftState.pickNumber + 1,
        round: currentRound,
        draftPlayerId: currentPlayer.id,
        nflPlayer: {
          playerId: sr.playerId,
          name: sr.name,
          position: sr.position,
          team: sr.team,
          season: sr.season,
          headshotUrl: sr.headshotUrl,
        },
        slotPosition: currentSlot.position,
        slotLabel: currentSlot.label,
        fantasyPointsPpr: sr.fantasyPoints,
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
      setSearchOpen(false)
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
        if (pick.nflPlayer.playerId === "PASS")
          return { ...pick, fitsCategory: false, pointsAwarded: 0 }
        const fits = validSet.has(
          `${pick.nflPlayer.playerId}-${pick.nflPlayer.season}`
        )
        let pointsAwarded: number
        if (fits) pointsAwarded = pick.fantasyPointsPpr
        else if (settings.invalidPickPenalty === "points")
          pointsAwarded = -session.penaltyPoints
        else if (settings.invalidPickPenalty === "skip") pointsAwarded = 0
        else pointsAwarded = pick.fantasyPointsPpr
        return { ...pick, fitsCategory: fits, pointsAwarded }
      })
      const scores: Record<string, number> = {}
      settings.players.forEach((p) => {
        scores[p.id] = scoredPicks
          .filter((pk) => pk.draftPlayerId === p.id)
          .reduce((sum, pk) => sum + (pk.pointsAwarded ?? 0), 0)
      })
      const maxScore = Math.max(...Object.values(scores))
      const winners = Object.entries(scores).filter(
        ([, s]) => s === maxScore
      )
      const draftResult: DraftResult = {
        draftNumber: session.currentDraftIndex + 1,
        categoryId: currentCategoryId,
        categoryName,
        picks: scoredPicks,
        scores,
        winner: winners.length === 1 ? winners[0][0] : null,
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
      onSessionUpdate({
        ...session,
        drafts: newDrafts,
        usedPlayerSeasons: [
          ...session.usedPlayerSeasons,
          ...scoredPicks
            .filter((p) => p.nflPlayer.playerId !== "PASS")
            .map(
              (p) => `${p.nflPlayer.playerId}-${p.nflPlayer.season}`
            ),
        ],
      })
    } catch {
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
    onSessionUpdate({ ...session, phase: "final-results" })
  }, [session, onSessionUpdate])

  const handleSelectPlayer = (playerData: SearchResult) => {
    const avail = playerData.allSeasons
      .filter(
        (r) => !usedPlayerSeasons.has(`${r.playerId}-${r.season}`)
      )
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
      availableSeasons: avail,
    })
    setSelectedSeason(avail[0]?.season || null)
  }

  const handleConfirmPick = () => {
    if (!selectedPlayer || selectedSeason === null) return
    const sd = selectedPlayer.availableSeasons.find(
      (s) => s.season === selectedSeason
    )
    handlePick({
      name: selectedPlayer.name,
      playerId: selectedPlayer.playerId,
      position: selectedPlayer.position,
      team: sd?.team || "",
      season: selectedSeason,
      headshotUrl: selectedPlayer.headshotUrl,
      fantasyPoints: sd?.fantasyPoints || 0,
    })
  }

  /* ── render ───────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* ═══════ HEADER ═══════ */}
      <div className="text-center pt-2 pb-1">
        <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
          {settings.numberOfDrafts > 1 && (
            <>
              Game {session.currentDraftIndex + 1}/
              {settings.numberOfDrafts} &middot;{" "}
            </>
          )}
          {draftState.phase === "drafting" &&
            !isDraftComplete &&
            `Round ${currentRound} \u00b7 Pick ${pickInRound + 1}`}
          {isDraftComplete &&
            draftState.phase === "drafting" &&
            "All Picks In"}
          {draftState.phase === "revealing" && "Revealing\u2026"}
          {draftState.phase === "complete" && "Results"}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold italic mt-1">
          {categoryName || (
            <Skeleton className="h-10 w-72 mx-auto" />
          )}
        </h2>
        {!isDraftComplete &&
          draftState.phase === "drafting" &&
          currentPlayer && (
            <p
              className="text-lg font-bold mt-1"
              style={{ color: currentPlayer.color }}
            >
              {currentPlayer.name}&apos;s Turn
            </p>
          )}
      </div>

      {/* ═══════ CONTROLS ═══════ */}
      {draftState.phase === "drafting" &&
        !isDraftComplete &&
        currentSlot &&
        currentPlayer && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Search */}
            <div ref={searchRef} className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search players..."
                autoComplete="off"
                className="pl-9 pr-9 h-10 text-sm"
              />
              {search && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  <XButton
                    size="xs"
                    variant="muted"
                    onClick={() => {
                      setSearch("")
                      setSearchOpen(false)
                      setSelectedPlayer(null)
                      inputRef.current?.focus()
                    }}
                  />
                </div>
              )}

              {/* Dropdown */}
              {searchOpen && (search.trim() || selectedPlayer) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
                  {selectedPlayer ? (
                    /* ── Season picker ── */
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-4">
                        {selectedPlayer.headshotUrl ? (
                          <img src={selectedPlayer.headshotUrl} alt="" className="size-14 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="size-14 rounded-full bg-muted/30 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{selectedPlayer.name}</span>
                            <PositionBadge position={selectedPlayer.position} size="compact" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedPlayer.availableSeasons.length} season{selectedPlayer.availableSeasons.length !== 1 ? "s" : ""} available
                          </p>
                        </div>
                      </div>
                      {/* Season buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPlayer.availableSeasons.map((s) => (
                          <button
                            key={s.season}
                            onClick={() => setSelectedSeason(s.season)}
                            className={cn(
                              "px-3 py-1.5 text-sm font-mono font-bold rounded-md transition-colors",
                              selectedSeason === s.season
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 hover:bg-muted/50 text-foreground"
                            )}
                          >
                            {s.season}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPlayer(null)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleConfirmPick}
                          disabled={selectedSeason === null}
                          className="btn-chamfer flex-1"
                        >
                          Confirm Pick
                        </Button>
                      </div>
                    </div>
                  ) : searchLoading ? (
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredResults.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No players found
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-auto">
                      {filteredResults.map((player) => (
                        <button
                          key={`${player.playerId}-group`}
                          disabled={!player.hasAvailable}
                          onClick={() => handleSelectPlayer(player)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 text-left disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-b border-border/10 last:border-b-0"
                        >
                          {player.headshotUrl ? (
                            <img src={player.headshotUrl} alt="" className="size-12 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="size-12 rounded-full bg-muted/20 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base truncate">{player.name}</span>
                              <PositionBadge position={player.position} size="compact" />
                            </div>
                            {player.availableSeasons.length < player.allSeasons.length && (
                              <span className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                                {player.availableSeasons.length}/{player.allSeasons.length} seasons
                              </span>
                            )}
                          </div>
                          {!player.hasAvailable && (
                            <span className="text-xs text-muted-foreground font-medium">Used</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handlePassTurn} className="gap-1.5 h-10">
              <SkipForward className="size-3.5" />
              Pass
            </Button>

            <Button variant="outline" size="sm" onClick={handleUndoPick} disabled={draftState.picks.length === 0} className="gap-1.5 h-10">
              <Undo2 className="size-3.5" />
              Undo
            </Button>
          </div>
        )}

      {/* ═══════ REVEAL / NEXT / FINISH ═══════ */}
      {isDraftComplete && draftState.phase === "drafting" && (
        <div className="flex justify-center">
          <Button onClick={handleReveal} className="btn-chamfer h-11 px-8 font-bold">
            Reveal Results
          </Button>
        </div>
      )}
      {draftState.phase === "revealing" && (
        <div className="flex justify-center py-4">
          <span className="text-sm text-muted-foreground animate-pulse">Revealing results&hellip;</span>
        </div>
      )}
      {draftState.phase === "complete" && (
        <div className="flex justify-center">
          {isLastDraft ? (
            <Button onClick={handleFinishGame} className="btn-chamfer h-11 px-8 font-bold">
              {settings.numberOfDrafts > 1 ? "Final Results" : "Results"}
            </Button>
          ) : (
            <Button onClick={handleNextDraft} className="btn-chamfer h-11 px-8 font-bold gap-1.5">
              Next Draft
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* ═══════ DRAFT BOARD ═══════ */}
      <div className="overflow-x-auto -mx-3 px-3 pb-4">
        {/* CSS Grid: pos-label column + one column per player */}
        <div
          className="min-w-fit"
          style={{
            display: "grid",
            gridTemplateColumns: `80px repeat(${settings.players.length}, minmax(280px, 1fr))`,
          }}
        >
          {/* ── Row 0: Header ── */}
          {/* Top-left corner — empty, no borders */}
          <div />

          {/* Player column headers */}
          {settings.players.map((player, playerIdx) => {
            const data = boardData[playerIdx]
            const score = data?.totalPoints ?? 0
            const rank = rankings[player.id] || playerIdx + 1
            const isActivePlayer =
              !isDraftComplete &&
              draftState.phase === "drafting" &&
              currentPlayerIndex === playerIdx

            return (
              <div
                key={player.id}
                className="border border-b-0 border-gray-500/20 overflow-hidden"
              >
                {/* Color accent bar */}
                <div className="h-1" style={{ backgroundColor: player.color }} />

                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  {/* Name + on the clock inline */}
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="text-2xl font-bold truncate">
                      {player.name}
                    </span>
                    {isActivePlayer && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Circle className="size-2 fill-primary text-primary animate-pulse" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">On the Clock</span>
                      </div>
                    )}
                  </div>

                  {showScore && (
                    <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 border border-gray-500/25 font-mono tabular-nums">
                      {rank === 1 && draftState.picks.length > 0 && (
                        <Trophy className="size-3.5 text-amber-500" />
                      )}
                      <span className="font-extrabold text-xl">{score.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">pts</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Slot Rows (inside border) ── */}
          {settings.lineupSlots.map((slot, slotIdx) => {
            const pc = posColors[slot.position] || posColors.FLEX
            const posLabel = slot.position === "SUPERFLEX" ? "SF" : slot.position

            return [
              /* Position label cell */
              <div
                key={`pos-${slot.id}`}
                className={cn(
                  "flex items-center justify-center",
                  pc.label,
                  "border-l border-t",
                  slotIdx > 0 ? "border-t-gray-500/20" : "",
                  "border-r border-r-gray-500/20",
                  slotIdx === settings.lineupSlots.length - 1 && "border-b"
                )}
              >
                <span className={cn("text-sm font-extrabold tracking-wider", pc.text)}>
                  {posLabel}
                </span>
              </div>,

              /* Player cells for this slot */
              ...settings.players.map((player, playerIdx) => {
                const data = boardData[playerIdx]
                const pick = data?.picks[slotIdx] || null
                const isOtc =
                  draftState.phase === "drafting" &&
                  !isDraftComplete &&
                  currentPlayerIndex === playerIdx &&
                  currentSlot?.label === slot.label &&
                  !pick

                return (
                  <div
                    key={`${slot.id}-${player.id}`}
                    className={cn(
                      "transition-colors border-t",
                      slotIdx > 0 ? "border-t-gray-500/20" : "",
                      playerIdx > 0 && "border-l border-l-gray-500/20",
                      playerIdx === settings.players.length - 1 && "border-r",
                      slotIdx === settings.lineupSlots.length - 1 && "border-b",
                      isOtc && "bg-primary/[.04] shadow-[inset_0_0_24px_-6px_var(--color-primary)]"
                    )}
                  >
                    {pick ? (
                      <SlotCard
                        pick={pick}
                        showPoints={showScore}
                        isRevealed={draftState.phase === "complete"}
                      />
                    ) : (
                      <EmptySlot isOtc={isOtc} />
                    )}
                  </div>
                )
              }),
            ]
          })}
        </div>
      </div>

      {/* ═══════ RESULTS SUMMARY ═══════ */}
      {draftState.phase === "complete" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="size-4 text-primary" />
            <h3 className="font-bold text-sm">
              Draft {session.currentDraftIndex + 1} Results
            </h3>
          </div>
          <div className="rounded-lg overflow-hidden bg-muted/10">
            {boardData
              .slice()
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map(({ player, totalPoints }, idx) => {
                const rank = rankings[player.id] || 1
                const dr = session.drafts[session.currentDraftIndex]
                const isWinner = dr?.winner === player.id
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3",
                      idx > 0 && "border-t border-border/10",
                      isWinner && "bg-primary/5"
                    )}
                  >
                    <span className="text-sm font-mono font-bold text-muted-foreground w-6 text-center">
                      {ordinal(rank)}
                    </span>
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-[4px]"
                      style={{ backgroundColor: player.color, color: "#000" }}
                    >
                      {player.name}
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono font-extrabold tabular-nums text-xl">
                      {totalPoints.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">pts</span>
                    {isWinner && <Trophy className="size-4 text-amber-500 shrink-0" />}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  SlotCard — a filled pick                                      */
/* ────────────────────────────────────────────────────────────── */

function SlotCard({
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
      <div className="flex items-center justify-center h-[76px]">
        <span className="text-xs text-muted-foreground/25 italic font-mono">— pass —</span>
      </div>
    )
  }

  const pts = pick.pointsAwarded ?? pick.fantasyPointsPpr

  return (
    <div className="flex items-center gap-3 px-3 py-2 h-[76px]">
      {/* Headshot */}
      {pick.nflPlayer.headshotUrl ? (
        <img src={pick.nflPlayer.headshotUrl} alt="" className="size-14 rounded-full object-cover shrink-0" />
      ) : (
        <div className="size-14 rounded-full bg-muted/10 shrink-0" />
      )}

      {/* Info block */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base truncate leading-tight">
          {pick.nflPlayer.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <PositionBadge position={pick.nflPlayer.position} size="compact" />
          <span className="font-mono font-bold text-lg tabular-nums text-foreground leading-none">
            {pick.nflPlayer.season}
          </span>
          {pick.nflPlayer.team && pick.nflPlayer.team !== "-" && (
            <TeamLogo team={pick.nflPlayer.team} className="size-8 shrink-0 mix-blend-multiply dark:mix-blend-screen" />
          )}
        </div>
      </div>

      {/* Points */}
      {showPoints && (
        <div
          className={cn(
            "px-4 py-2 border text-xl font-mono font-extrabold tabular-nums shrink-0 text-center min-w-[80px]",
            isRevealed && pick.fitsCategory !== undefined
              ? pick.fitsCategory
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8"
                : "border-destructive/40 text-destructive bg-destructive/8"
              : "border-gray-500/25 text-foreground"
          )}
        >
          {isRevealed && pick.fitsCategory !== undefined && (
            <span className="mr-0.5 text-sm">{pick.fitsCategory ? "\u2713" : "\u2717"}</span>
          )}
          {pts.toFixed(1)}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  EmptySlot                                                     */
/* ────────────────────────────────────────────────────────────── */

function EmptySlot({ isOtc }: { isOtc: boolean }) {
  return (
    <div className="flex items-center justify-center h-[76px]">
      {isOtc ? (
        <span className="text-sm font-semibold text-primary/60">Drafting...</span>
      ) : null}
    </div>
  )
}
