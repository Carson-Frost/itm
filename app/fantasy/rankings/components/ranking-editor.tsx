"use client"

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserRanking, RankedPlayer, FantasyPosition } from "@/lib/types/ranking-schemas"
import { Player, Position } from "@/lib/mock-fantasy-data"
import { PlayerCard } from "@/app/fantasy/charts/components/player-card"
import { RankingHeader } from "./ranking-header"
import { PlayerRow, PlayerRowOverlay } from "./player-row"
import { cn } from "@/lib/utils"

interface RankingEditorProps {
  ranking: UserRanking
  saveStatus: "saved" | "saving" | "error"
  onSettingsSave: (updates: Partial<UserRanking>) => void
  onPlayersChange: (players: RankedPlayer[]) => void
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

// Column definitions - exactly matching fantasy charts
const rushingColumns = [
  { key: "rushingYards", label: "YD" },
  { key: "rushingTDs", label: "TD" },
]

const receivingColumns = [
  { key: "receptions", label: "REC" },
  { key: "receivingYards", label: "YD" },
  { key: "receivingTDs", label: "TD" },
]

const passingColumns = [
  { key: "completions", label: "CMP" },
  { key: "passingYards", label: "YD" },
  { key: "passingTDs", label: "TD" },
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
}: RankingEditorProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [latestSeason, setLatestSeason] = useState(2025)
  const [playerStats, setPlayerStats] = useState<PlayerStatsMap>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPosition, setFilterPosition] = useState<FantasyPosition | "All">(
    ranking.positions.length === 1 ? ranking.positions[0] : "All"
  )
  const [filterTeam, setFilterTeam] = useState<string>("All")
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

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

          const teams = Array.from(
            new Set(ranking.players?.map((p) => p.team).filter(Boolean) || [])
          ).sort()
          setAvailableTeams(teams)
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

    if (filterTeam !== "All") {
      players = players.filter((p) => p.team === filterTeam)
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) return

      const allPlayers = ranking.players || []
      const oldIndex = allPlayers.findIndex((p) => p.playerId === active.id)
      const newIndex = allPlayers.findIndex((p) => p.playerId === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newPlayers = arrayMove(allPlayers, oldIndex, newIndex).map(
        (player, idx) => ({ ...player, rank: idx + 1 })
      )

      handlePlayersChangeWithHistory(newPlayers)
    },
    [ranking.players, handlePlayersChangeWithHistory]
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

  const hasFilters = filterPosition !== "All" || filterTeam !== "All" || searchQuery
  const columnGroups = useMemo(() => getColumnGroupOrder(filterPosition), [filterPosition])
  const hasStats = Object.keys(playerStats).length > 0

  // Memoize the items array so SortableContext doesn't re-measure on every render
  const displayedPlayers = hasFilters ? filteredPlayers : ranking.players
  const sortableItems = useMemo(
    () => displayedPlayers?.map((p) => p.playerId) || [],
    [displayedPlayers]
  )

  // Virtualization — only render visible rows to keep drag performant
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: displayedPlayers?.length || 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 49,
    overscan: 10,
  })
  const virtualRows = virtualizer.getVirtualItems()

  // Find the active player for the drag overlay
  const activePlayer = activeId
    ? (ranking.players || []).find((p) => p.playerId === activeId)
    : null

  return (
    <div>
      <RankingHeader
        ranking={ranking}
        saveStatus={saveStatus}
        onSettingsSave={onSettingsSave}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            autoComplete="off"
            className="pl-9"
          />
        </div>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Teams</SelectItem>
            {availableTeams.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <TableHead colSpan={3} className="text-center text-xs font-semibold">
                    PLAYER
                  </TableHead>
                  <TableHead className="w-3 p-0"></TableHead>
                  <TableHead colSpan={3} className="text-center text-xs font-semibold">
                    FANTASY
                  </TableHead>
                  {hasStats && columnGroups.map((group) => (
                    <React.Fragment key={group.key}>
                      <TableHead className="w-3 p-0 hidden md:table-cell"></TableHead>
                      <TableHead
                        colSpan={group.columns.length}
                        className="text-center text-xs font-semibold hidden md:table-cell"
                      >
                        {group.label}
                      </TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
                {/* Row 2: Specific column headers */}
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-center w-12 font-medium">RK</TableHead>
                  <TableHead className="text-center w-48 font-medium">NAME</TableHead>
                  <TableHead className="text-center w-16 font-medium">POS</TableHead>
                  <TableHead className="text-center w-16 font-medium">TEAM</TableHead>
                  <TableHead className="w-3 p-0"></TableHead>
                  <TableHead className="text-center w-12 font-medium">G</TableHead>
                  <TableHead className="text-center w-16 font-medium">PTS</TableHead>
                  <TableHead className="text-center w-16 font-medium">AVG</TableHead>
                  {hasStats && columnGroups.map((group) =>
                    group.columns.map((col, colIndex) => (
                      <React.Fragment key={col.key}>
                        {colIndex === 0 && <TableHead className="w-3 p-0 hidden md:table-cell"></TableHead>}
                        <TableHead className="text-center font-medium hidden md:table-cell">
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
                    const player = displayedPlayers![virtualRow.index]
                    return (
                      <PlayerRow
                        key={player.playerId}
                        player={player}
                        stats={playerStats[player.playerId]}
                        columnGroups={columnGroups}
                        isSelected={selectedPlayerId === player.playerId}
                        onClick={handlePlayerClick}
                        onSelect={handlePlayerSelect}
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
            {activePlayer ? (
              <PlayerRowOverlay
                player={activePlayer}
                stats={playerStats[activePlayer.playerId]}
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
    </div>
  )
}
