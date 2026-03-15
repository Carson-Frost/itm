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

  const hasMinPlayers = lobby.players.length >= 2
  const eachTeamHasPlayers = redPlayers.length > 0 && bluePlayers.length > 0
  const eachTeamHasSpymaster =
    redPlayers.some((p) => p.role === "spymaster") &&
    bluePlayers.some((p) => p.role === "spymaster")
  const canStart = isDuet
    ? hasMinPlayers && eachTeamHasPlayers
    : hasMinPlayers && eachTeamHasSpymaster && eachTeamHasPlayers

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold underline">Codenames</h1>
        <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5">
          <LogOut className="size-3.5" />
          Leave
        </Button>
      </div>

      {/* Lobby code */}
      <div className="flex flex-col items-center mb-10">
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Share this code to invite players</p>
        <button
          onClick={copyCode}
          className="flex items-center gap-3 px-8 py-4 bg-card border hover:bg-muted/30 transition-colors"
        >
          <span className="font-mono font-bold text-4xl sm:text-5xl tracking-[0.4em] text-primary">
            {lobby.code}
          </span>
          {copied ? (
            <Check className="size-6 text-primary" />
          ) : (
            <Copy className="size-6 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-muted/30 p-1">
          <ModeButton
            label="Classic"
            isActive={!isDuet}
            disabled={!isHost}
            onClick={() => isHost && updateSettings({ ...lobby.settings, gameMode: "classic" })}
          />
          <ModeButton
            label="Duet"
            isActive={isDuet}
            disabled={!isHost}
            onClick={() => isHost && updateSettings({ ...lobby.settings, gameMode: "duet" })}
          />
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_1fr] gap-4 md:gap-5 mb-8">
        {/* Red / Player A */}
        <TeamColumn
          team="red"
          label={isDuet ? "Player A" : "Red Team"}
          players={redPlayers}
          playerId={playerId}
          isDuet={isDuet}
          lobbyHostId={lobby.hostId}
          onJoin={joinSlot}
        />

        {/* Settings */}
        <div className="order-first md:order-none bg-card border p-4">
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium mb-4">
            Board Content
          </p>
          <div className="space-y-3.5">
            <SettingToggle label="NFL Players" checked={lobby.settings.includePlayers} disabled={!isHost} onChange={(v) => updateSettings({ ...lobby.settings, includePlayers: v })} />
            <SettingToggle label="NFL Teams" checked={lobby.settings.includeTeams} disabled={!isHost} onChange={(v) => updateSettings({ ...lobby.settings, includeTeams: v })} />
            <SettingToggle label="Colleges" checked={lobby.settings.includeCollegeTeams} disabled={!isHost} onChange={(v) => updateSettings({ ...lobby.settings, includeCollegeTeams: v })} />
            <SettingToggle label="Coaches" checked={lobby.settings.includeCoaches} disabled={!isHost} onChange={(v) => updateSettings({ ...lobby.settings, includeCoaches: v })} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-5 pt-4 border-t">
            <Users className="size-4" />
            {lobby.players.length} player{lobby.players.length !== 1 ? "s" : ""} in lobby
          </div>
        </div>

        {/* Blue / Player B */}
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

      {/* Validation */}
      {!canStart && isHost && (
        <p className="text-sm text-destructive text-center mb-3">
          {!hasMinPlayers ? "Need at least 2 players"
            : !eachTeamHasPlayers ? "Each team needs at least 1 player"
            : isDuet ? "Each side needs a player" : "Each team needs a spymaster"}
        </p>
      )}

      {/* Start */}
      {isHost ? (
        <Button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className="btn-chamfer w-full h-12 text-base font-bold gap-2"
        >
          {isStarting ? <Loader2 className="size-5 animate-spin" /> : <Gamepad2 className="size-5" />}
          Start Game
        </Button>
      ) : (
        <div className="text-center py-4 text-base text-muted-foreground">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function ModeButton({ label, isActive, disabled, onClick }: { label: string; isActive: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-5 py-2 text-sm font-bold transition-all",
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        disabled && !isActive && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  )
}

function SettingToggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-base">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

function TeamColumn({ team, label, players, playerId, isDuet, lobbyHostId, onJoin }: {
  team: TeamColor; label: string; players: import("@/lib/types/codenames").LobbyPlayer[]
  playerId: string; isDuet: boolean; lobbyHostId: string; onJoin: (team: TeamColor, role: PlayerRole) => void
}) {
  const isRed = team === "red"
  const spymasters = players.filter((p) => p.role === "spymaster")
  const operatives = players.filter((p) => p.role === "operative")
  const meOnThisTeam = players.some((p) => p.id === playerId)

  return (
    <div className={cn(
      "border overflow-hidden",
      isRed ? "border-red-500/30 bg-red-500/[0.04]" : "border-blue-500/30 bg-blue-500/[0.04]",
    )}>
      {/* Team header */}
      <div className={cn("px-5 py-4 flex items-center gap-2.5", isRed ? "bg-red-500/10" : "bg-blue-500/10")}>
        <div className={cn("size-3", isRed ? "bg-red-500" : "bg-blue-500")} />
        <h3 className={cn("text-lg font-bold uppercase tracking-wider", isRed ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400")}>
          {label}
        </h3>
      </div>

      <div className="p-4 space-y-5">
        {isDuet ? (
          <RoleSection
            label={null}
            players={players}
            playerId={playerId}
            lobbyHostId={lobbyHostId}
            onJoin={() => onJoin(team, "operative")}
            showJoin={!meOnThisTeam}
            team={team}
          />
        ) : (
          <>
            <RoleSection
              label="Spymaster"
              icon={<Eye className="size-4" />}
              players={spymasters}
              playerId={playerId}
              lobbyHostId={lobbyHostId}
              onJoin={() => onJoin(team, "spymaster")}
              showJoin={!spymasters.some((p) => p.id === playerId)}
              team={team}
            />
            <RoleSection
              label="Operatives"
              icon={<Crosshair className="size-4" />}
              players={operatives}
              playerId={playerId}
              lobbyHostId={lobbyHostId}
              onJoin={() => onJoin(team, "operative")}
              showJoin={!operatives.some((p) => p.id === playerId)}
              team={team}
            />
          </>
        )}
      </div>
    </div>
  )
}

function RoleSection({ label, icon, players, playerId, lobbyHostId, onJoin, showJoin, team }: {
  label: string | null
  icon?: React.ReactNode
  players: import("@/lib/types/codenames").LobbyPlayer[]
  playerId: string
  lobbyHostId: string
  onJoin: () => void
  showJoin: boolean
  team: TeamColor
}) {
  const isRed = team === "red"

  return (
    <div>
      {label && (
        <p className={cn(
          "text-sm font-bold uppercase tracking-widest mb-2.5 flex items-center gap-2",
          isRed ? "text-red-500/50" : "text-blue-500/50",
        )}>
          {icon}
          {label}
        </p>
      )}
      <div className={cn(
        "min-h-[52px] p-3 space-y-2",
        isRed ? "bg-red-500/[0.06]" : "bg-blue-500/[0.06]",
      )}>
        {players.map((p) => (
          <div key={p.id} className={cn(
            "flex items-center gap-2.5 text-base px-2 py-1.5",
            p.id === playerId ? "bg-primary/10 text-primary font-bold" : "",
          )}>
            <span className="truncate flex-1">{p.name}</span>
            {p.id === lobbyHostId && <Crown className="size-4 text-amber-500 shrink-0" />}
            {p.id === playerId && <span className="text-xs text-primary/60 uppercase tracking-widest shrink-0">(you)</span>}
          </div>
        ))}
        {players.length === 0 && showJoin && (
          <button onClick={onJoin} className={cn(
            "w-full py-2.5 text-sm font-bold uppercase tracking-wider transition-colors",
            isRed
              ? "text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
              : "text-blue-500/50 hover:text-blue-500 hover:bg-blue-500/10",
          )}>
            Join
          </button>
        )}
        {players.length > 0 && showJoin && (
          <button onClick={onJoin} className={cn(
            "w-full py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
            isRed
              ? "text-red-500/30 hover:text-red-500 hover:bg-red-500/10"
              : "text-blue-500/30 hover:text-blue-500 hover:bg-blue-500/10",
          )}>
            Move here
          </button>
        )}
      </div>
    </div>
  )
}
