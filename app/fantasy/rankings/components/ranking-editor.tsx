"use client"

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Search, Check, Loader2, Undo2, Redo2, Plus, X, ArrowUp, ArrowDown, List, LayoutGrid, LayoutList } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserRanking, RankedPlayer, TierSeparator, FantasyPosition, DisplayItem } from "@/lib/types/ranking-schemas"
import { mergeItems, splitItems, getItemId, groupByTiers, bucketsToData, TierBucket, generateTierColor, recalcDefaultNames, backfillTierColors } from "@/lib/tier-utils"
import { Player, Position } from "@/lib/types/player"
import { nflTeamsByName, nflDivisions, nflConferences, teamMatchesFilter, getTeamFilterLabel } from "@/lib/team-utils"
import { PlayerCard } from "@/app/fantasy/charts/components/player-card"
import { RankingHeader } from "./ranking-header"
import { SettingsDialog } from "./settings-dialog"
import { PlayerRow, PlayerRowOverlay } from "./player-row"
import { TierRow, TierRowOverlay } from "./tier-row"
import { RemoveTierDialog } from "./remove-tier-dialog"
import { RemovePlayerDialog } from "./remove-player-dialog"
import { AddPlayerDrawer } from "./add-player-drawer"
import { TierListView } from "./tier-list-view"
import { CardView, CardItemOverlay, CardTierOverlay } from "./card-view"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRelativeTime } from "@/hooks/use-relative-time"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { Kbd } from "@/components/ui/kbd"

interface RankingEditorProps {
  ranking: UserRanking
  saveStatus: "saved" | "saving" | "error"
  lastSavedAt: Date | null
  onSettingsSave: (updates: Partial<UserRanking>) => void
  onPlayersChange: (players: RankedPlayer[]) => void
  onTiersChange: (tiers: TierSeparator[], hueIndex?: number) => void
}

interface PlayerStatsMap {
  [playerId: string]: {
    gamesPlayed?: number
    fantasyPoints?: number
    pointsPerGame?: number
    // Passing
    attempts?: number
    completions?: number
    passingYards?: number
    passingTDs?: number
    interceptions?: number
    // Rushing
    carries?: number
    rushingYards?: number
    rushingTDs?: number
    // Receiving
    targets?: number
    receptions?: number
    receivingYards?: number
    receivingTDs?: number
    // Advanced
    targetShare?: number
    airYardsShare?: number
    wopr?: number
    racr?: number
    receivingEpa?: number
    rushingEpa?: number
    passingEpa?: number
    passingCpoe?: number
    receivingYac?: number
    passingYac?: number
    receivingFirstDowns?: number
    rushingFirstDowns?: number
    passingFirstDowns?: number
  }
}

interface RosterInfoMap {
  [playerId: string]: {
    height?: number
    weight?: number
    college?: string
    yearsExp?: number
    jerseyNumber?: number
  }
}

interface TeamOffenseStats {
  passYards: number
  rushYards: number
  totalTDs: number
}

interface TeamStatsMap {
  [team: string]: TeamOffenseStats
}

// Column definitions matching fantasy charts
// wideOnly columns are hidden below xl breakpoint
const rushingColumns = [
  { key: "carries", label: "ATT", wideOnly: true },
  { key: "rushingYards", label: "YD", wideOnly: false },
  { key: "rushingTDs", label: "TD", wideOnly: false },
]

const receivingColumns = [
  { key: "targets", label: "TAR", wideOnly: true },
  { key: "receptions", label: "REC", wideOnly: false },
  { key: "receivingYards", label: "YD", wideOnly: false },
  { key: "receivingTDs", label: "TD", wideOnly: false },
]

const passingColumns = [
  { key: "attempts", label: "ATT", wideOnly: true },
  { key: "completions", label: "CMP", wideOnly: false },
  { key: "passingYards", label: "YD", wideOnly: false },
  { key: "passingTDs", label: "TD", wideOnly: false },
]

function getColumnGroupOrder(position: FantasyPosition | "All") {
  switch (position) {
    case "QB":
      return [
        { key: "passing", label: "PASSING", columns: passingColumns },
        { key: "rushing", label: "RUSHING", columns: rushingColumns },
        { key: "receiving", label: "RECEIVING", columns: receivingColumns },
      ]
    case "RB":
      return [
        { key: "rushing", label: "RUSHING", columns: rushingColumns },
        { key: "receiving", label: "RECEIVING", columns: receivingColumns },
        { key: "passing", label: "PASSING", columns: passingColumns },
      ]
    case "WR":
    case "TE":
      return [
        { key: "receiving", label: "RECEIVING", columns: receivingColumns },
        { key: "rushing", label: "RUSHING", columns: rushingColumns },
        { key: "passing", label: "PASSING", columns: passingColumns },
      ]
    case "All":
    default:
      return [
        { key: "rushing", label: "RUSHING", columns: rushingColumns },
        { key: "receiving", label: "RECEIVING", columns: receivingColumns },
        { key: "passing", label: "PASSING", columns: passingColumns },
      ]
  }
}

const MAX_HISTORY = 50
const emptySet = new Set<string>()

function toPlayer(ranked: RankedPlayer): Player {
  return {
    id: ranked.playerId,
    playerId: ranked.playerId,
    rank: ranked.rank,
    name: ranked.name,
    position: ranked.position as Position,
    team: ranked.team,
    gamesPlayed: 0,
    fantasyPoints: 0,
    fantasyPointsPPR: 0,
    pointsPerGame: 0,
    headshotUrl: ranked.headshotUrl,
  }
}

export function RankingEditor({
  ranking,
  saveStatus,
  lastSavedAt,
  onSettingsSave,
  onPlayersChange,
  onTiersChange,
}: RankingEditorProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [latestSeason, setLatestSeason] = useState(2025)
  const [playerStats, setPlayerStats] = useState<PlayerStatsMap>({})
  const [rosterInfo, setRosterInfo] = useState<RosterInfoMap>({})
  const [teamStats, setTeamStats] = useState<TeamStatsMap>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPosition, setFilterPosition] = useState<FantasyPosition | "All">(
    ranking.positions.length === 1 ? ranking.positions[0] : "All"
  )
  const [filterTeam, setFilterTeam] = useState<string>("ALL")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [removeTierTarget, setRemoveTierTarget] = useState<TierSeparator | null>(null)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [removePlayerTarget, setRemovePlayerTarget] = useState<RankedPlayer | null>(null)
  const [isPlacingTier, setIsPlacingTier] = useState(false)
  const [view, setView] = useState<"row" | "tier" | "card">("row")
  const savedTimeLabel = useRelativeTime(lastSavedAt)

  // Undo/Redo history
  const [history, setHistory] = useState<RankedPlayer[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedo = useRef(false)
  const initialized = useRef(false)

  // Initialize history with current state
  useEffect(() => {
    if (!initialized.current && ranking.players) {
      setHistory([ranking.players])
      setHistoryIndex(0)
      initialized.current = true
    }
  }, [ranking.players])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const pushToHistory = useCallback((players: RankedPlayer[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(players)
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    isUndoRedo.current = true
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    onPlayersChange(history[newIndex])
  }, [canUndo, historyIndex, history, onPlayersChange])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    isUndoRedo.current = true
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    onPlayersChange(history[newIndex])
  }, [canRedo, historyIndex, history, onPlayersChange])

  // Fetch latest season and player stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/fantasy/season-stats")
        const data = await res.json()

        if (data.availableSeasons?.[0]) {
          setLatestSeason(data.availableSeasons[0])

          const statsRes = await fetch(`/api/fantasy/season-stats?season=${data.availableSeasons[0]}`)
          const statsData = await statsRes.json()

          const statsMap: PlayerStatsMap = {}
          for (const player of statsData.players as Player[]) {
            statsMap[player.playerId] = {
              gamesPlayed: player.gamesPlayed,
              fantasyPoints: player.fantasyPointsPPR,
              pointsPerGame: player.gamesPlayed > 0 ? player.fantasyPointsPPR / player.gamesPlayed : 0,
              // Passing
              attempts: player.attempts,
              completions: player.completions,
              passingYards: player.passingYards,
              passingTDs: player.passingTDs,
              interceptions: player.interceptions,
              // Rushing
              carries: player.carries,
              rushingYards: player.rushingYards,
              rushingTDs: player.rushingTDs,
              // Receiving
              targets: player.targets,
              receptions: player.receptions,
              receivingYards: player.receivingYards,
              receivingTDs: player.receivingTDs,
              // Advanced
              targetShare: player.targetShare,
              airYardsShare: player.airYardsShare,
              wopr: player.wopr,
              racr: player.racr,
              receivingEpa: player.receivingEpa,
              rushingEpa: player.rushingEpa,
              passingEpa: player.passingEpa,
              passingCpoe: player.passingCpoe,
              receivingYac: player.receivingYac,
              passingYac: player.passingYac,
              receivingFirstDowns: player.receivingFirstDowns,
              rushingFirstDowns: player.rushingFirstDowns,
              passingFirstDowns: player.passingFirstDowns,
            }
          }
          setPlayerStats(statsMap)

          // Compute team offense totals
          const teamMap: TeamStatsMap = {}
          for (const player of statsData.players as Player[]) {
            if (!player.team) continue
            if (!teamMap[player.team]) {
              teamMap[player.team] = { passYards: 0, rushYards: 0, totalTDs: 0 }
            }
            const t = teamMap[player.team]
            t.passYards += player.passingYards ?? 0
            t.rushYards += player.rushingYards ?? 0
            t.totalTDs += (player.passingTDs ?? 0) + (player.rushingTDs ?? 0) + (player.receivingTDs ?? 0)
          }
          setTeamStats(teamMap)

          // Fetch bulk roster data
          try {
            const rosterRes = await fetch(`/api/fantasy/roster-data?season=${data.availableSeasons[0]}`)
            const rosterData = await rosterRes.json()
            if (Array.isArray(rosterData.rosterData)) {
              const rosterMap: RosterInfoMap = {}
              for (const r of rosterData.rosterData) {
                if (r.gsis_id) {
                  rosterMap[r.gsis_id] = {
                    height: r.height,
                    weight: r.weight,
                    college: r.college,
                    yearsExp: r.years_exp,
                    jerseyNumber: r.jersey_number,
                  }
                }
              }
              setRosterInfo(rosterMap)
            }
          } catch {
            // Roster data is supplementary, don't block on failure
          }
        }
      } catch {
        // Handle silently
      }
    }

    fetchStats()
   
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Tier list buckets for display
  const currentBuckets = useMemo(
    () => groupByTiers(ranking.players || [], ranking.tiers || []),
    [ranking.players, ranking.tiers]
  )

  const filteredPlayers = useMemo(() => {
    let players = ranking.players || []

    if (filterPosition !== "All") {
      players = players.filter((p) => p.position === filterPosition)
    }

    if (filterTeam !== "ALL") {
      players = players.filter((p) => teamMatchesFilter(p.team, filterTeam))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      players = players.filter((p) => p.name.toLowerCase().includes(query))
    }

    return players
  }, [ranking.players, filterPosition, filterTeam, searchQuery])

  const handlePlayersChangeWithHistory = useCallback(
    (players: RankedPlayer[]) => {
      if (isUndoRedo.current) {
        isUndoRedo.current = false
        return
      }
      pushToHistory(players)
      onPlayersChange(players)
    },
    [pushToHistory, onPlayersChange]
  )

  // Check if actual filtering is excluding players (not just filter controls being set)
  // This matters because single-position rankings initialize filterPosition to that position,
  // which would otherwise permanently hide tiers
  const hasFilters = filteredPlayers.length < (ranking.players?.length || 0)

  // Filtered view of buckets for tier list display. currentBuckets always
  // tracks ALL players (needed for drag data), but display only shows
  // players matching the active filters.
  const displayBuckets = useMemo(() => {
    if (!hasFilters) return currentBuckets
    const filteredIds = new Set(filteredPlayers.map(p => p.playerId))
    const filtered = currentBuckets.map(bucket => ({
      ...bucket,
      players: bucket.players.filter(p => filteredIds.has(p.playerId)),
    }))
    // Strip leading tiers that have no visible players
    const firstWithPlayers = filtered.findIndex(b => b.players.length > 0)
    if (firstWithPlayers > 0) return filtered.slice(firstWithPlayers)
    return filtered
  }, [currentBuckets, hasFilters, filteredPlayers])

  // Tier view reorder: called by TierListView's custom drag system
  const handleTierReorder = useCallback((finalBuckets: TierBucket[]) => {
    const { players, tiers } = bucketsToData(finalBuckets)
    handlePlayersChangeWithHistory(players)
    onTiersChange(recalcDefaultNames(tiers))
  }, [handlePlayersChangeWithHistory, onTiersChange])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      // Card view: uses same merged display list as row view (supports tiers)
      if (view === "card") {
        // Search/team filter → sparse results, hide tiers, operate on flat list
        if (searchQuery || filterTeam !== "ALL") {
          const allPlayers = ranking.players || []
          const oldIndex = allPlayers.findIndex((p) => p.playerId === active.id)
          const newIndex = allPlayers.findIndex((p) => p.playerId === over.id)
          if (oldIndex === -1 || newIndex === -1) return

          const newPlayers = arrayMove(allPlayers, oldIndex, newIndex).map(
            (player, idx) => ({ ...player, rank: idx + 1 })
          )
          handlePlayersChangeWithHistory(newPlayers)
          return
        }

        // Merged list with tiers
        const merged = mergeItems(ranking.players || [], ranking.tiers || [])
        const oldIndex = merged.findIndex((item) => getItemId(item) === active.id)
        const newIndex = merged.findIndex((item) => getItemId(item) === over.id)
        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(merged, oldIndex, newIndex)
        const { players, tiers } = splitItems(reordered)
        handlePlayersChangeWithHistory(players)
        onTiersChange(recalcDefaultNames(tiers))
        return
      }

      // Row list view: search/team filter hides tiers, operate on players only
      if (searchQuery || filterTeam !== "ALL") {
        const allPlayers = ranking.players || []
        const oldIndex = allPlayers.findIndex((p) => p.playerId === active.id)
        const newIndex = allPlayers.findIndex((p) => p.playerId === over.id)
        if (oldIndex === -1 || newIndex === -1) return

        const newPlayers = arrayMove(allPlayers, oldIndex, newIndex).map(
          (player, idx) => ({ ...player, rank: idx + 1 })
        )
        handlePlayersChangeWithHistory(newPlayers)
        return
      }

      // Row list view: merged display list (players + tier separators)
      const merged = mergeItems(ranking.players || [], ranking.tiers || [])
      const oldIndex = merged.findIndex((item) => getItemId(item) === active.id)
      const newIndex = merged.findIndex((item) => getItemId(item) === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(merged, oldIndex, newIndex)
      const { players, tiers } = splitItems(reordered)

      handlePlayersChangeWithHistory(players)
      onTiersChange(recalcDefaultNames(tiers))
    },
    [view, ranking.players, ranking.tiers, searchQuery, filterTeam, handlePlayersChangeWithHistory, onTiersChange]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handlePlayerClick = useCallback((ranked: RankedPlayer) => {
    setSelectedPlayer(toPlayer(ranked))
  }, [])

  const handleBatchSelect = useCallback((ids: Set<string>) => {
    setSelectedPlayerIds(ids)
  }, [])

  const handlePlayerSelect = useCallback((ranked: RankedPlayer, ctrlKey?: boolean) => {
    setSelectedPlayerIds((prev) => {
      if (ctrlKey) {
        const next = new Set(prev)
        if (next.has(ranked.playerId)) {
          next.delete(ranked.playerId)
        } else {
          next.add(ranked.playerId)
        }
        return next
      }
      // Normal click: toggle single selection
      if (prev.size === 1 && prev.has(ranked.playerId)) {
        return new Set()
      }
      return new Set([ranked.playerId])
    })
  }, [])

  const columnGroups = useMemo(() => getColumnGroupOrder(filterPosition), [filterPosition])
  const hasStats = Object.keys(playerStats).length > 0

  // Position rank map for card view overlay
  const positionRankMap = useMemo(() => {
    const map = new Map<string, string>()
    const counts: Record<string, number> = {}
    for (const p of (ranking.players || [])) {
      counts[p.position] = (counts[p.position] || 0) + 1
      map.set(p.playerId, `${p.position}${counts[p.position]}`)
    }
    return map
  }, [ranking.players])

  // Build display items: always merge players with tiers, then filter out
  // non-matching players while keeping tier separators in place. When search
  // or team filter is active (not just position tab), tiers are hidden since
  // the result set is sparse and tier boundaries lose meaning.
  const displayItems: DisplayItem[] = useMemo(() => {
    const tiers = ranking.tiers || []
    const hasTiers = tiers.length > 0

    // Search/team filter → sparse results, hide tiers
    if (searchQuery || filterTeam !== "ALL") {
      return filteredPlayers.map((p) => ({ type: "player" as const, data: p }))
    }

    // No tiers or no filtering → straightforward merge
    if (!hasTiers || !hasFilters) {
      return mergeItems(filteredPlayers, tiers)
    }

    // Position filter with tiers: build full merged list, keep matching
    // players, and drop leading tiers that appear before the first visible
    // player (e.g. if no QBs exist in tiers 1-3, those separators are hidden)
    const full = mergeItems(ranking.players || [], tiers)
    const filteredIds = new Set(filteredPlayers.map((p) => p.playerId))
    const kept = full.filter(
      (item) => item.type === "tier" || filteredIds.has(item.data.playerId)
    )
    // Strip leading tiers with no players above them
    const firstPlayerIdx = kept.findIndex((item) => item.type === "player")
    return firstPlayerIdx > 0 ? kept.slice(firstPlayerIdx) : kept
  }, [hasFilters, filteredPlayers, ranking.players, ranking.tiers, searchQuery, filterTeam])

  // Move a specific player up/down via context menu. Temporarily selects the
  // player so handleMovePlayer can find it, then performs the move.
  const handleContextMoveUp = useCallback((player: RankedPlayer) => {
    setSelectedPlayerIds(new Set([player.playerId]))
    // Inline the move logic directly using the player's position in displayItems.
    const merged = mergeItems(ranking.players || [], ranking.tiers || [])
    const currentIndex = merged.findIndex(
      (item) => item.type === "player" && item.data.playerId === player.playerId
    )
    if (currentIndex <= 0) return
    const reordered = arrayMove(merged, currentIndex, currentIndex - 1)
    const { players, tiers } = splitItems(reordered)
    handlePlayersChangeWithHistory(players)
    onTiersChange(recalcDefaultNames(tiers))
  }, [ranking.players, ranking.tiers, handlePlayersChangeWithHistory, onTiersChange])

  const handleContextMoveDown = useCallback((player: RankedPlayer) => {
    setSelectedPlayerIds(new Set([player.playerId]))
    const merged = mergeItems(ranking.players || [], ranking.tiers || [])
    const currentIndex = merged.findIndex(
      (item) => item.type === "player" && item.data.playerId === player.playerId
    )
    if (currentIndex === -1 || currentIndex >= merged.length - 1) return
    const reordered = arrayMove(merged, currentIndex, currentIndex + 1)
    const { players, tiers } = splitItems(reordered)
    handlePlayersChangeWithHistory(players)
    onTiersChange(recalcDefaultNames(tiers))
  }, [ranking.players, ranking.tiers, handlePlayersChangeWithHistory, onTiersChange])

  // Move player up/down in the display list. Operates on the merged list
  // (players + tier separators) so tiers are treated as items that can be
  // stepped over — moving past a tier boundary shifts the separator rather
  // than swapping with the neighboring player in the next tier.
  // When filters are active, tiers are hidden so we fall back to swapping
  // with the visible neighbor in the filtered player list.
  const handleMovePlayer = useCallback(
    (direction: "up" | "down") => {
      if (selectedPlayerIds.size === 0) return
      // For move, use first selected player
      const selectedPlayerId = [...selectedPlayerIds][0]

      if (hasFilters) {
        // Filtered view: no tiers visible, swap with visible neighbor
        const allPlayers = ranking.players || []
        const visibleIndex = filteredPlayers.findIndex((p) => p.playerId === selectedPlayerId)
        if (visibleIndex === -1) return

        const neighborIndex = direction === "up" ? visibleIndex - 1 : visibleIndex + 1
        if (neighborIndex < 0 || neighborIndex >= filteredPlayers.length) return

        const neighborId = filteredPlayers[neighborIndex].playerId
        const fromIndex = allPlayers.findIndex((p) => p.playerId === selectedPlayerId)
        const toIndex = allPlayers.findIndex((p) => p.playerId === neighborId)
        if (fromIndex === -1 || toIndex === -1) return

        const newPlayers = arrayMove(allPlayers, fromIndex, toIndex).map(
          (player, idx) => ({ ...player, rank: idx + 1 })
        )
        handlePlayersChangeWithHistory(newPlayers)
        return
      }

      // Unfiltered view: operate on merged list so tier separators act as
      // steppable items — the player swaps position with the adjacent item
      // (player or tier), keeping its rank stable when crossing a boundary
      const merged = mergeItems(ranking.players || [], ranking.tiers || [])
      const currentIndex = merged.findIndex(
        (item) => item.type === "player" && item.data.playerId === selectedPlayerId
      )
      if (currentIndex === -1) return

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= merged.length) return

      const reordered = arrayMove(merged, currentIndex, targetIndex)
      const { players, tiers } = splitItems(reordered)
      handlePlayersChangeWithHistory(players)
      onTiersChange(recalcDefaultNames(tiers))
    },
    [selectedPlayerIds, hasFilters, ranking.players, ranking.tiers, filteredPlayers, handlePlayersChangeWithHistory, onTiersChange]
  )

  const firstSelectedId = selectedPlayerIds.size > 0 ? [...selectedPlayerIds][0] : null
  const selectedDisplayIndex = firstSelectedId
    ? displayItems.findIndex(
        (item) => item.type === "player" && item.data.playerId === firstSelectedId
      )
    : -1
  const canMoveUp = selectedDisplayIndex > 0
  const canMoveDown = selectedDisplayIndex >= 0 && selectedDisplayIndex < displayItems.length - 1

  const sortableItems = useMemo(
    () => displayItems.map(getItemId),
    [displayItems]
  )

  // Virtualization — only render visible rows to keep drag performant
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => displayItems[index]?.type === "tier" ? 28 : 49,
    overscan: 10,
  })
  const virtualRows = virtualizer.getVirtualItems()

  // Find the active item for the drag overlay
  const activeItem = activeId
    ? displayItems.find((item) => getItemId(item) === activeId) ?? null
    : null

  // Tier index lookup for numbering and color cycling. Built from the full
  // tier list so filtered views preserve original tier numbers (e.g. if
  // tiers 1-3 are hidden, the first visible tier is still labeled "Tier 4").
  const tierIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    const sorted = [...(ranking.tiers || [])].sort((a, b) => a.afterRank - b.afterRank)
    sorted.forEach((tier, i) => map.set(tier.id, i))
    return map
  }, [ranking.tiers])

  // Show/dismiss persistent toast for tier placement mode
  const placingTierToastId = "placing-tier"

  useEffect(() => {
    if (isPlacingTier) {
      toast("Click a player to add a tier above", {
        id: placingTierToastId,
        duration: Infinity,
        action: {
          label: "Cancel",
          onClick: () => setIsPlacingTier(false),
        },
      })
    } else {
      toast.dismiss(placingTierToastId)
    }
  }, [isPlacingTier])

  // Dismiss toast on unmount
  useEffect(() => {
    return () => { toast.dismiss(placingTierToastId) }
  }, [])

  // Place a tier above the selected player.
  // Backfills colors on legacy tiers before adding so position-index
  // shifts from the insertion don't cause existing tiers to change color.
  const handlePlaceTier = useCallback((player: RankedPlayer) => {
    const raw = ranking.tiers || []
    const { tiers: filled, hueIndex: baseHue } = backfillTierColors(raw, ranking.hueIndex ?? raw.length)
    const newTier: TierSeparator = {
      id: `tier_${crypto.randomUUID()}`,
      label: `Tier ${filled.length + 1}`,
      afterRank: player.rank - 1,
      color: generateTierColor(baseHue),
      colorCustomized: false,
    }
    const updated = recalcDefaultNames([...filled, newTier])
    onTiersChange(updated, baseHue + 1)
    setIsPlacingTier(false)
  }, [ranking.tiers, ranking.hueIndex, onTiersChange])

  // Update a player's note — must avoid undefined (Firestore rejects it)
  const handleNoteChange = useCallback((playerId: string, note: string) => {
    const players = (ranking.players || []).map((p) => {
      if (p.playerId !== playerId) return p
      if (note) return { ...p, note }
      // Remove the key entirely instead of setting undefined
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { note: _removed, ...rest } = p
      return rest as RankedPlayer
    })
    handlePlayersChangeWithHistory(players)
  }, [ranking.players, handlePlayersChangeWithHistory])

  // Remove tier after confirmation
  const handleConfirmRemoveTier = useCallback(() => {
    if (!removeTierTarget) return
    const remaining = (ranking.tiers || []).filter((t) => t.id !== removeTierTarget.id)
    const { tiers } = backfillTierColors(remaining, ranking.hueIndex ?? remaining.length)
    onTiersChange(recalcDefaultNames(tiers))
    setRemoveTierTarget(null)
  }, [removeTierTarget, ranking.tiers, ranking.hueIndex, onTiersChange])

  // Rename a tier label
  const handleTierRename = useCallback((tierId: string, newLabel: string) => {
    const tiers = (ranking.tiers || []).map((t) =>
      t.id === tierId ? { ...t, label: newLabel } : t
    )
    onTiersChange(tiers)
  }, [ranking.tiers, onTiersChange])

  // Add player to ranking
  const handleAddPlayer = useCallback((player: {
    playerId: string
    name: string
    position: FantasyPosition
    team: string
    headshotUrl?: string
  }) => {
    const players = ranking.players || []
    const newPlayer: RankedPlayer = {
      rank: players.length + 1,
      playerId: player.playerId,
      name: player.name,
      position: player.position,
      team: player.team,
      headshotUrl: player.headshotUrl,
    }
    const updated = [...players, newPlayer]
    handlePlayersChangeWithHistory(updated)
  }, [ranking.players, handlePlayersChangeWithHistory])

  // Remove player from ranking
  const handleRemovePlayer = useCallback((player: RankedPlayer) => {
    setRemovePlayerTarget(player)
  }, [])

  const handleConfirmRemovePlayer = useCallback(() => {
    if (!removePlayerTarget) return
    const players = (ranking.players || [])
      .filter((p) => p.playerId !== removePlayerTarget.playerId)
      .map((p, i) => ({ ...p, rank: i + 1 }))
    handlePlayersChangeWithHistory(players)
    setRemovePlayerTarget(null)
    setSelectedPlayerIds(new Set())
  }, [removePlayerTarget, ranking.players, handlePlayersChangeWithHistory])

  const handleDrawerRemovePlayer = useCallback((playerId: string) => {
    const players = (ranking.players || [])
      .filter((p) => p.playerId !== playerId)
      .map((p, i) => ({ ...p, rank: i + 1 }))
    handlePlayersChangeWithHistory(players)
  }, [ranking.players, handlePlayersChangeWithHistory])

  const existingPlayerIds = useMemo(
    () => new Set((ranking.players || []).map((p) => p.playerId)),
    [ranking.players]
  )

  // Hotkeys
  useHotkeys(useMemo(() => [
    { key: "z", ctrl: true, handler: handleUndo },
    { key: "Z", ctrl: true, shift: true, handler: handleRedo },
    { key: "y", ctrl: true, handler: handleRedo },
    { key: "ArrowUp", ctrl: true, handler: () => handleMovePlayer("up") },
    { key: "ArrowDown", ctrl: true, handler: () => handleMovePlayer("down") },
    { key: "Escape", handler: () => setSelectedPlayerIds(new Set()) },
    {
      key: "Delete",
      handler: () => {
        if (selectedPlayerIds.size === 0) return
        const first = [...selectedPlayerIds][0]
        const player = (ranking.players || []).find((p) => p.playerId === first)
        if (player) setRemovePlayerTarget(player)
      },
    },
    {
      key: "Backspace",
      handler: () => {
        if (selectedPlayerIds.size === 0) return
        const first = [...selectedPlayerIds][0]
        const player = (ranking.players || []).find((p) => p.playerId === first)
        if (player) setRemovePlayerTarget(player)
      },
    },
  ], [handleUndo, handleRedo, handleMovePlayer, selectedPlayerIds, ranking.players]))

  return (
    <div>
      <RankingHeader ranking={ranking} onSettingsOpen={() => setSettingsOpen(true)} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative w-56">
          <div className="text-xs font-semibold text-muted-foreground invisible mb-1">SEARCH</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              autoComplete="off"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>{getTeamFilterLabel(filterTeam)}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[400px]">
              <SelectItem value="ALL">All</SelectItem>
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">Conferences</SelectLabel>
                {nflConferences.map((conf) => (
                  <SelectItem key={conf} value={conf}>{conf}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">Divisions</SelectLabel>
                {nflDivisions.map((div) => (
                  <SelectItem key={div} value={div}>{div}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">Teams</SelectLabel>
                {nflTeamsByName.map((team) => (
                  <SelectItem key={team.abbr} value={team.abbr}>{team.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="hidden sm:inline">
                  {savedTimeLabel ? `Saved ${savedTimeLabel}` : "Saved"}
                </span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-destructive">Error</span>
            )}
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMovePlayer("up")}
                    disabled={!canMoveUp}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Up <Kbd>Ctrl ↑</Kbd></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMovePlayer("down")}
                    disabled={!canMoveDown}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Down <Kbd>Ctrl ↓</Kbd></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!canUndo}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo <Kbd>Ctrl+Z</Kbd></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRedo}
                    disabled={!canRedo}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo <Kbd>Ctrl+Shift+Z</Kbd></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          <Button
            variant={isPlacingTier ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsPlacingTier((prev) => !prev)}
          >
            {isPlacingTier ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Tier
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddPlayerOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Player
          </Button>
        </div>
      </div>

      {/* Tab bar: position tabs (left) + view toggle tabs (right) */}
      {(ranking.players?.length || 0) > 0 && filteredPlayers.length > 0 && (
        <div className="flex items-end justify-between">
          {ranking.positions.length > 1 ? (
            <Tabs
              value={filterPosition}
              onValueChange={(v) => setFilterPosition(v as FantasyPosition | "All")}
            >
              <TabsList className="bg-transparent h-auto p-0 gap-0.5 rounded-none">
                {["All", ...ranking.positions].map((pos) => (
                  <TabsTrigger
                    key={pos}
                    value={pos}
                    className="rounded-t-md rounded-b-none border border-transparent border-b-0 px-3.5 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-muted dark:data-[state=active]:bg-input/30 data-[state=active]:border-border data-[state=active]:shadow-none"
                  >
                    {pos}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div className="flex gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView("row")}
                    className={cn(
                      "rounded-t-md rounded-b-none border border-b-0 px-2.5 py-1.5 flex items-center justify-center",
                      view === "row"
                        ? "text-foreground bg-muted dark:bg-input/30 border-border"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Row View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView("tier")}
                    className={cn(
                      "rounded-t-md rounded-b-none border border-b-0 px-2.5 py-1.5 flex items-center justify-center",
                      view === "tier"
                        ? "text-foreground bg-muted dark:bg-input/30 border-border"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tier View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView("card")}
                    className={cn(
                      "rounded-t-md rounded-b-none border border-b-0 px-2.5 py-1.5 flex items-center justify-center",
                      view === "card"
                        ? "text-foreground bg-muted dark:bg-input/30 border-border"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Card View</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Player Table / Tier List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {(ranking.players?.length || 0) === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md space-y-3">
            <p>No players yet. Add players to get started.</p>
            <Button variant="outline" size="sm" onClick={() => setAddPlayerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Player
            </Button>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
            No players match your filters
          </div>
        ) : view === "tier" ? (
          <TierListView
            buckets={displayBuckets}
            isPlacingTier={isPlacingTier}
            selectedPlayerIds={isPlacingTier ? emptySet : selectedPlayerIds}
            onPlayerClick={isPlacingTier ? handlePlaceTier : handlePlayerClick}
            onPlayerSelect={isPlacingTier ? handlePlaceTier : handlePlayerSelect}
            onTierRename={handleTierRename}
            onTierRemove={setRemoveTierTarget}
            onMoveUp={handleContextMoveUp}
            onMoveDown={handleContextMoveDown}
            onRemovePlayer={handleRemovePlayer}
            onReorder={handleTierReorder}
            className={cn(
              ranking.positions.length > 1 && "rounded-tl-none",
              "rounded-tr-none"
            )}
          />
        ) : view === "card" ? (
          <CardView
            displayItems={displayItems}
            allPlayers={ranking.players || []}
            playerStats={playerStats}
            rosterInfo={rosterInfo}
            teamStats={teamStats}
            tierIndexMap={tierIndexMap}
            isPlacingTier={isPlacingTier}
            selectedPlayerIds={isPlacingTier ? emptySet : selectedPlayerIds}
            onPlayerClick={isPlacingTier ? handlePlaceTier : handlePlayerClick}
            onPlayerSelect={isPlacingTier ? handlePlaceTier : handlePlayerSelect}
            onBatchSelect={handleBatchSelect}
            onMoveUp={handleContextMoveUp}
            onMoveDown={handleContextMoveDown}
            onRemovePlayer={handleRemovePlayer}
            onTierRename={handleTierRename}
            onTierRemove={setRemoveTierTarget}
            className={cn(
              ranking.positions.length > 1 && "rounded-tl-none",
              "rounded-tr-none"
            )}
          />
        ) : (
          <>
            <div
              ref={scrollRef}
              className={cn(
                "border overflow-auto max-h-[calc(100vh-320px)] bg-card rounded-md rounded-tr-none",
                ranking.positions.length > 1 && "rounded-tl-none"
              )}
            >
              <table className="w-full caption-bottom text-sm [&_tbody_tr]:border-0">
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  {/* Row 1: Group headers */}
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead colSpan={3} className="text-center text-xs font-semibold">
                      PLAYER
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-2 p-0"></TableHead>
                    <TableHead colSpan={2} className="text-center text-xs font-semibold">
                      FANTASY
                    </TableHead>
                    {hasStats && columnGroups.map((group) => {
                      const baseCount = group.columns.filter(c => !c.wideOnly).length
                      return (
                        <React.Fragment key={group.key}>
                          <TableHead className="w-2 p-0 hidden md:table-cell"></TableHead>
                          <TableHead
                            colSpan={baseCount}
                            className="text-center text-xs font-semibold hidden md:table-cell lg:hidden"
                          >
                            {group.label}
                          </TableHead>
                          <TableHead
                            colSpan={group.columns.length}
                            className="text-center text-xs font-semibold hidden lg:table-cell"
                          >
                            {group.label}
                          </TableHead>
                        </React.Fragment>
                      )
                    })}
                  </TableRow>
                  {/* Row 2: Specific column headers */}
                  <TableRow>
                    <TableHead className="text-center w-12 font-medium">RK</TableHead>
                    <TableHead className="text-center w-48 font-medium">NAME</TableHead>
                    <TableHead className="text-center w-16 font-medium">POS</TableHead>
                    <TableHead className="text-center w-16 font-medium">TEAM</TableHead>
                    <TableHead className="text-center w-12 font-medium">G</TableHead>
                    <TableHead className="w-2 p-0"></TableHead>
                    <TableHead className="text-center w-12 font-medium">PTS</TableHead>
                    <TableHead className="text-center w-12 font-medium">AVG</TableHead>
                    {hasStats && columnGroups.map((group) =>
                      group.columns.map((col, colIndex) => (
                        <React.Fragment key={col.key}>
                          {colIndex === 0 && <TableHead className="w-2 p-0 hidden md:table-cell"></TableHead>}
                          <TableHead className={cn(
                            "text-center w-12 font-medium",
                            col.wideOnly ? "hidden lg:table-cell" : "hidden md:table-cell"
                          )}>
                            {col.label}
                          </TableHead>
                        </React.Fragment>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={sortableItems}
                    strategy={verticalListSortingStrategy}
                  >
                    {virtualRows.length > 0 && virtualRows[0].start > 0 && (
                      <tr style={{ height: virtualRows[0].start }} />
                    )}
                    {virtualRows.map((virtualRow) => {
                      const item = displayItems[virtualRow.index]
                      if (item.type === "tier") {
                        return (
                          <TierRow
                            key={item.data.id}
                            tier={item.data}
                            index={tierIndexMap.get(item.data.id) ?? 0}
                            onRemove={setRemoveTierTarget}
                            onRename={handleTierRename}
                          />
                        )
                      }
                      const player = item.data
                      const playerDisplayIndex = virtualRow.index
                      return (
                        <PlayerRow
                          key={player.playerId}
                          player={player}
                          stats={playerStats[player.playerId]}
                          columnGroups={columnGroups}
                          isSelected={!isPlacingTier && selectedPlayerIds.has(player.playerId)}
                          isPlacingTier={isPlacingTier}
                          onClick={isPlacingTier ? handlePlaceTier : handlePlayerClick}
                          onSelect={isPlacingTier ? handlePlaceTier : handlePlayerSelect}
                          onMoveUp={handleContextMoveUp}
                          onMoveDown={handleContextMoveDown}
                          onRemove={handleRemovePlayer}
                          canMoveUp={playerDisplayIndex > 0}
                          canMoveDown={playerDisplayIndex < displayItems.length - 1}
                        />
                      )
                    })}
                    {virtualRows.length > 0 && (
                      <tr style={{ height: virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end }} />
                    )}
                  </SortableContext>
                </TableBody>
              </table>
            </div>
          </>
        )}
        <DragOverlay>
          {view === "card" && activeId ? (
            (() => {
              // Check if it's a tier or player
              const tierItem = (ranking.tiers || []).find((t) => t.id === activeId)
              if (tierItem) {
                return (
                  <CardTierOverlay
                    tier={tierItem}
                    index={tierIndexMap.get(tierItem.id) ?? 0}
                  />
                )
              }
              const player = filteredPlayers.find((p) => p.playerId === activeId)
              return player ? (
                <CardItemOverlay
                  player={player}
                  positionRank={positionRankMap.get(player.playerId) ?? ""}
                  stats={playerStats[player.playerId]}
                />
              ) : null
            })()
          ) : activeItem?.type === "tier" ? (
            <TierRowOverlay
              tier={activeItem.data}
              index={tierIndexMap.get(activeItem.data.id) ?? 0}
            />
          ) : activeItem?.type === "player" ? (
            <PlayerRowOverlay
              player={activeItem.data}
              stats={playerStats[activeItem.data.playerId]}
              columnGroups={columnGroups}
              containerWidth={scrollRef.current?.offsetWidth}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Player count */}
      <div className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? `${filteredPlayers.length} of ${ranking.players?.length || 0} players`
          : `${ranking.players?.length || 0} players`}
      </div>

      <PlayerCard
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        initialSeason={latestSeason}
      />

      <RemoveTierDialog
        open={!!removeTierTarget}
        onOpenChange={(open) => !open && setRemoveTierTarget(null)}
        tierLabel={removeTierTarget?.label ?? ""}
        onConfirm={handleConfirmRemoveTier}
      />

      <SettingsDialog
        ranking={ranking}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={onSettingsSave}
      />

      <AddPlayerDrawer
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        existingPlayerIds={existingPlayerIds}
        positions={ranking.positions}
        scoring={ranking.scoring}
        onAddPlayer={handleAddPlayer}
        onRemovePlayer={handleDrawerRemovePlayer}
      />

      <RemovePlayerDialog
        open={!!removePlayerTarget}
        onOpenChange={(open) => !open && setRemovePlayerTarget(null)}
        playerName={removePlayerTarget?.name ?? ""}
        onConfirm={handleConfirmRemovePlayer}
      />
    </div>
  )
}
