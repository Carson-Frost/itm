"use client"

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Search, Check, Loader2, Undo2, Redo2, Plus, X, ArrowUp, ArrowDown } from "lucide-react"
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
import { mergeItems, splitItems, getItemId } from "@/lib/tier-utils"
import { Player, Position } from "@/lib/mock-fantasy-data"
import { nflTeamsByName, nflDivisions, nflConferences, teamMatchesFilter, getTeamFilterLabel } from "@/lib/team-utils"
import { PlayerCard } from "@/app/fantasy/charts/components/player-card"
import { RankingHeader } from "./ranking-header"
import { SettingsDialog } from "./settings-dialog"
import { PlayerRow, PlayerRowOverlay } from "./player-row"
import { TierRow, TierRowOverlay } from "./tier-row"
import { RemoveTierDialog } from "./remove-tier-dialog"
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) return

      // When filters are active, tiers are hidden — drag is players-only
      if (hasFilters) {
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

      // Unfiltered: work on the merged display list
      const merged = mergeItems(ranking.players || [], ranking.tiers || [])
      const oldIndex = merged.findIndex((item) => getItemId(item) === active.id)
      const newIndex = merged.findIndex((item) => getItemId(item) === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(merged, oldIndex, newIndex)
      const { players, tiers } = splitItems(reordered)

      // Only push player changes to undo history (tiers excluded from undo/redo)
      handlePlayersChangeWithHistory(players)
      onTiersChange(tiers)
    },
    [ranking.players, ranking.tiers, hasFilters, handlePlayersChangeWithHistory, onTiersChange]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handlePlayerClick = useCallback((ranked: RankedPlayer) => {
    setSelectedPlayer(toPlayer(ranked))
  }, [])

  const handlePlayerSelect = useCallback((ranked: RankedPlayer) => {
    setSelectedPlayerId((prev) => prev === ranked.playerId ? null : ranked.playerId)
  }, [])

  // Move relative to the filtered view so position/team tabs are respected
  const handleMovePlayer = useCallback(
    (direction: "up" | "down") => {
      if (!selectedPlayerId) return
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
    },
    [selectedPlayerId, ranking.players, filteredPlayers, handlePlayersChangeWithHistory]
  )

  const selectedFilteredIndex = selectedPlayerId
    ? filteredPlayers.findIndex((p) => p.playerId === selectedPlayerId)
    : -1
  const canMoveUp = selectedFilteredIndex > 0
  const canMoveDown = selectedFilteredIndex >= 0 && selectedFilteredIndex < filteredPlayers.length - 1

  const columnGroups = useMemo(() => getColumnGroupOrder(filterPosition), [filterPosition])
  const hasStats = Object.keys(playerStats).length > 0

  // Build display items: merged with tiers when unfiltered, plain players when filtered
  const displayItems: DisplayItem[] = useMemo(() => {
    if (hasFilters) {
      return filteredPlayers.map((p) => ({ type: "player" as const, data: p }))
    }
    return mergeItems(ranking.players || [], ranking.tiers || [])
  }, [hasFilters, filteredPlayers, ranking.players, ranking.tiers])

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

  // Tier index lookup for color cycling
  const tierIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    let tierIdx = 0
    for (const item of displayItems) {
      if (item.type === "tier") {
        map.set(item.data.id, tierIdx++)
      }
    }
    return map
  }, [displayItems])

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

      {/* Player Table */}
      {(ranking.players?.length || 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
          No players found. Try refreshing the page.
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
          No players match your filters
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {ranking.positions.length > 1 && (
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
          )}
          <div
            ref={scrollRef}
            className={cn(
              "border overflow-auto max-h-[calc(100vh-320px)] bg-card",
              ranking.positions.length > 1 ? "rounded-md rounded-tl-none" : "rounded-md"
            )}
          >
            <table className="w-full caption-bottom text-sm [&_tbody_tr]:border-0">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {/* Row 1: Group headers */}
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead colSpan={4} className="text-center text-xs font-semibold">
                    PLAYER
                  </TableHead>
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
          <DragOverlay>
            {activeItem?.type === "tier" ? (
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
      )}

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
