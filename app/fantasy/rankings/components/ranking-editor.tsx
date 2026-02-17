"use client"

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Search, Check, Loader2, Undo2, Redo2, Plus, X, ArrowUp, ArrowDown, List, LayoutGrid } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
  UniqueIdentifier,
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
import { mergeItems, splitItems, getItemId, groupByTiers, bucketsToData, TierBucket } from "@/lib/tier-utils"
import { getBucketContainerId } from "./tier-list-view"
import { Player, Position } from "@/lib/mock-fantasy-data"
import { nflTeamsByName, nflDivisions, nflConferences, teamMatchesFilter, getTeamFilterLabel } from "@/lib/team-utils"
import { PlayerCard } from "@/app/fantasy/charts/components/player-card"
import { RankingHeader } from "./ranking-header"
import { SettingsDialog } from "./settings-dialog"
import { PlayerRow, PlayerRowOverlay } from "./player-row"
import { TierRow, TierRowOverlay } from "./tier-row"
import { RemoveTierDialog } from "./remove-tier-dialog"
import { TierListView, TierPlayerCardOverlay } from "./tier-list-view"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface RankingEditorProps {
  ranking: UserRanking
  saveStatus: "saved" | "saving" | "error"
  onSettingsSave: (updates: Partial<UserRanking>) => void
  onPlayersChange: (players: RankedPlayer[]) => void
  onTiersChange: (tiers: TierSeparator[]) => void
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
  }
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
  onSettingsSave,
  onPlayersChange,
  onTiersChange,
}: RankingEditorProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [latestSeason, setLatestSeason] = useState(2025)
  const [playerStats, setPlayerStats] = useState<PlayerStatsMap>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPosition, setFilterPosition] = useState<FantasyPosition | "All">(
    ranking.positions.length === 1 ? ranking.positions[0] : "All"
  )
  const [filterTeam, setFilterTeam] = useState<string>("ALL")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [removeTierTarget, setRemoveTierTarget] = useState<TierSeparator | null>(null)
  const [isPlacingTier, setIsPlacingTier] = useState(false)
  const [view, setView] = useState<"list" | "tierlist">("list")
  // Tracks which tier containers have their cards enabled as droppable targets.
  // Cards in inactive tiers are draggable but not droppable, so dnd-kit skips
  // measuring them — reducing initial drag measurements from ~200+ to ~8.
  const [activeTierIds, setActiveTierIds] = useState<Set<string>>(new Set())

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
            }
          }
          setPlayerStats(statsMap)
        }
      } catch {
        // Handle silently
      }
    }

    fetchStats()
  }, [ranking.players])

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

  // Multi-container drag state for tier list view.
  // During a drag, buckets are updated live (onDragOver moves players
  // between tiers). On drop, buckets are converted back to a flat list.
  const [dragBuckets, setDragBuckets] = useState<TierBucket[] | null>(null)

  const currentBuckets = useMemo(
    () => dragBuckets ?? groupByTiers(ranking.players || [], ranking.tiers || []),
    [dragBuckets, ranking.players, ranking.tiers]
  )

  // Maps playerId → containerId for the collision detection function
  const bucketMapRef = useRef<Map<string, string>>(new Map())
  bucketMapRef.current = useMemo(() => {
    const map = new Map<string, string>()
    for (const bucket of currentBuckets) {
      const cid = getBucketContainerId(bucket)
      for (const player of bucket.players) {
        map.set(player.playerId, cid)
      }
    }
    return map
  }, [currentBuckets])

  // Refs from the official @dnd-kit multi-container pattern:
  // lastOverId caches the previous collision target so layout shifts
  // during cross-container moves don't cause overId to go null.
  // recentlyMovedToNewContainer signals the collision detection to
  // use the cached value during the layout reflow frame.
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const recentlyMovedToNewContainer = useRef(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [dragBuckets])

  // Finds which container a player or container ID belongs to
  const findContainer = useCallback((id: string): string | undefined => {
    if (id.startsWith("tier-bucket-")) return id
    return bucketMapRef.current.get(id)
  }, [])

  // Collision detection adapted from the official @dnd-kit multi-container example.
  // pointerWithin finds intersecting droppables, with rectIntersection as fallback.
  // When a container is hit, drills down to the closest item within it.
  // Empty containers return the container ID directly.
  // Caches lastOverId to survive layout shifts after cross-container moves.
  const tierListCollision = useCallback<CollisionDetection>((args) => {
    const pointerIntersections = pointerWithin(args)
    const intersections =
      pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args)

    let overId = getFirstCollision(intersections, "id")

    if (overId != null) {
      // If overId is a container, drill down to closest item within it
      if (String(overId).startsWith("tier-bucket-")) {
        const containerItems = args.droppableContainers.filter(
          (c) =>
            c.id !== overId &&
            bucketMapRef.current.get(String(c.id)) === String(overId)
        )

        if (containerItems.length > 0) {
          overId = closestCenter({
            ...args,
            droppableContainers: containerItems,
          })[0]?.id
        }
      }

      lastOverId.current = overId
      return [{ id: overId }]
    }

    // Layout shift after cross-container move can make overId null
    if (recentlyMovedToNewContainer.current) {
      lastOverId.current = activeId
    }

    return lastOverId.current ? [{ id: lastOverId.current }] : []
  }, [activeId])

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

  // Snapshot of buckets at drag start for cancel recovery
  const clonedBuckets = useRef<TierBucket[] | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)
    if (view === "tierlist") {
      // Activate the source tier so its cards become droppable targets
      const sourceContainer = findContainer(id)
      if (sourceContainer) {
        setActiveTierIds(new Set([sourceContainer]))
      }
      // Snapshot for cancel recovery — don't set dragBuckets yet to avoid
      // a full re-render on grab. Buckets are lazily created on first
      // cross-container move in handleDragOver.
      clonedBuckets.current = currentBuckets.map(b => ({ ...b, players: [...b.players] }))
    }
  }, [view, currentBuckets, findContainer])

  // Cross-tier movement during drag (adapted from official @dnd-kit multi-container example)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (view !== "tierlist") return

      const { active, over } = event
      const overId = over?.id
      if (overId == null) return

      const overContainer = findContainer(String(overId))
      const activeContainer = findContainer(String(active.id))
      if (!overContainer || !activeContainer || activeContainer === overContainer) return

      // Activate the hovered tier so its cards become droppable targets
      // for precise within-tier positioning on subsequent drag events
      setActiveTierIds(prev => {
        if (prev.has(overContainer)) return prev
        const next = new Set(prev)
        next.add(overContainer)
        return next
      })

      setDragBuckets((prev) => {
        // Lazy init: first cross-container move creates mutable copy
        const buckets = prev ?? currentBuckets.map(b => ({ ...b, players: [...b.players] }))

        const fromIdx = buckets.findIndex((b) => getBucketContainerId(b) === activeContainer)
        const toIdx = buckets.findIndex((b) => getBucketContainerId(b) === overContainer)
        if (fromIdx === -1 || toIdx === -1) return buckets

        const activeItems = buckets[fromIdx].players
        const overItems = buckets[toIdx].players
        const activeIndex = activeItems.findIndex((p) => p.playerId === String(active.id))
        const overIndex = overItems.findIndex((p) => p.playerId === String(overId))

        let newIndex: number

        if (String(overId).startsWith("tier-bucket-")) {
          // Dropping on container itself (empty tier)
          newIndex = overItems.length
        } else {
          // Insert above or below the target card based on pointer position
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height

          const modifier = isBelowOverItem ? 1 : 0
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length
        }

        // Skip if already at the target position (prevents oscillation at tier edges)
        if (fromIdx === toIdx && activeIndex === newIndex) return buckets

        recentlyMovedToNewContainer.current = true

        // Only clone the two affected buckets — unchanged tiers keep stable
        // references so memo prevents their rows from re-rendering
        const newBuckets = [...buckets]
        newBuckets[fromIdx] = { ...buckets[fromIdx], players: [...buckets[fromIdx].players] }
        if (fromIdx !== toIdx) {
          newBuckets[toIdx] = { ...buckets[toIdx], players: [...buckets[toIdx].players] }
        }

        const [player] = newBuckets[fromIdx].players.splice(activeIndex, 1)
        newBuckets[toIdx].players.splice(newIndex, 0, player)

        return newBuckets
      })
    },
    [view, findContainer, currentBuckets]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setActiveTierIds(new Set())
      clonedBuckets.current = null

      if (!over) {
        setDragBuckets(null)
        return
      }

      // Tier list view: persist the bucket state built up during drag
      if (view === "tierlist") {
        const activeContainer = findContainer(String(active.id))
        const overContainer = findContainer(String(over.id))
        const finalBuckets = dragBuckets ?? currentBuckets
        setDragBuckets(null)

        if (!activeContainer || !overContainer) return

        // Within-container reorder (cross-container was handled by onDragOver)
        if (activeContainer === overContainer) {
          const bucketIdx = finalBuckets.findIndex(
            (b) => getBucketContainerId(b) === activeContainer
          )
          if (bucketIdx === -1) return

          const bucket = finalBuckets[bucketIdx]
          const activeIdx = bucket.players.findIndex((p) => p.playerId === String(active.id))
          const overIdx = bucket.players.findIndex((p) => p.playerId === String(over.id))

          if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
            const reordered = finalBuckets.map((b, i) =>
              i === bucketIdx
                ? { ...b, players: arrayMove(b.players, activeIdx, overIdx) }
                : b
            )
            const { players, tiers } = bucketsToData(reordered)
            handlePlayersChangeWithHistory(players)
            onTiersChange(tiers)
            return
          }
        }

        // Cross-container or same position — persist current bucket state
        const { players, tiers } = bucketsToData(finalBuckets)
        handlePlayersChangeWithHistory(players)
        onTiersChange(tiers)
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
      onTiersChange(tiers)
    },
    [view, dragBuckets, currentBuckets, findContainer, ranking.players, ranking.tiers, searchQuery, filterTeam, handlePlayersChangeWithHistory, onTiersChange]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveTierIds(new Set())
    setDragBuckets(null)
    clonedBuckets.current = null
  }, [])

  const handlePlayerClick = useCallback((ranked: RankedPlayer) => {
    setSelectedPlayer(toPlayer(ranked))
  }, [])

  const handlePlayerSelect = useCallback((ranked: RankedPlayer) => {
    setSelectedPlayerId((prev) => prev === ranked.playerId ? null : ranked.playerId)
  }, [])

  const columnGroups = useMemo(() => getColumnGroupOrder(filterPosition), [filterPosition])
  const hasStats = Object.keys(playerStats).length > 0

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

  // Move player up/down in the display list. Operates on the merged list
  // (players + tier separators) so tiers are treated as items that can be
  // stepped over — moving past a tier boundary shifts the separator rather
  // than swapping with the neighboring player in the next tier.
  // When filters are active, tiers are hidden so we fall back to swapping
  // with the visible neighbor in the filtered player list.
  const handleMovePlayer = useCallback(
    (direction: "up" | "down") => {
      if (!selectedPlayerId) return

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
      onTiersChange(tiers)
    },
    [selectedPlayerId, hasFilters, ranking.players, ranking.tiers, filteredPlayers, handlePlayersChangeWithHistory, onTiersChange]
  )

  const selectedDisplayIndex = selectedPlayerId
    ? displayItems.findIndex(
        (item) => item.type === "player" && item.data.playerId === selectedPlayerId
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
    estimateSize: (index) => displayItems[index]?.type === "tier" ? 32 : 49,
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
    return () => toast.dismiss(placingTierToastId)
  }, [])

  // Place a tier above the selected player
  const handlePlaceTier = useCallback((player: RankedPlayer) => {
    const tiers = ranking.tiers || []
    const newTier: TierSeparator = {
      id: `tier_${crypto.randomUUID()}`,
      label: `Tier ${tiers.length + 1}`,
      afterRank: player.rank - 1,
    }
    onTiersChange([...tiers, newTier])
    setIsPlacingTier(false)
  }, [ranking.tiers, onTiersChange])

  // Remove tier after confirmation
  const handleConfirmRemoveTier = useCallback(() => {
    if (!removeTierTarget) return
    const tiers = (ranking.tiers || []).filter((t) => t.id !== removeTierTarget.id)
    onTiersChange(tiers)
    setRemoveTierTarget(null)
  }, [removeTierTarget, ranking.tiers, onTiersChange])

  return (
    <div>
      <RankingHeader ranking={ranking} />

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
                <span className="hidden sm:inline">Saved</span>
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
                <TooltipContent>Move Up</TooltipContent>
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
                <TooltipContent>Move Down</TooltipContent>
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
                <TooltipContent>Undo</TooltipContent>
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
                <TooltipContent>Redo</TooltipContent>
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
          <SettingsDialog ranking={ranking} onSave={onSettingsSave} />
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
          <div className="flex gap-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-t-md rounded-b-none border border-b-0 px-2.5 py-1.5 flex items-center justify-center",
                view === "list"
                  ? "text-foreground bg-muted dark:bg-input/30 border-border"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("tierlist")}
              className={cn(
                "rounded-t-md rounded-b-none border border-b-0 px-2.5 py-1.5 flex items-center justify-center",
                view === "tierlist"
                  ? "text-foreground bg-muted dark:bg-input/30 border-border"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Player Table / Tier List */}
      <DndContext
        sensors={sensors}
        collisionDetection={view === "tierlist" ? tierListCollision : closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {(ranking.players?.length || 0) === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
            No players found. Try refreshing the page.
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
            No players match your filters
          </div>
        ) : view === "tierlist" ? (
          <TierListView
            buckets={displayBuckets}
            activeTierIds={activeTierIds}
            isPlacingTier={isPlacingTier}
            selectedPlayerId={isPlacingTier ? null : selectedPlayerId}
            onPlayerClick={isPlacingTier ? handlePlaceTier : handlePlayerClick}
            onPlayerSelect={isPlacingTier ? handlePlaceTier : handlePlayerSelect}
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
                    <TableHead className="w-8"></TableHead>
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
                    <TableHead className="w-8"></TableHead>
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
                          />
                        )
                      }
                      const player = item.data
                      return (
                        <PlayerRow
                          key={player.playerId}
                          player={player}
                          stats={playerStats[player.playerId]}
                          columnGroups={columnGroups}
                          isSelected={!isPlacingTier && selectedPlayerId === player.playerId}
                          isPlacingTier={isPlacingTier}
                          onClick={isPlacingTier ? handlePlaceTier : handlePlayerClick}
                          onSelect={isPlacingTier ? handlePlaceTier : handlePlayerSelect}
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
          {view === "tierlist" && activeId ? (
            (() => {
              const player = filteredPlayers.find((p) => p.playerId === activeId)
              return player ? <TierPlayerCardOverlay player={player} /> : null
            })()
          ) : activeItem?.type === "tier" ? (
            <TierRowOverlay
              index={tierIndexMap.get(activeItem.data.id) ?? 0}
            />
          ) : activeItem?.type === "player" ? (
            <PlayerRowOverlay
              player={activeItem.data}
              stats={playerStats[activeItem.data.playerId]}
              columnGroups={columnGroups}
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
        tierLabel={removeTierTarget ? `Tier ${(tierIndexMap.get(removeTierTarget.id) ?? 0) + 1}` : ""}
        onConfirm={handleConfirmRemoveTier}
      />
    </div>
  )
}
