"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, X, Plus, ChevronUp, ChevronDown } from "lucide-react"
import {
  nflTeamsByName,
  nflDivisions,
  nflConferences,
  getTeamFilterLabel,
} from "@/lib/team-utils"
import type { ConnectionsPlayer } from "@/lib/types/connections"

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
  fantasyPoints: number
  passingAttempts: number
  completions: number
  passingYards: number
  passingTds: number
  passingInterceptions: number
  sacks: number
  passingEpa: number
  carries: number
  rushingYards: number
  rushingTds: number
  rushingFumbles: number
  rushingEpa: number
  targets: number
  receptions: number
  receivingYards: number
  receivingTds: number
  receivingYac: number
  receivingEpa: number
}

type SortField = keyof Omit<PlayerResult, "name" | "playerId" | "position" | "team" | "season" | "headshotUrl" | "college" | "yearsExp" | "jerseyNumber" | "opponentTeam">
type SortDir = "asc" | "desc"

interface ColumnDef {
  key: SortField
  label: string
  fullName: string
  format?: (v: number) => string
}

const passingColumns: ColumnDef[] = [
  { key: "passingAttempts", label: "ATT", fullName: "Pass Attempts" },
  { key: "completions", label: "COMP", fullName: "Completions" },
  { key: "passingYards", label: "YD", fullName: "Passing Yards" },
  { key: "passingTds", label: "TD", fullName: "Passing Touchdowns" },
  { key: "passingInterceptions", label: "INT", fullName: "Interceptions" },
  { key: "sacks", label: "SACK", fullName: "Sacks" },
  { key: "passingEpa", label: "EPA", fullName: "Passing EPA", format: (v) => v.toFixed(1) },
]

const rushingColumns: ColumnDef[] = [
  { key: "carries", label: "ATT", fullName: "Rush Attempts" },
  { key: "rushingYards", label: "YD", fullName: "Rushing Yards" },
  { key: "rushingTds", label: "TD", fullName: "Rushing Touchdowns" },
  { key: "rushingFumbles", label: "FUM", fullName: "Fumbles" },
  { key: "rushingEpa", label: "EPA", fullName: "Rushing EPA", format: (v) => v.toFixed(1) },
]

const receivingColumns: ColumnDef[] = [
  { key: "targets", label: "TAR", fullName: "Targets" },
  { key: "receptions", label: "REC", fullName: "Receptions" },
  { key: "receivingYards", label: "YD", fullName: "Receiving Yards" },
  { key: "receivingTds", label: "TD", fullName: "Receiving Touchdowns" },
  { key: "receivingYac", label: "YAC", fullName: "Yards After Catch" },
  { key: "receivingEpa", label: "EPA", fullName: "Receiving EPA", format: (v) => v.toFixed(1) },
]

type StatGroupKey = "passing" | "rushing" | "receiving"

const STAT_GROUPS: Record<StatGroupKey, { label: string; columns: ColumnDef[] }> = {
  passing: { label: "Passing", columns: passingColumns },
  rushing: { label: "Rushing", columns: rushingColumns },
  receiving: { label: "Receiving", columns: receivingColumns },
}

function getDefaultGroups(position: string): Set<StatGroupKey> {
  switch (position) {
    case "QB": return new Set(["passing", "rushing"])
    case "RB": return new Set(["rushing", "receiving"])
    case "WR":
    case "TE": return new Set(["receiving"])
    default: return new Set(["passing", "rushing", "receiving"])
  }
}

interface PlayerSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPlayer: (player: ConnectionsPlayer) => void
  existingPlayerIds: Set<string>
}

function SortableHeader({
  field,
  label,
  fullName,
  current,
  dir,
  onSort,
}: {
  field: SortField
  label: string
  fullName?: string
  current: SortField
  dir: SortDir
  onSort: (field: SortField) => void
}) {
  const isActive = current === field
  return (
    <th className="px-1.5 py-1.5 font-medium text-right whitespace-nowrap">
      <button
        onClick={() => onSort(field)}
        className="hover:text-foreground transition-colors font-medium"
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
    </th>
  )
}

export function PlayerSearch({
  open,
  onOpenChange,
  onSelectPlayer,
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
  const [activeGroups, setActiveGroups] = useState<Set<StatGroupKey>>(
    new Set(["passing", "rushing", "receiving"])
  )

  const isWeekly = week !== ""

  // Update active stat groups when position changes
  useEffect(() => {
    if (position !== "ALL") {
      setActiveGroups(getDefaultGroups(position))
    }
  }, [position])

  const toggleGroup = (key: StatGroupKey) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const visibleColumns = useMemo(() => {
    const cols: { group: StatGroupKey; col: ColumnDef; isFirst: boolean }[] = []
    for (const key of (["passing", "rushing", "receiving"] as const)) {
      if (!activeGroups.has(key)) continue
      const group = STAT_GROUPS[key]
      group.columns.forEach((col, i) => {
        cols.push({ group: key, col, isFirst: i === 0 })
      })
    }
    return cols
  }, [activeGroups])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir("desc")
    }
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

      const res = await fetch(`/api/admin/connections/players?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.players)
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
  }, [search, position, team, season, week, sortBy, sortDir, hasFetchedSeasons])

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(fetchPlayers, 300)
    return () => clearTimeout(timeout)
  }, [fetchPlayers, open])

  useEffect(() => {
    if (!open) {
      setHasFetchedSeasons(false)
      setSeason(null)
      setWeek("")
    }
  }, [open])

  const getPlayerStat = (player: PlayerResult, key: string): number => {
    return (player as unknown as Record<string, number>)[key] ?? 0
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="max-h-[92vh] flex flex-col">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Add Player</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-3 flex flex-col gap-3">
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full sm:max-w-sm">
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

            <div className="flex gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  POSITION
                </label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="QB">QB</SelectItem>
                    <SelectItem value="RB">RB</SelectItem>
                    <SelectItem value="WR">WR</SelectItem>
                    <SelectItem value="TE">TE</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  TEAM
                </label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue>{getTeamFilterLabel(team)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">
                        Conferences
                      </SelectLabel>
                      {nflConferences.map((conf) => (
                        <SelectItem key={conf} value={conf}>
                          {conf}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">
                        Divisions
                      </SelectLabel>
                      {nflDivisions.map((div) => (
                        <SelectItem key={div} value={div}>
                          {div}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">
                        Teams
                      </SelectLabel>
                      {nflTeamsByName.map((t) => (
                        <SelectItem key={t.abbr} value={t.abbr}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {availableSeasons.length > 0 && season !== null && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    SEASON
                  </label>
                  <Select value={season} onValueChange={setSeason}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <label className="text-xs font-semibold text-muted-foreground">
                  WEEK
                </label>
                <Select value={week || "season"} onValueChange={(v) => setWeek(v === "season" ? "" : v)}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

          {/* Stat group toggles */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold mr-1">
              STATS:
            </span>
            {(["passing", "rushing", "receiving"] as const).map((key) => (
              <button
                key={key}
                onClick={() => toggleGroup(key)}
                className={`
                  px-2.5 py-1 text-xs font-semibold transition-colors border-3
                  ${activeGroups.has(key)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                  }
                `}
              >
                {STAT_GROUPS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Results table */}
        <div className="flex-1 overflow-auto px-4 pb-4">
          <div className="border-3 border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  {/* Group header row */}
                  <tr className="border-b border-border bg-muted/80 backdrop-blur-sm">
                    <th className="sticky left-0 bg-muted/80 backdrop-blur-sm z-20 w-8" />
                    <th
                      className="sticky bg-muted/80 backdrop-blur-sm z-20 text-center text-xs font-semibold px-2 py-1"
                      style={{ left: "32px" }}
                      colSpan={2 + (isWeekly ? 1 : 0)}
                    >
                      PLAYER
                    </th>
                    <th className="text-center text-xs font-semibold px-2 py-1">
                      FPTS
                    </th>
                    {(["passing", "rushing", "receiving"] as const)
                      .filter((k) => activeGroups.has(k))
                      .map((k) => (
                        <th
                          key={k}
                          colSpan={STAT_GROUPS[k].columns.length}
                          className="text-center text-xs font-semibold px-2 py-1"
                        >
                          {STAT_GROUPS[k].label.toUpperCase()}
                        </th>
                      ))}
                  </tr>
                  {/* Column header row */}
                  <tr className="border-b-3 border-border bg-muted/80 backdrop-blur-sm">
                    <th className="sticky left-0 bg-muted/80 backdrop-blur-sm z-20 w-8" />
                    <th
                      className="sticky bg-muted/80 backdrop-blur-sm z-20 text-left px-2 py-1.5 font-medium min-w-[160px]"
                      style={{ left: "32px" }}
                    >
                      <button
                        onClick={() => handleSort("fantasyPoints")}
                        className="hover:text-foreground transition-colors font-medium"
                      >
                        Player
                      </button>
                    </th>
                    <th className="text-center px-1.5 py-1.5 font-medium w-12">
                      TEAM
                    </th>
                    {isWeekly && (
                      <th className="text-center px-1.5 py-1.5 font-medium w-10">
                        OPP
                      </th>
                    )}
                    <SortableHeader
                      field="fantasyPoints"
                      label="PTS"
                      fullName="Fantasy Points (PPR)"
                      current={sortBy}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    {visibleColumns.map(({ col, isFirst }) => (
                      <SortableHeader
                        key={col.key}
                        field={col.key}
                        label={col.label}
                        fullName={col.fullName}
                        current={sortBy}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-2 py-2">
                            <Skeleton className="h-4 w-4" />
                          </td>
                          <td className="px-2 py-2">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-2 py-2">
                            <Skeleton className="h-4 w-8" />
                          </td>
                          {isWeekly && (
                            <td className="px-2 py-2">
                              <Skeleton className="h-4 w-8" />
                            </td>
                          )}
                          <td className="px-2 py-2">
                            <Skeleton className="h-4 w-10" />
                          </td>
                          {visibleColumns.map(({ col }) => (
                            <td key={col.key} className="px-2 py-2">
                              <Skeleton className="h-4 w-8" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : results.map((player) => {
                        const isAdded = existingPlayerIds.has(player.playerId)
                        return (
                          <tr
                            key={`${player.playerId}-${player.season}`}
                            className={`
                              border-b border-border/50 transition-colors
                              ${isAdded ? "opacity-40" : "hover:bg-muted/50 cursor-pointer"}
                            `}
                            onClick={() => {
                              if (isAdded) return
                              onSelectPlayer({
                                name: player.name,
                                playerId: player.playerId,
                                headshotUrl: player.headshotUrl,
                              })
                            }}
                          >
                            <td className="sticky left-0 bg-background px-2 py-1.5 text-center z-10">
                              {isAdded ? (
                                <span className="text-muted-foreground text-[10px]">
                                  ✓
                                </span>
                              ) : (
                                <Plus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                            <td
                              className="sticky bg-background px-2 py-1.5 z-10"
                              style={{ left: "32px" }}
                            >
                              <div className="flex items-center gap-2">
                                {player.headshotUrl ? (
                                  <img
                                    src={player.headshotUrl}
                                    alt=""
                                    className="h-8 w-8 -mt-1 -mb-0.5 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-8 w-8 -mt-1 -mb-0.5 rounded-full bg-muted shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className="font-medium truncate block text-xs">
                                    {player.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {player.position}
                                    {player.jerseyNumber != null && ` #${player.jerseyNumber}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 text-center text-xs text-muted-foreground">
                              {player.team}
                            </td>
                            {isWeekly && (
                              <td className="px-1.5 py-1.5 text-center text-xs text-muted-foreground">
                                {player.opponentTeam || "—"}
                              </td>
                            )}
                            <td className="px-1.5 py-1.5 text-right font-medium tabular-nums text-xs">
                              {player.fantasyPoints > 0
                                ? player.fantasyPoints.toFixed(1)
                                : "—"}
                            </td>
                            {visibleColumns.map(({ col }) => {
                              const value = getPlayerStat(player, col.key)
                              const formatted = col.format
                                ? col.format(value)
                                : value || "—"
                              return (
                                <td
                                  key={col.key}
                                  className="px-1.5 py-1.5 text-right tabular-nums text-xs"
                                >
                                  {formatted}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>

            {!loading && results.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No players found
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
