"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { PositionBadge } from "@/components/position-badge"
import { Search, X, Check, Plus, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  nflTeamsByName,
  nflDivisions,
  nflConferences,
  getTeamFilterLabel,
} from "@/lib/team-utils"
import { Pagination } from "@/app/fantasy/charts/components/pagination"
import { cn } from "@/lib/utils"
import type { ConnectionsPlayer } from "@/lib/types/connections"

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 50

const COMPACT_WIDTH = 480
const EXPANDED_WIDTH = 1200
const EXPAND_THRESHOLD = 650
const MIN_WIDTH = 420

interface PlayerResult {
  name: string
  playerId: string
  position: string
  team: string
  season: number
  headshotUrl: string | null
  college: string | null
  yearsExp: number | null
  jerseyNumber: number | null
  opponentTeam?: string | null
  games: number
  fantasyPoints: number
  passingAttempts: number
  completions: number
  passingYards: number
  passingTds: number
  passingInterceptions: number
  sacks: number
  passingEpa: number
  passingAirYards: number
  passingYac: number
  passingFirstDowns: number
  passingCpoe: number
  passing2pt: number
  sackFumbles: number
  sackYardsLost: number
  pacr: number
  carries: number
  rushingYards: number
  rushingTds: number
  rushingFumbles: number
  rushingFumblesLost: number
  rushingEpa: number
  rushingFirstDowns: number
  rushing2pt: number
  targets: number
  receptions: number
  receivingYards: number
  receivingTds: number
  receivingFumbles: number
  receivingYac: number
  receivingEpa: number
  receivingAirYards: number
  receivingFirstDowns: number
  targetShare: number
  airYardsShare: number
  wopr: number
  racr: number
  receiving2pt: number
}

type SortField = keyof Omit<PlayerResult, "name" | "playerId" | "position" | "team" | "season" | "headshotUrl" | "college" | "yearsExp" | "jerseyNumber" | "opponentTeam">
type SortDir = "asc" | "desc"

interface ColumnDef {
  key: SortField
  label: string
  fullName: string
  format?: (v: number) => string
}

const fmt1 = (v: number) => v.toFixed(1)
const fmtPct = (v: number) => (v * 100).toFixed(1) + "%"
const fmtDec2 = (v: number) => v.toFixed(2)

const allRushingColumns: ColumnDef[] = [
  { key: "carries", label: "ATT", fullName: "Rush Attempts" },
  { key: "rushingYards", label: "YD", fullName: "Rushing Yards" },
  { key: "rushingTds", label: "TD", fullName: "Rushing Touchdowns" },
  { key: "rushingFumbles", label: "FUM", fullName: "Fumbles" },
]

const allReceivingColumns: ColumnDef[] = [
  { key: "targets", label: "TAR", fullName: "Targets" },
  { key: "receptions", label: "REC", fullName: "Receptions" },
  { key: "receivingYards", label: "YD", fullName: "Receiving Yards" },
  { key: "receivingTds", label: "TD", fullName: "Receiving Touchdowns" },
]

const allPassingColumns: ColumnDef[] = [
  { key: "passingAttempts", label: "ATT", fullName: "Pass Attempts" },
  { key: "completions", label: "CMP", fullName: "Completions" },
  { key: "passingYards", label: "YD", fullName: "Passing Yards" },
  { key: "passingTds", label: "TD", fullName: "Passing Touchdowns" },
  { key: "passingInterceptions", label: "INT", fullName: "Interceptions" },
  { key: "sacks", label: "SACK", fullName: "Sacks" },
]

const expandedPassingColumns: ColumnDef[] = [
  { key: "passingAttempts", label: "ATT", fullName: "Pass Attempts" },
  { key: "completions", label: "CMP", fullName: "Completions" },
  { key: "passingYards", label: "YD", fullName: "Passing Yards" },
  { key: "passingTds", label: "TD", fullName: "Passing Touchdowns" },
  { key: "passingInterceptions", label: "INT", fullName: "Interceptions" },
  { key: "sacks", label: "SACK", fullName: "Sacks" },
  { key: "sackYardsLost", label: "SCK YD", fullName: "Sack Yards Lost" },
  { key: "sackFumbles", label: "SCK FUM", fullName: "Sack Fumbles" },
  { key: "passingAirYards", label: "AIR", fullName: "Air Yards" },
  { key: "passingYac", label: "YAC", fullName: "Yards After Catch" },
  { key: "passingFirstDowns", label: "1ST", fullName: "First Downs" },
  { key: "passingEpa", label: "EPA", fullName: "Passing EPA", format: fmt1 },
  { key: "passingCpoe", label: "CPOE", fullName: "Completion % Over Expected", format: fmt1 },
  { key: "pacr", label: "PACR", fullName: "Passer Air Conversion Ratio", format: fmtDec2 },
  { key: "passing2pt", label: "2PT", fullName: "2-Point Conversions" },
]

const expandedRushingColumns: ColumnDef[] = [
  { key: "carries", label: "ATT", fullName: "Rush Attempts" },
  { key: "rushingYards", label: "YD", fullName: "Rushing Yards" },
  { key: "rushingTds", label: "TD", fullName: "Rushing Touchdowns" },
  { key: "rushingFumbles", label: "FUM", fullName: "Fumbles" },
  { key: "rushingFumblesLost", label: "FUML", fullName: "Fumbles Lost" },
  { key: "rushingFirstDowns", label: "1ST", fullName: "First Downs" },
  { key: "rushingEpa", label: "EPA", fullName: "Rushing EPA", format: fmt1 },
  { key: "rushing2pt", label: "2PT", fullName: "2-Point Conversions" },
]

const expandedReceivingColumns: ColumnDef[] = [
  { key: "targets", label: "TAR", fullName: "Targets" },
  { key: "receptions", label: "REC", fullName: "Receptions" },
  { key: "receivingYards", label: "YD", fullName: "Receiving Yards" },
  { key: "receivingTds", label: "TD", fullName: "Receiving Touchdowns" },
  { key: "receivingFumbles", label: "FUM", fullName: "Fumbles" },
  { key: "receivingYac", label: "YAC", fullName: "Yards After Catch" },
  { key: "receivingAirYards", label: "AIR", fullName: "Air Yards" },
  { key: "receivingFirstDowns", label: "1ST", fullName: "First Downs" },
  { key: "receivingEpa", label: "EPA", fullName: "Receiving EPA", format: fmt1 },
  { key: "targetShare", label: "TAR%", fullName: "Target Share", format: fmtPct },
  { key: "airYardsShare", label: "AIR%", fullName: "Air Yards Share", format: fmtPct },
  { key: "wopr", label: "WOPR", fullName: "Weighted Opportunity Rating", format: fmtDec2 },
  { key: "racr", label: "RACR", fullName: "Receiver Air Conversion Ratio", format: fmtDec2 },
  { key: "receiving2pt", label: "2PT", fullName: "2-Point Conversions" },
]

type StatView = "all" | "passing" | "rushing" | "receiving"

interface PlayerSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPlayer: (player: ConnectionsPlayer) => void
  onRemovePlayer?: (playerId: string) => void
  existingPlayerIds: Set<string>
}

function SortableTableHead({
  field,
  label,
  fullName,
  current,
  dir,
  onSort,
  className,
}: {
  field: SortField
  label: string
  fullName?: string
  current: SortField
  dir: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = current === field
  return (
    <TableHead className={cn(className)}>
      <button
        onClick={() => onSort(field)}
        className="hover:text-foreground transition-colors font-medium w-full text-center"
        title={fullName}
      >
        <span className="relative inline-block">
          {label}
          {isActive && (
            <sup className="absolute left-full ml-0.5 top-0">
              {dir === "asc" ? (
                <ChevronUp className="h-2.5 w-2.5" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5" />
              )}
            </sup>
          )}
        </span>
      </button>
    </TableHead>
  )
}

function TableSkeletonRows({ colCount, isWeekly }: { colCount: number; isWeekly: boolean }) {
  return (
    <>
      {Array.from({ length: 15 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="w-10">
            <Skeleton className="h-7 w-7 mx-auto" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-[18px] w-[30px] rounded-full mx-auto" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-3.5 w-8 mx-auto" />
          </TableCell>
          {isWeekly && (
            <TableCell className="text-center">
              <Skeleton className="h-3.5 w-8 mx-auto" />
            </TableCell>
          )}
          <TableCell className="text-center">
            <Skeleton className="h-3.5 w-6 mx-auto" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-3.5 w-10 mx-auto" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-3.5 w-10 mx-auto" />
          </TableCell>
          {Array.from({ length: Math.max(0, colCount) }).map((_, j) => (
            <TableCell key={j} className="text-center table-cell">
              <Skeleton className="h-3.5 w-8 mx-auto" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function CompactSkeletonRows() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3.5 w-28 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-7 shrink-0" />
        </div>
      ))}
    </>
  )
}

function formatStat(value: number, format?: (v: number) => string): string {
  if (format) {
    const result = format(value)
    if (result === "0.0%" || result === "0.00" || result === "0.0") return "\u2014"
    return result
  }
  return value ? String(Math.round(value)) : "\u2014"
}

export function PlayerSearch({
  open,
  onOpenChange,
  onSelectPlayer,
  onRemovePlayer,
  existingPlayerIds,
}: PlayerSearchProps) {
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState("ALL")
  const [team, setTeam] = useState("ALL")
  const [season, setSeason] = useState<string | null>(null)
  const [week, setWeek] = useState<string>("")
  const [sortBy, setSortBy] = useState<SortField>("fantasyPoints")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [results, setResults] = useState<PlayerResult[]>([])
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetchedSeasons, setHasFetchedSeasons] = useState(false)
  const [statView, setStatView] = useState<StatView>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  const [drawerWidth, setDrawerWidth] = useState(COMPACT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const isExpanded = drawerWidth > EXPAND_THRESHOLD
  const scrollRef = useRef<HTMLDivElement>(null)

  const isWeekly = week !== ""
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const columnLayout = useMemo(() => {
    if (statView === "passing") {
      return { groups: [{ key: "passing", label: "PASSING", columns: expandedPassingColumns }] }
    }
    if (statView === "rushing") {
      return { groups: [{ key: "rushing", label: "RUSHING", columns: expandedRushingColumns }] }
    }
    if (statView === "receiving") {
      return { groups: [{ key: "receiving", label: "RECEIVING", columns: expandedReceivingColumns }] }
    }
    return {
      groups: [
        { key: "rushing", label: "RUSHING", columns: allRushingColumns },
        { key: "receiving", label: "RECEIVING", columns: allReceivingColumns },
        { key: "passing", label: "PASSING", columns: allPassingColumns },
      ],
    }
  }, [statView])

  const allVisibleColumns = useMemo(() => {
    return columnLayout.groups.flatMap((g) =>
      g.columns.map((col, i) => ({ group: g.key, col, isFirst: i === 0 }))
    )
  }, [columnLayout])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir("desc")
    }
    setCurrentPage(1)
  }

  const fetchPlayers = useCallback(async () => {
    if (season === null && hasFetchedSeasons) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (position !== "ALL") params.set("position", position)
      if (team !== "ALL") params.set("team", team)
      if (season) params.set("season", season)
      if (week) params.set("week", week)
      params.set("sortBy", sortBy)
      params.set("sortDir", sortDir)
      params.set("limit", itemsPerPage.toString())
      params.set("offset", ((currentPage - 1) * itemsPerPage).toString())

      const res = await fetch(`/api/admin/connections/players?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.players)
        if (data.totalCount !== undefined) setTotalCount(data.totalCount)
        if (data.availableSeasons && !hasFetchedSeasons) {
          setAvailableSeasons(data.availableSeasons)
          setHasFetchedSeasons(true)
          if (data.availableSeasons.length > 0 && season === null) {
            setSeason(data.availableSeasons[0].toString())
            return
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, position, team, season, week, sortBy, sortDir, hasFetchedSeasons, currentPage, itemsPerPage])

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(fetchPlayers, 300)
    return () => clearTimeout(timeout)
  }, [fetchPlayers, open])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, position, team, season, week])

  useEffect(() => {
    if (!open) {
      setHasFetchedSeasons(false)
      setSeason(null)
      setWeek("")
      setCurrentPage(1)
      setDrawerWidth(COMPACT_WIDTH)
    }
  }, [open])

  const getPlayerStat = (player: PlayerResult, key: string): number => {
    return (player as unknown as Record<string, number>)[key] ?? 0
  }

  const sortedResults = useMemo(() => {
    if (sortBy !== "games") return results
    return [...results].sort((a, b) => {
      const avgA = a.games > 0 ? a.fantasyPoints / a.games : 0
      const avgB = b.games > 0 ? b.fantasyPoints / b.games : 0
      return sortDir === "asc" ? avgA - avgB : avgB - avgA
    })
  }, [results, sortBy, sortDir])

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setIsDragging(true)
  }, [])

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      e.stopPropagation()
      const maxW = window.innerWidth * 0.92
      const newWidth = Math.max(MIN_WIDTH, Math.min(maxW, window.innerWidth - e.clientX))
      setDrawerWidth(newWidth)
    },
    [isDragging]
  )

  const handleResizeEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      setIsDragging(false)
      const maxW = window.innerWidth * 0.92
      setDrawerWidth(
        drawerWidth >= EXPAND_THRESHOLD
          ? Math.min(EXPANDED_WIDTH, maxW)
          : COMPACT_WIDTH
      )
    },
    [isDragging, drawerWidth]
  )

  const toggleExpanded = useCallback(() => {
    const maxW = typeof window !== "undefined" ? window.innerWidth * 0.92 : EXPANDED_WIDTH
    setDrawerWidth(isExpanded ? COMPACT_WIDTH : Math.min(EXPANDED_WIDTH, maxW))
  }, [isExpanded])

  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 15,
  })

  const handlePlayerClick = useCallback(
    (player: PlayerResult) => {
      const isAdded = existingPlayerIds.has(player.playerId)
      if (isAdded) {
        onRemovePlayer?.(player.playerId)
      } else {
        onSelectPlayer({
          name: player.name,
          playerId: player.playerId,
          headshotUrl: player.headshotUrl,
        })
      }
    },
    [existingPlayerIds, onRemovePlayer, onSelectPlayer]
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="ml-auto h-full rounded-none !max-w-none flex flex-col"
        style={{
          width: `${drawerWidth}px`,
          transition: isDragging ? "none" : "width 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        aria-describedby={undefined}
      >
        {/* Resize handle */}
        <div
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-2 z-10 cursor-col-resize",
            "after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[2px]",
            "after:transition-colors after:duration-150",
            "hover:after:bg-primary/40",
            isDragging && "after:bg-primary/50"
          )}
        />

        {/* Header */}
        <DrawerHeader className="pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={toggleExpanded}
              title={isExpanded ? "Collapse panel" : "Expand for detailed stats"}
            >
              {isExpanded ? (
                <ChevronsRight className="h-5 w-5" />
              ) : (
                <ChevronsLeft className="h-5 w-5" />
              )}
            </Button>
            <DrawerTitle className="text-lg font-bold flex-1">Add Player</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        {/* Filters */}
        <div className="px-4 pb-3 shrink-0">
          {isExpanded ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex flex-col gap-1 w-[300px]">
                  <div className="text-xs font-semibold text-muted-foreground invisible">SEARCH</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search players..."
                      className="pl-9 pr-9"
                      autoComplete="off"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearch("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">STATS</label>
                  <Select value={statView} onValueChange={(v) => setStatView(v as StatView)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="passing">Passing</SelectItem>
                      <SelectItem value="rushing">Rushing</SelectItem>
                      <SelectItem value="receiving">Receiving</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 ml-auto">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">POSITION</label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger className="w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="QB">QB</SelectItem>
                        <SelectItem value="RB">RB</SelectItem>
                        <SelectItem value="WR">WR</SelectItem>
                        <SelectItem value="TE">TE</SelectItem>
                        <SelectItem value="K">K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {availableSeasons.length > 0 && season !== null && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-muted-foreground">SEASON</label>
                      <Select value={season} onValueChange={setSeason}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="!max-h-[500px]">
                          {availableSeasons.map((yr) => (
                            <SelectItem key={yr} value={yr.toString()}>
                              {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
                    <Select value={team} onValueChange={setTeam}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue>{getTeamFilterLabel(team)}</SelectValue>
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
                          {nflTeamsByName.map((t) => (
                            <SelectItem key={t.abbr} value={t.abbr}>{t.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">WEEK</label>
                    <Select value={week || "season"} onValueChange={(v) => setWeek(v === "season" ? "" : v)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="!max-h-[500px] min-w-[100px]">
                        <SelectItem value="season">Season</SelectItem>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                          <SelectItem key={w} value={w.toString()}>
                            Wk {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players..."
                  className="pl-9 pr-9"
                  autoComplete="off"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">POSITION</label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger className="w-[80px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="QB">QB</SelectItem>
                      <SelectItem value="RB">RB</SelectItem>
                      <SelectItem value="WR">WR</SelectItem>
                      <SelectItem value="TE">TE</SelectItem>
                      <SelectItem value="K">K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {availableSeasons.length > 0 && season !== null && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">SEASON</label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger className="w-[80px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="!max-h-[500px]">
                        {availableSeasons.map((yr) => (
                          <SelectItem key={yr} value={yr.toString()}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">WEEK</label>
                  <Select value={week || "season"} onValueChange={(v) => setWeek(v === "season" ? "" : v)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="!max-h-[500px] min-w-[100px]">
                      <SelectItem value="season">Season</SelectItem>
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                        <SelectItem key={w} value={w.toString()}>
                          Wk {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
                  <Select value={team} onValueChange={setTeam}>
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue>{getTeamFilterLabel(team)}</SelectValue>
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
                        {nflTeamsByName.map((t) => (
                          <SelectItem key={t.abbr} value={t.abbr}>{t.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {isExpanded ? (
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="border">
              <Table className="[&_tbody_tr]:border-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead colSpan={3 + (isWeekly ? 1 : 0)} className="text-center text-xs font-semibold">
                      PLAYER
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold w-12" />
                    <TableHead colSpan={2} className="text-center text-xs font-semibold">
                      FANTASY
                    </TableHead>
                    {columnLayout.groups.map((g) => (
                      <TableHead
                        key={g.key}
                        colSpan={g.columns.length}
                        className="text-center text-xs font-semibold table-cell"
                      >
                        {g.label}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="text-left font-medium w-48" title="Player Name">
                      Player
                    </TableHead>
                    <TableHead className="text-center w-16 font-medium" title="Position">POS</TableHead>
                    <TableHead className="text-center w-16 font-medium" title="Team">TEAM</TableHead>
                    {isWeekly && (
                      <TableHead className="text-center w-12 font-medium" title="Opponent">OPP</TableHead>
                    )}
                    <SortableTableHead
                      field="games"
                      label="G"
                      fullName="Games Played"
                      current={sortBy}
                      dir={sortDir}
                      onSort={handleSort}
                      className="w-12"
                    />
                    <SortableTableHead
                      field="fantasyPoints"
                      label="PTS"
                      fullName="Fantasy Points (PPR)"
                      current={sortBy}
                      dir={sortDir}
                      onSort={handleSort}
                      className="w-16"
                    />
                    <SortableTableHead
                      field="games"
                      label="AVG"
                      fullName="Points Per Game"
                      current={sortBy}
                      dir={sortDir}
                      onSort={handleSort}
                      className="w-16"
                    />
                    {allVisibleColumns.map(({ col, isFirst }) => (
                      <SortableTableHead
                        key={col.key}
                        field={col.key}
                        label={col.label}
                        fullName={col.fullName}
                        current={sortBy}
                        dir={sortDir}
                        onSort={handleSort}
                        className={cn("table-cell", isFirst && "pl-4")}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeletonRows colCount={allVisibleColumns.length} isWeekly={isWeekly} />
                  ) : sortedResults.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7 + (isWeekly ? 1 : 0) + allVisibleColumns.length}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No players found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedResults.map((player) => {
                      const isAdded = existingPlayerIds.has(player.playerId)
                      const avg = player.games > 0 ? player.fantasyPoints / player.games : 0
                      return (
                        <TableRow
                          key={`${player.playerId}-${player.season}`}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isAdded && "bg-primary/5"
                          )}
                          onClick={() => handlePlayerClick(player)}
                        >
                          <TableCell className="w-10 px-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-7 w-7",
                                isAdded && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlayerClick(player)
                              }}
                            >
                              {isAdded ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">
                                {player.headshotUrl ? (
                                  <img
                                    src={player.headshotUrl}
                                    alt=""
                                    className="h-9 w-9 -mt-1.5 -mb-1 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-9 w-9 -mt-1.5 -mb-1 rounded-full bg-muted" />
                                )}
                              </div>
                              <span className={cn(
                                "font-medium text-sm",
                                isAdded && "text-primary"
                              )}>
                                {player.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <PositionBadge position={player.position} />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground">{player.team}</span>
                          </TableCell>
                          {isWeekly && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {player.opponentTeam || "\u2014"}
                            </TableCell>
                          )}
                          <TableCell className="text-center text-xs">
                            {player.games || "\u2014"}
                          </TableCell>
                          <TableCell className="text-center font-medium tabular-nums">
                            {player.fantasyPoints > 0
                              ? player.fantasyPoints.toFixed(1)
                              : "\u2014"}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {avg > 0 ? avg.toFixed(1) : "\u2014"}
                          </TableCell>
                          {allVisibleColumns.map(({ col, isFirst }) => {
                            const value = getPlayerStat(player, col.key)
                            return (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  "text-center tabular-nums text-sm table-cell",
                                  isFirst && "pl-4"
                                )}
                              >
                                {formatStat(value, col.format)}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && totalCount > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size)
                  setCurrentPage(1)
                }}
              />
            )}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-auto">
              {loading ? (
                <CompactSkeletonRows />
              ) : sortedResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No players found
                </div>
              ) : (
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const player = sortedResults[virtualRow.index]
                    const isAdded = existingPlayerIds.has(player.playerId)
                    return (
                      <div
                        key={`${player.playerId}-${player.season}`}
                        className={cn(
                          "absolute left-0 right-0 flex items-center gap-3 px-4 py-1.5",
                          "cursor-pointer transition-colors hover:bg-muted/50",
                          isAdded && "bg-primary/5"
                        )}
                        style={{
                          top: virtualRow.start,
                          height: virtualRow.size,
                        }}
                      >
                        {player.headshotUrl ? (
                          <img
                            src={player.headshotUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium text-sm truncate", isAdded && "text-primary")}>
                            {player.name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PositionBadge position={player.position} />
                            <span className="text-xs text-muted-foreground">{player.team}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-7 w-7 shrink-0",
                            isAdded && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          )}
                          onClick={() => handlePlayerClick(player)}
                        >
                          {isAdded ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Compact footer */}
            <div className="px-4 py-3 border-t shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {totalCount} player{totalCount !== 1 ? "s" : ""}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
