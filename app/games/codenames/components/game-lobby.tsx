"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Copy,
  Check,
  Eye,
  Crosshair,
  Loader2,
  Gamepad2,
  Crown,
  LogOut,
  Users,
} from "lucide-react"
import type {
  CodenamesLobby,
  CodenamesSettings,
  TeamColor,
  PlayerRole,
  GameMode,
} from "@/lib/types/codenames"
import { TEAM_COLORS } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

interface GameLobbyProps {
  lobby: CodenamesLobby
  playerId: string
  send: (msg: object) => void
  onLeave: () => void
}

export function GameLobby({ lobby, playerId, send, onLeave }: GameLobbyProps) {
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const isHost = lobby.hostId === playerId
  const isDuet = lobby.settings.gameMode === "duet"

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(lobby.code)
    setCopied(true)
    toast.success("Code copied!")
    setTimeout(() => setCopied(false), 2000)
  }, [lobby.code])

  const updateSettings = useCallback(
    (settings: CodenamesSettings) => {
      send({ type: "update-settings", settings })
    },
    [send]
  )

  const joinSlot = useCallback(
    (team: TeamColor, role: PlayerRole) => {
      send({ type: "update-player", playerId, team, role })
    },
    [send, playerId]
  )

  const handleStart = useCallback(async () => {
    setIsStarting(true)
    try {
      const params = new URLSearchParams()
      params.set("players", lobby.settings.includePlayers.toString())
      params.set("teams", lobby.settings.includeTeams.toString())
      params.set("colleges", lobby.settings.includeCollegeTeams.toString())
      params.set("coaches", lobby.settings.includeCoaches.toString())

      const poolRes = await fetch(`/api/games/codenames/word-pool?${params}`)
      if (!poolRes.ok) throw new Error("Failed to fetch word pool")
      const { pool } = await poolRes.json()

      if (pool.length < 25) {
        toast.error("Not enough items in the word pool. Enable more content types.")
        setIsStarting(false)
        return
      }

      send({ type: "start", wordPool: pool })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start game")
    } finally {
      setIsStarting(false)
    }
  }, [lobby.settings, send])

  const redPlayers = lobby.players.filter((p) => p.team === "red")
  const bluePlayers = lobby.players.filter((p) => p.team === "blue")

  // Validation
  const hasMinPlayers = lobby.players.length >= 2
  const eachTeamHasPlayers = redPlayers.length > 0 && bluePlayers.length > 0
  const eachTeamHasSpymaster =
    redPlayers.some((p) => p.role === "spymaster") &&
    bluePlayers.some((p) => p.role === "spymaster")
  const canStart = isDuet
    ? hasMinPlayers && eachTeamHasPlayers
    : hasMinPlayers && eachTeamHasSpymaster && eachTeamHasPlayers

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Top bar: title + leave */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold underline">Codenames</h1>
        <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5">
          <LogOut className="size-3.5" />
          Leave
        </Button>
      </div>

      {/* Lobby code — large, copyable */}
      <div className="flex items-center justify-center mb-8">
        <button
          onClick={copyCode}
          className="flex items-center gap-3 px-6 py-3 border-3 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <span className="font-mono font-bold text-3xl sm:text-4xl tracking-[0.3em] text-primary">
            {lobby.code}
          </span>
          {copied ? (
            <Check className="size-6 text-primary" />
          ) : (
            <Copy className="size-6 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* 3-column layout: Blue | Settings | Red */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 mb-8">
        {/* Red team column */}
        <TeamColumn
          team="red"
          label={isDuet ? "Player A" : "Red Team"}
          players={redPlayers}
          playerId={playerId}
          isDuet={isDuet}
          lobbyHostId={lobby.hostId}
          onJoin={joinSlot}
        />

        {/* Settings column (center) */}
        <div className="w-full md:w-[260px] order-first md:order-none">
          {/* Mode tabs */}
          <div className="flex border-2 border-border mb-4">
            <ModeTab
              mode="classic"
              isActive={!isDuet}
              disabled={!isHost}
              onClick={() => isHost && updateSettings({ ...lobby.settings, gameMode: "classic" })}
            />
            <ModeTab
              mode="duet"
              isActive={isDuet}
              disabled={!isHost}
              onClick={() => isHost && updateSettings({ ...lobby.settings, gameMode: "duet" })}
            />
          </div>

          {/* Content toggles */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Board Content
            </p>
            <SettingToggle
              label="NFL Players"
              checked={lobby.settings.includePlayers}
              disabled={!isHost}
              onChange={(v) => updateSettings({ ...lobby.settings, includePlayers: v })}
            />
            <SettingToggle
              label="NFL Teams"
              checked={lobby.settings.includeTeams}
              disabled={!isHost}
              onChange={(v) => updateSettings({ ...lobby.settings, includeTeams: v })}
            />
            <SettingToggle
              label="Colleges"
              checked={lobby.settings.includeCollegeTeams}
              disabled={!isHost}
              onChange={(v) => updateSettings({ ...lobby.settings, includeCollegeTeams: v })}
            />
            <SettingToggle
              label="Coaches"
              checked={lobby.settings.includeCoaches}
              disabled={!isHost}
              onChange={(v) => updateSettings({ ...lobby.settings, includeCoaches: v })}
            />
          </div>

          {/* Player count */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
            <Users className="size-3.5" />
            {lobby.players.length}/6 players
          </div>
        </div>

        {/* Blue team column */}
        <TeamColumn
          team="blue"
          label={isDuet ? "Player B" : "Blue Team"}
          players={bluePlayers}
          playerId={playerId}
          isDuet={isDuet}
          lobbyHostId={lobby.hostId}
          onJoin={joinSlot}
        />
      </div>

      {/* Validation message */}
      {!canStart && isHost && (
        <p className="text-xs text-destructive text-center mb-3">
          {!hasMinPlayers
            ? "Need at least 2 players"
            : !eachTeamHasPlayers
              ? "Each team needs at least 1 player"
              : isDuet
                ? "Each side needs a player"
                : "Each team needs a spymaster"}
        </p>
      )}

      {/* Start button */}
      {isHost ? (
        <Button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className="btn-chamfer w-full h-12 text-base font-bold gap-2"
        >
          {isStarting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Gamepad2 className="size-5" />
          )}
          Start Game
        </Button>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  )
}

// ---- Mode tab ----

function ModeTab({
  mode,
  isActive,
  disabled,
  onClick,
}: {
  mode: GameMode
  isActive: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-muted-foreground hover:text-foreground",
        disabled && !isActive && "cursor-not-allowed opacity-50",
      )}
    >
      {mode === "classic" ? "Classic" : "Duet"}
    </button>
  )
}

// ---- Setting toggle ----

function SettingToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

// ---- Team column ----

function TeamColumn({
  team,
  label,
  players,
  playerId,
  isDuet,
  lobbyHostId,
  onJoin,
}: {
  team: TeamColor
  label: string
  players: import("@/lib/types/codenames").LobbyPlayer[]
  playerId: string
  isDuet: boolean
  lobbyHostId: string
  onJoin: (team: TeamColor, role: PlayerRole) => void
}) {
  const colors = TEAM_COLORS[team]
  const spymasters = players.filter((p) => p.role === "spymaster")
  const operatives = players.filter((p) => p.role === "operative")
  const meOnThisTeam = players.some((p) => p.id === playerId)

  return (
    <div className={cn(
      "border-2 overflow-hidden",
      colors.borderMuted,
    )}>
      {/* Team header */}
      <div className={cn("px-3 py-2.5", colors.bgMuted)}>
        <h3 className={cn("text-sm font-bold uppercase tracking-wider", colors.text)}>
          {label}
        </h3>
      </div>

      {isDuet ? (
        // Duet: single slot per side
        <div className="p-3">
          <RoleBucket
            label=""
            players={players}
            playerId={playerId}
            lobbyHostId={lobbyHostId}
            onJoin={() => onJoin(team, "operative")}
            showJoin={!meOnThisTeam}
          />
        </div>
      ) : (
        // Classic: spymaster + operative buckets
        <div className="p-3 space-y-3">
          <RoleBucket
            label="Spymaster"
            icon={<Eye className="size-3" />}
            players={spymasters}
            playerId={playerId}
            lobbyHostId={lobbyHostId}
            onJoin={() => onJoin(team, "spymaster")}
            showJoin={!spymasters.some((p) => p.id === playerId)}
          />
          <RoleBucket
            label="Operatives"
            icon={<Crosshair className="size-3" />}
            players={operatives}
            playerId={playerId}
            lobbyHostId={lobbyHostId}
            onJoin={() => onJoin(team, "operative")}
            showJoin={!operatives.some((p) => p.id === playerId)}
          />
        </div>
      )}
    </div>
  )
}

// ---- Role bucket ----

function RoleBucket({
  label,
  icon,
  players,
  playerId,
  lobbyHostId,
  onJoin,
  showJoin,
}: {
  label: string
  icon?: React.ReactNode
  players: import("@/lib/types/codenames").LobbyPlayer[]
  playerId: string
  lobbyHostId: string
  onJoin: () => void
  showJoin: boolean
}) {
  return (
    <div>
      {label && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
          {icon} {label}
        </p>
      )}
      <div className="border border-dashed border-border/60 min-h-[40px] p-2 space-y-1.5">
        {players.map((p) => (
          <div key={p.id} className={cn(
            "flex items-center gap-2 text-sm",
            p.id === playerId && "text-primary font-bold",
          )}>
            <span className="truncate flex-1">{p.name}</span>
            {p.id === lobbyHostId && <Crown className="size-3 text-amber-500 shrink-0" />}
            {p.id === playerId && (
              <span className="text-[9px] text-primary/70 uppercase tracking-widest shrink-0">(you)</span>
            )}
          </div>
        ))}
        {players.length === 0 && showJoin && (
          <button
            onClick={onJoin}
            className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors uppercase tracking-wider font-medium"
          >
            Join
          </button>
        )}
        {players.length > 0 && showJoin && (
          <button
            onClick={onJoin}
            className="w-full py-1 text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-colors uppercase tracking-wider"
          >
            Move here
          </button>
        )}
      </div>
    </div>
  )
}
