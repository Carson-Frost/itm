"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Search, Plus, X } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PositionBadge } from "@/components/position-badge"
import { FantasyPosition, SleeperADP, ScoringFormat } from "@/lib/types/ranking-schemas"

interface AddPlayerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingPlayerIds: Set<string>
  positions: FantasyPosition[]
  scoring: ScoringFormat
  onAddPlayer: (player: {
    playerId: string
    name: string
    position: FantasyPosition
    team: string
    headshotUrl?: string
  }) => void
}

export function AddPlayerDrawer({
  open,
  onOpenChange,
  existingPlayerIds,
  positions,
  scoring,
  onAddPlayer,
}: AddPlayerDrawerProps) {
  const [adpData, setAdpData] = useState<SleeperADP[] | null>(null)
  const [search, setSearch] = useState("")
  const [filterPos, setFilterPos] = useState<FantasyPosition | "All">("All")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch ADP data once when drawer opens
  useEffect(() => {
    if (!open || adpData) return
    async function fetchAdp() {
      try {
        const res = await fetch("/api/sleeper/adp")
        const data = await res.json()
        setAdpData(data.adp ?? [])
      } catch {
        // silent
      }
    }
    fetchAdp()
  }, [open, adpData])

  // Reset search/filter when drawer opens
  useEffect(() => {
    if (open) {
      setSearch("")
      setFilterPos("All")
    }
  }, [open])

  const availablePlayers = useMemo(() => {
    if (!adpData) return []

    let players = adpData.filter(
      (p) =>
        positions.includes(p.position as FantasyPosition) &&
        !existingPlayerIds.has(p.player_id)
    )

    if (filterPos !== "All") {
      players = players.filter((p) => p.position === filterPos)
    }

    if (search) {
      const q = search.toLowerCase()
      players = players.filter((p) => p.player_name.toLowerCase().includes(q))
    }

    // Sort by ADP
    players.sort((a, b) => {
      if (scoring === "PPR") return a.adp_ppr - b.adp_ppr
      if (scoring === "Half") return a.adp_half_ppr - b.adp_half_ppr
      return a.adp_std - b.adp_std
    })

    return players
  }, [adpData, existingPlayerIds, positions, scoring, filterPos, search])

  const virtualizer = useVirtualizer({
    count: availablePlayers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const handleAdd = useCallback(
    (player: SleeperADP) => {
      onAddPlayer({
        playerId: player.player_id,
        name: player.player_name,
        position: player.position as FantasyPosition,
        team: player.team,
        headshotUrl: player.headshot_url || undefined,
      })
    },
    [onAddPlayer]
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="ml-auto h-full w-[400px] max-w-[90vw] rounded-none"
        aria-describedby={undefined}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle>Add Player</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players"
              autoComplete="off"
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {positions.length > 1 && (
            <Tabs value={filterPos} onValueChange={(v) => setFilterPos(v as FantasyPosition | "All")}>
              <TabsList className="w-full">
                <TabsTrigger value="All" className="flex-1 text-xs">All</TabsTrigger>
                {positions.map((pos) => (
                  <TabsTrigger key={pos} value={pos} className="flex-1 text-xs">
                    {pos}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-4">
          {!adpData ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : availablePlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No players available</div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const player = availablePlayers[virtualRow.index]
                return (
                  <div
                    key={player.player_id}
                    className="absolute left-0 right-0 flex items-center gap-3 px-2 py-2 hover:bg-accent/50 rounded-sm"
                    style={{
                      top: virtualRow.start,
                      height: virtualRow.size,
                    }}
                  >
                    {player.headshot_url ? (
                      <img
                        src={player.headshot_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{player.player_name}</div>
                      <div className="flex items-center gap-1.5">
                        <PositionBadge position={player.position} />
                        <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleAdd(player)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t text-xs text-muted-foreground">
          {availablePlayers.length} player{availablePlayers.length !== 1 ? "s" : ""} available
        </div>
      </DrawerContent>
    </Drawer>
  )
}
