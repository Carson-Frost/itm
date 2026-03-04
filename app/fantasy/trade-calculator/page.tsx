"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PositionBadge } from "@/components/position-badge"
import { ScoringBadge, QBFormatBadge, TEPremiumBadge } from "@/components/format-badge"
import {
  FantasyPosition,
  SleeperADP,
  ScoringFormat,
  RankingType,
  QBFormat,
} from "@/lib/types/ranking-schemas"
import { Search, Plus, TrendingUp, TrendingDown, Minus, X } from "lucide-react"
import { XButton } from "@/components/x-button"
import { PlayerCard } from "@/app/fantasy/charts/components/player-card"
import { Player, Position } from "@/lib/types/player"
import { cn } from "@/lib/utils"

interface TradePlayer {
  playerId: string
  name: string
  position: FantasyPosition
  team: string
  headshotUrl?: string
  adp?: number
}

interface TradeSideProps {
  title: string
  players: TradePlayer[]
  onRemovePlayer: (playerId: string) => void
  onAddPlayer: (player: TradePlayer) => void
  onPlayerClick: (player: TradePlayer) => void
  score: number
  isWinner?: boolean
  isLoser?: boolean
  search: string
  onSearchChange: (search: string) => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  existingPlayerIds: Set<string>
  scoring: ScoringFormat
}

function TradeSide({
  title,
  players,
  onRemovePlayer,
  onAddPlayer,
  onPlayerClick,
  score,
  isWinner,
  isLoser,
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  existingPlayerIds,
  scoring,
}: TradeSideProps) {
  const [adpData, setAdpData] = useState<SleeperADP[] | null>(null)

  useEffect(() => {
    if (adpData) return
    async function fetchAdp() {
      try {
        const res = await fetch("/api/sleeper/adp")
        const data = await res.json()
        setAdpData(data.adp ?? [])
      } catch {
        setAdpData([])
      }
    }
    fetchAdp()
  }, [adpData])

  const availablePlayers = useMemo(() => {
    if (!adpData) return []

    let players = adpData.filter((p) => !existingPlayerIds.has(p.player_id))

    if (search.trim()) {
      const q = search.toLowerCase()
      players = players.filter((p) => p.player_name.toLowerCase().includes(q))
    }

    players.sort((a, b) => {
      if (scoring === "PPR") return a.adp_ppr - b.adp_ppr
      if (scoring === "Half") return a.adp_half_ppr - b.adp_half_ppr
      return a.adp_std - b.adp_std
    })

    return players.slice(0, 50)
  }, [adpData, existingPlayerIds, scoring, search])

  return (
    <div className="flex flex-col h-full">
      <Popover open={searchOpen} onOpenChange={onSearchOpenChange}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Add players..."
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
                    onSearchChange("")
                  }}
                />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="max-h-[300px] overflow-auto">
            {!adpData ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : availablePlayers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No players found</div>
            ) : (
              availablePlayers.map((player) => {
                const adpValue = scoring === "PPR" ? player.adp_ppr : scoring === "Half" ? player.adp_half_ppr : player.adp_std
                return (
                  <button
                    key={player.player_id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 text-left"
                    onClick={() => onAddPlayer({
                      playerId: player.player_id,
                      name: player.player_name,
                      position: player.position as FantasyPosition,
                      team: player.team,
                      headshotUrl: player.headshot_url || undefined,
                      adp: adpValue,
                    })}
                  >
                    {player.headshot_url ? (
                      <img src={player.headshot_url} alt="" className="h-9 w-9 rounded-sm object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-sm bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{player.player_name}</div>
                      <div className="flex items-center gap-1.5">
                        <PositionBadge position={player.position} size="compact" />
                        <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold font-mono min-w-[44px] text-right">
                      100
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Added players list */}
      <div className="mt-3 flex-1 space-y-1">
        {players.length > 0 && players.map((player) => (
          <div
            key={player.playerId}
            className="flex items-center justify-between gap-4 px-4 py-2 bg-card border rounded-sm"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {player.headshotUrl ? (
                <img src={player.headshotUrl} alt="" className="w-12 h-12 rounded-sm object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-sm bg-muted shrink-0" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayerClick(player)
                }}
                className="text-left min-w-0"
              >
                <div className="font-semibold text-base truncate hover:underline leading-tight">
                  {player.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PositionBadge position={player.position} size="compact" />
                  <span className="text-xs text-muted-foreground">{player.team || "FA"}</span>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right min-w-[48px]">
                <div className="text-lg font-bold font-mono">100</div>
              </div>
              <XButton
                variant="destructive"
                size="sm"
                onClick={() => onRemovePlayer(player.playerId)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary section - always visible */}
      <div className="flex items-center justify-between px-4 py-2 mt-2 bg-muted/30 border-t border-border/50 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-medium">{players.length} Total Pieces</span>
          {["QB", "RB", "WR", "TE"].map((pos) => {
            const count = players.filter(p => p.position === pos).length
            return count > 0 ? (
              <span key={pos} className="text-muted-foreground">
                {count} {pos}
              </span>
            ) : null
          })}
        </div>
        <div className="font-bold font-mono">{score}</div>
      </div>
    </div>
  )
}

export default function TradeCalculator() {
  const [type, setType] = useState<RankingType>("dynasty")
  const [scoring, setScoring] = useState<ScoringFormat>("Half")
  const [qbFormat, setQbFormat] = useState<QBFormat>("superflex")
  const [tePremium, setTePremium] = useState<number>(0.5)
  const [activeRanking, setActiveRanking] = useState<"sleeper-adp" | "itm" | "import">("sleeper-adp")

  const [teamAPlayers, setTeamAPlayers] = useState<TradePlayer[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<TradePlayer[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const [teamASearch, setTeamASearch] = useState("")
  const [teamBSearch, setTeamBSearch] = useState("")
  const [teamASearchOpen, setTeamASearchOpen] = useState(false)
  const [teamBSearchOpen, setTeamBSearchOpen] = useState(false)

  const existingPlayerIds = useMemo(() => {
    const ids = new Set<string>()
    teamAPlayers.forEach(p => ids.add(p.playerId))
    teamBPlayers.forEach(p => ids.add(p.playerId))
    return ids
  }, [teamAPlayers, teamBPlayers])

  const calculateScore = (players: TradePlayer[]) => {
    return players.length * 100
  }

  const teamAScore = calculateScore(teamAPlayers)
  const teamBScore = calculateScore(teamBPlayers)

  const handleAddPlayer = (player: TradePlayer, team: "A" | "B") => {
    if (team === "A") {
      setTeamAPlayers(prev => [...prev, player])
      setTeamASearch("")
      setTeamASearchOpen(false)
    } else {
      setTeamBPlayers(prev => [...prev, player])
      setTeamBSearch("")
      setTeamBSearchOpen(false)
    }
  }

  const clearTrade = () => {
    setTeamAPlayers([])
    setTeamBPlayers([])
  }

  const handlePlayerClick = (tp: TradePlayer) => {
    const player: Player = {
      id: tp.playerId,
      playerId: tp.playerId,
      rank: 0,
      name: tp.name,
      position: tp.position as Position,
      team: tp.team,
      gamesPlayed: 0,
      fantasyPoints: 0,
      fantasyPointsPPR: 0,
      pointsPerGame: 0,
      headshotUrl: tp.headshotUrl,
    }
    setSelectedPlayer(player)
  }

  const winner = teamAScore > teamBScore ? "A" : teamBScore > teamAScore ? "B" : null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          {/* Header with settings */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold underline mb-3">Trade Calculator</h1>

            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">RANKING</label>
                <Select value={activeRanking} onValueChange={(v) => setActiveRanking(v as typeof activeRanking)}>
                  <SelectTrigger className="h-9 text-sm w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sleeper-adp">Sleeper ADP</SelectItem>
                    <SelectItem value="itm" disabled>
                      ITM Rankings
                      <span className="text-muted-foreground ml-1">(Soon)</span>
                    </SelectItem>
                    <SelectItem value="import">Import...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">TYPE</label>
                    <Select value={type} onValueChange={(v) => setType(v as RankingType)}>
                      <SelectTrigger className="h-9 text-sm w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="redraft">Redraft</SelectItem>
                        <SelectItem value="dynasty">Dynasty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">SCORING</label>
                    <Select value={scoring} onValueChange={(v) => setScoring(v as ScoringFormat)}>
                      <SelectTrigger className="h-9 text-sm w-[90px]">
                        <SelectValue>
                          <ScoringBadge scoring={scoring} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PPR">
                          <ScoringBadge scoring="PPR" />
                        </SelectItem>
                        <SelectItem value="Half">
                          <ScoringBadge scoring="Half" />
                        </SelectItem>
                        <SelectItem value="STD">
                          <ScoringBadge scoring="STD" />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">QB FORMAT</label>
                    <Select value={qbFormat} onValueChange={(v) => setQbFormat(v as QBFormat)}>
                      <SelectTrigger className="h-9 text-sm w-[90px]">
                        <SelectValue>
                          <QBFormatBadge qbFormat={qbFormat} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1qb">
                          <QBFormatBadge qbFormat="1qb" />
                        </SelectItem>
                        <SelectItem value="superflex">
                          <QBFormatBadge qbFormat="superflex" />
                        </SelectItem>
                        <SelectItem value="2qb">
                          <QBFormatBadge qbFormat="2qb" />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground">TE PREMIUM</label>
                    <Select value={String(tePremium)} onValueChange={(v) => setTePremium(Number(v))}>
                      <SelectTrigger className="h-9 text-sm w-[110px]">
                        <SelectValue>
                          <TEPremiumBadge tePremium={tePremium} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">
                          <TEPremiumBadge tePremium={0} />
                        </SelectItem>
                        <SelectItem value="0.5">
                          <TEPremiumBadge tePremium={0.5} />
                        </SelectItem>
                        <SelectItem value="1">
                          <TEPremiumBadge tePremium={1} />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Sides */}
          <div className="grid grid-cols-2 gap-4">
            <TradeSide
              title="Team A"
              players={teamAPlayers}
              onRemovePlayer={(id) => setTeamAPlayers(prev => prev.filter(p => p.playerId !== id))}
              onAddPlayer={(player) => handleAddPlayer(player, "A")}
              onPlayerClick={handlePlayerClick}
              score={teamAScore}
              isWinner={winner === "A"}
              isLoser={winner === "B"}
              search={teamASearch}
              onSearchChange={setTeamASearch}
              searchOpen={teamASearchOpen}
              onSearchOpenChange={setTeamASearchOpen}
              existingPlayerIds={existingPlayerIds}
              scoring={scoring}
            />
            <TradeSide
              title="Team B"
              players={teamBPlayers}
              onRemovePlayer={(id) => setTeamBPlayers(prev => prev.filter(p => p.playerId !== id))}
              onAddPlayer={(player) => handleAddPlayer(player, "B")}
              onPlayerClick={handlePlayerClick}
              score={teamBScore}
              isWinner={winner === "B"}
              isLoser={winner === "A"}
              search={teamBSearch}
              onSearchChange={setTeamBSearch}
              searchOpen={teamBSearchOpen}
              onSearchOpenChange={setTeamBSearchOpen}
              existingPlayerIds={existingPlayerIds}
              scoring={scoring}
            />
          </div>

          {/* Trade Analysis - bottom bar */}
          <div className="mt-4 px-4">
            <div className="relative h-8 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-muted" />
              <div
                className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
                style={{
                  width: "50%",
                  backgroundColor: winner === "A" ? "rgb(34 197 94)" : "rgb(113 113 122)",
                  opacity: winner === "A" ? 1 : 0.5
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 transition-all duration-500 ease-out"
                style={{
                  width: "50%",
                  backgroundColor: winner === "B" ? "rgb(239 68 68)" : "rgb(113 113 122)",
                  opacity: winner === "B" ? 1 : 0.5
                }}
              />
              {teamAPlayers.length > 0 || teamBPlayers.length > 0 ? (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-foreground transition-all duration-500 ease-out"
                  style={{
                    left: `${50 - ((teamAScore - teamBScore) / ((teamAScore + teamBScore) || 1)) * 50}%`,
                    transform: "translateX(-50%)"
                  }}
                />
              ) : (
                <div className="absolute top-0 bottom-0 w-1 bg-foreground/50" style={{ left: "50%", transform: "translateX(-50%)" }} />
              )}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold">A</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold">B</span>
            </div>
            {teamAPlayers.length > 0 || teamBPlayers.length > 0 ? (
              <div className="text-center text-xs mt-1">
                {winner ? (
                  <span className={winner === "A" ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                    Team {winner} wins by <span className="font-mono">{Math.abs(teamAScore - teamBScore)}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Even Trade</span>
                )}
              </div>
            ) : (
              <div className="text-center text-xs mt-1 text-muted-foreground">
                Add players to analyze
              </div>
            )}
          </div>

          {/* Clear button - centered below analysis bar */}
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={clearTrade} size="default">
              Clear Calculator
              <X className="size-4.5" />
            </Button>
          </div>
        </div>
      </main>

      <PlayerCard
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        initialSeason={2025}
      />
    </div>
  )
}
