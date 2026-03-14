"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Copy,
  Check,
  Users,
  Play,
  Crown,
  Eye,
  Crosshair,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Gamepad2,
} from "lucide-react"
import type {
  CodenamesLobby,
  CodenamesSettings,
  LobbyPlayer,
  TeamColor,
  PlayerRole,
} from "@/lib/types/codenames"
import { TEAM_COLORS, DEFAULT_SETTINGS } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

interface GameLobbyProps {
  lobby: CodenamesLobby
  playerId: string
  onRefresh: () => void
  onGameStart: () => void
}

const STEPS = [
  { id: "teams", label: "Teams", icon: Users },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const

type StepId = (typeof STEPS)[number]["id"]

export function GameLobby({ lobby, playerId, onRefresh, onGameStart }: GameLobbyProps) {
  const [step, setStep] = useState<StepId>("teams")
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [settings, setSettings] = useState<CodenamesSettings>(lobby.settings)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const isHost = lobby.hostId === playerId
  const player = lobby.players.find((p) => p.id === playerId)

  // Poll for updates
  useEffect(() => {
    pollRef.current = setInterval(() => {
      onRefresh()
    }, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [onRefresh])

  // Detect game start
  useEffect(() => {
    if (lobby.status === "playing") {
      onGameStart()
    }
  }, [lobby.status, onGameStart])

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(lobby.code)
    setCopied(true)
    toast.success("Code copied!")
    setTimeout(() => setCopied(false), 2000)
  }, [lobby.code])

  const updatePlayer = useCallback(async (targetId: string, team?: TeamColor, role?: PlayerRole) => {
    try {
      await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-player", playerId: targetId, team, role }),
      })
      onRefresh()
    } catch {
      toast.error("Failed to update player")
    }
  }, [lobby.code, onRefresh])

  const updateSettings = useCallback(async (newSettings: CodenamesSettings) => {
    setSettings(newSettings)
    try {
      await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-settings", settings: newSettings }),
      })
    } catch {
      // silent
    }
  }, [lobby.code])

  const handleStart = useCallback(async () => {
    setIsStarting(true)
    try {
      // Fetch word pool
      const params = new URLSearchParams()
      params.set("players", settings.includePlayers.toString())
      params.set("teams", settings.includeTeams.toString())
      params.set("colleges", settings.includeCollegeTeams.toString())
      params.set("coaches", settings.includeCoaches.toString())

      const poolRes = await fetch(`/api/games/codenames/word-pool?${params}`)
      if (!poolRes.ok) throw new Error("Failed to fetch word pool")
      const { pool } = await poolRes.json()

      if (pool.length < 25) {
        toast.error("Not enough items in the word pool. Enable more content types.")
        setIsStarting(false)
        return
      }

      const res = await fetch(`/api/games/codenames/lobbies/${lobby.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", wordPool: pool }),
      })
      if (!res.ok) throw new Error("Failed to start game")
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start game")
    } finally {
      setIsStarting(false)
    }
  }, [lobby.code, settings, onRefresh])

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const isLastStep = stepIndex === STEPS.length - 1

  const redPlayers = lobby.players.filter((p) => p.team === "red")
  const bluePlayers = lobby.players.filter((p) => p.team === "blue")

  // Validation
  const hasMinPlayers = lobby.players.length >= 2
  const eachTeamHasSpymaster =
    redPlayers.some((p) => p.role === "spymaster") &&
    bluePlayers.some((p) => p.role === "spymaster")
  const eachTeamHasPlayers = redPlayers.length > 0 && bluePlayers.length > 0
  const canStart = hasMinPlayers && eachTeamHasSpymaster && eachTeamHasPlayers

  return (
    <div className="max-w-2xl mx-auto">
      {/* Lobby code */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Lobby Code</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 border-3 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <span className="font-mono font-bold text-2xl tracking-[0.3em] text-primary">
              {lobby.code}
            </span>
            {copied ? (
              <Check className="size-5 text-primary" />
            ) : (
              <Copy className="size-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Step indicators */}
      {isHost && (
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = s.id === step
            const isPast = i < stepIndex
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => { if (isPast) setStep(s.id) }}
                  disabled={!isPast && !isActive}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors flex-1 justify-center border-b-2",
                    isActive && "border-primary text-primary",
                    isPast && "border-primary/40 text-primary/60 cursor-pointer hover:text-primary",
                    !isActive && !isPast && "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[350px]">
        {step === "teams" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Teams</h2>
                <p className="text-sm text-muted-foreground">
                  {lobby.players.length}/6 players &middot; Share the code to invite others
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" /> Spymaster
                <span className="mx-1">&middot;</span>
                <Crosshair className="size-3.5" /> Operative
              </div>
            </div>

            {/* Red team */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-3 bg-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Red Team</h3>
              </div>
              <div className="space-y-1">
                {redPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border">
                    No players yet
                  </p>
                ) : (
                  redPlayers.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      isMe={p.id === playerId}
                      isHost={isHost}
                      onToggleRole={() =>
                        updatePlayer(p.id, undefined, p.role === "spymaster" ? "operative" : "spymaster")
                      }
                      onSwitchTeam={() => updatePlayer(p.id, "blue")}
                      lobbyHostId={lobby.hostId}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Blue team */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-3 bg-blue-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500">Blue Team</h3>
              </div>
              <div className="space-y-1">
                {bluePlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border">
                    No players yet
                  </p>
                ) : (
                  bluePlayers.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      isMe={p.id === playerId}
                      isHost={isHost}
                      onToggleRole={() =>
                        updatePlayer(p.id, undefined, p.role === "spymaster" ? "operative" : "spymaster")
                      }
                      onSwitchTeam={() => updatePlayer(p.id, "red")}
                      lobbyHostId={lobby.hostId}
                    />
                  ))
                )}
              </div>
            </div>

            {!canStart && isHost && (
              <p className="text-xs text-destructive">
                {!hasMinPlayers
                  ? "Need at least 2 players"
                  : !eachTeamHasPlayers
                    ? "Each team needs at least 1 player"
                    : "Each team needs a spymaster"}
              </p>
            )}
          </div>
        )}

        {step === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Game Settings</h2>
              <p className="text-sm text-muted-foreground">Choose what appears on the board.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">NFL Players</Label>
                  <p className="text-xs text-muted-foreground">Current and recent NFL players with headshots</p>
                </div>
                <Switch
                  checked={settings.includePlayers}
                  onCheckedChange={(v) => updateSettings({ ...settings, includePlayers: v })}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">NFL Teams</Label>
                  <p className="text-xs text-muted-foreground">All 32 NFL teams with logos</p>
                </div>
                <Switch
                  checked={settings.includeTeams}
                  onCheckedChange={(v) => updateSettings({ ...settings, includeTeams: v })}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">College Teams</Label>
                  <p className="text-xs text-muted-foreground">Admin-curated college programs</p>
                </div>
                <Switch
                  checked={settings.includeCollegeTeams}
                  onCheckedChange={(v) => updateSettings({ ...settings, includeCollegeTeams: v })}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">Coaches</Label>
                  <p className="text-xs text-muted-foreground">NFL and college coaches</p>
                </div>
                <Switch
                  checked={settings.includeCoaches}
                  onCheckedChange={(v) => updateSettings({ ...settings, includeCoaches: v })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation (host only) */}
      {isHost && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(STEPS[stepIndex - 1]?.id ?? "teams")}
            disabled={stepIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleStart}
              disabled={!canStart || isStarting}
              className="btn-chamfer h-11 px-8 text-base font-bold gap-2"
            >
              {isStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Gamepad2 className="size-4" />
              )}
              Start Game
            </Button>
          ) : (
            <Button
              onClick={() => setStep(STEPS[stepIndex + 1].id)}
              className="btn-chamfer gap-1"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* Non-host waiting */}
      {!isHost && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  )
}

// ---- Player row in team list ----
function PlayerRow({
  player,
  isMe,
  isHost,
  onToggleRole,
  onSwitchTeam,
  lobbyHostId,
}: {
  player: LobbyPlayer
  isMe: boolean
  isHost: boolean
  onToggleRole: () => void
  onSwitchTeam: () => void
  lobbyHostId: string
}) {
  const canEdit = isHost || isMe

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 border-2 transition-colors",
      isMe ? "border-primary/30 bg-primary/5" : "border-border/30",
    )}>
      <span className="flex-1 text-sm font-medium flex items-center gap-2">
        {player.name}
        {player.id === lobbyHostId && (
          <Crown className="size-3.5 text-amber-500" />
        )}
        {isMe && (
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">(You)</span>
        )}
      </span>

      {canEdit && (
        <>
          <button
            onClick={onToggleRole}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs font-medium border transition-colors",
              player.role === "spymaster"
                ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {player.role === "spymaster" ? (
              <><Eye className="size-3" /> Spymaster</>
            ) : (
              <><Crosshair className="size-3" /> Operative</>
            )}
          </button>

          <button
            onClick={onSwitchTeam}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border"
          >
            Switch
          </button>
        </>
      )}

      {!canEdit && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {player.role === "spymaster" ? (
            <><Eye className="size-3" /> Spymaster</>
          ) : (
            <><Crosshair className="size-3" /> Operative</>
          )}
        </span>
      )}
    </div>
  )
}
