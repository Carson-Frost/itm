"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronLeft,
  Play,
  Users,
  ListOrdered,
  Settings2,
} from "lucide-react"
import {
  type TriviaDraftSettings,
  type DraftPlayer,
  type LineupSlot,
  type SlotPosition,
  type InvalidPickPenalty,
  DEFAULT_LINEUP_SLOTS,
  SUPERFLEX_SLOT,
  PLAYER_COLORS,
} from "@/lib/types/trivia-draft"
import { cn } from "@/lib/utils"

interface GameSetupProps {
  onStart: (settings: TriviaDraftSettings, categoryIds: string[], penaltyPoints: number) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

const STEPS = [
  { id: "players", label: "Players", icon: Users },
  { id: "lineup", label: "Lineup", icon: ListOrdered },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const

type StepId = (typeof STEPS)[number]["id"]

const POSITION_ORDER: SlotPosition[] = ["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX"]

export function GameSetup({ onStart }: GameSetupProps) {
  const [step, setStep] = useState<StepId>("players")

  // Players
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { id: generateId(), name: "", color: PLAYER_COLORS[0] },
    { id: generateId(), name: "", color: PLAYER_COLORS[1] },
  ])

  // Lineup
  const [lineupSlots, setLineupSlots] = useState<LineupSlot[]>(DEFAULT_LINEUP_SLOTS)
  const [hasSuperFlex, setHasSuperFlex] = useState(false)

  // Settings
  const [numberOfDrafts, setNumberOfDrafts] = useState(1)
  const [onePositionAtATime, setOnePositionAtATime] = useState(true)
  const [invalidPickPenalty, setInvalidPickPenalty] = useState<InvalidPickPenalty>("points")
  const [penaltyPoints, setPenaltyPoints] = useState(25)
  const [scoringFormat, setScoringFormat] = useState<"PPR" | "Half" | "STD">("PPR")

  // Categories loaded in background
  const [hasCategories, setHasCategories] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    async function checkCategories() {
      try {
        const res = await fetch("/api/games/trivia-categories")
        if (res.ok) {
          const data = await res.json()
          setHasCategories((data.categories || []).length > 0)
        }
      } catch {
        // silent fail
      } finally {
        setLoadingCategories(false)
      }
    }
    checkCategories()
  }, [])

  // Sync player count
  function handlePlayerCountChange(newCount: number) {
    const clamped = Math.max(2, Math.min(10, newCount))
    setPlayerCount(clamped)
    setPlayers((prev) => {
      if (clamped > prev.length) {
        const additions = Array.from({ length: clamped - prev.length }, (_, i) => ({
          id: generateId(),
          name: "",
          color: PLAYER_COLORS[(prev.length + i) % PLAYER_COLORS.length],
        }))
        return [...prev, ...additions]
      }
      return prev.slice(0, clamped)
    })
  }

  function handlePlayerNameChange(index: number, name: string) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name } : p))
    )
  }

  // Superflex toggle
  useEffect(() => {
    setLineupSlots((prev) => {
      const withoutSflex = prev.filter((s) => s.position !== "SUPERFLEX")
      if (hasSuperFlex) {
        return [...withoutSflex, { ...SUPERFLEX_SLOT, id: generateId() }]
      }
      return withoutSflex
    })
  }, [hasSuperFlex])

  // Lineup position helpers
  function getPositionCount(pos: SlotPosition) {
    return lineupSlots.filter((s) => s.position === pos).length
  }

  function setPositionCount(pos: SlotPosition, count: number) {
    const clamped = Math.max(0, Math.min(6, count))
    setLineupSlots((prev) => {
      const others = prev.filter((s) => s.position !== pos)
      const newSlots: LineupSlot[] = Array.from({ length: clamped }, (_, i) => ({
        id: generateId(),
        position: pos,
        label: clamped === 1 && pos !== "FLEX" && pos !== "SUPERFLEX"
          ? pos
          : `${pos === "SUPERFLEX" ? "SFLEX" : pos}${i + 1}`,
      }))
      // Maintain position order
      const combined = [...others, ...newSlots]
      combined.sort((a, b) => {
        return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
      })
      return combined
    })
  }

  // Fetch random categories for each draft
  const fetchRandomCategories = useCallback(async (): Promise<string[]> => {
    const ids: string[] = []
    for (let i = 0; i < numberOfDrafts; i++) {
      try {
        const exclude = ids.length > 0 ? `?exclude=${ids.join(",")}` : ""
        const res = await fetch(`/api/games/trivia-draft/random-category${exclude}`)
        if (res.ok) {
          const data = await res.json()
          ids.push(data.id)
        }
      } catch {
        // silent
      }
    }
    return ids
  }, [numberOfDrafts])

  // Navigation
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const canAdvance = (() => {
    if (step === "players") {
      return players.every((p) => p.name.trim().length > 0) && playerCount >= 2
    }
    if (step === "lineup") {
      return lineupSlots.length > 0
    }
    return true
  })()

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].id)
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].id)
    }
  }

  async function handleStart() {
    const categoryIds = await fetchRandomCategories()
    if (categoryIds.length === 0) return

    const settings: TriviaDraftSettings = {
      players: players.map((p) => ({ ...p, name: p.name.trim() })),
      numberOfDrafts,
      lineupSlots,
      onePositionAtATime,
      invalidPickPenalty,
      scoringFormat,
    }
    onStart(settings, categoryIds, penaltyPoints)
  }

  const isLastStep = stepIndex === STEPS.length - 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicators */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = s.id === step
          const isPast = i < stepIndex
          return (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => {
                  if (isPast) setStep(s.id)
                }}
                disabled={!isPast && !isActive}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors flex-1 justify-center border-b-2",
                  isActive && "border-primary text-primary",
                  isPast && "border-primary/40 text-primary/60 cursor-pointer hover:text-primary",
                  !isActive && !isPast && "border-border text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === "players" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">How many players?</h2>
              <p className="text-sm text-muted-foreground">2-10 players take turns drafting.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="size-10"
                onClick={() => handlePlayerCountChange(playerCount - 1)}
                disabled={playerCount <= 2}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-12 text-center font-mono font-bold text-3xl">
                {playerCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-10"
                onClick={() => handlePlayerCountChange(playerCount + 1)}
                disabled={playerCount >= 10}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              {players.map((player, i) => (
                <div key={player.id} className="flex items-center gap-3">
                  <div
                    className="size-4 shrink-0 border"
                    style={{ backgroundColor: player.color }}
                  />
                  <Input
                    value={player.name}
                    onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    autoComplete="off"
                    className="max-w-xs h-10"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "lineup" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Set your lineup</h2>
              <p className="text-sm text-muted-foreground">
                Configure how many of each position to draft. {lineupSlots.length} rounds total.
              </p>
            </div>

            <div className="space-y-3">
              {(["QB", "RB", "WR", "TE", "FLEX"] as SlotPosition[]).map((pos) => {
                const count = getPositionCount(pos)
                return (
                  <div key={pos} className="flex items-center justify-between py-2 border-b border-border/50">
                    <div>
                      <span className="font-bold text-sm">{pos}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {pos === "FLEX" && "(RB/WR/TE)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setPositionCount(pos, count - 1)}
                        disabled={count <= 0}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center font-mono font-bold text-lg">
                        {count}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setPositionCount(pos, count + 1)}
                        disabled={count >= 6}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-bold text-sm">Superflex</span>
                <span className="text-xs text-muted-foreground ml-2">(QB/RB/WR/TE)</span>
              </div>
              <Switch
                checked={hasSuperFlex}
                onCheckedChange={setHasSuperFlex}
              />
            </div>

            <Separator />

            {/* Preview */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 block">
                Draft Order Preview
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {lineupSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add at least one position to continue.</p>
                ) : (
                  lineupSlots.map((slot, i) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-1 px-2.5 py-1 border bg-muted/30 text-xs font-mono font-medium"
                    >
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span>{slot.label}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {step === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Game settings</h2>
              <p className="text-sm text-muted-foreground">Configure draft rules and scoring.</p>
            </div>

            <div className="space-y-4">
              {/* Number of Drafts */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">Number of Drafts</Label>
                  <p className="text-xs text-muted-foreground">Players can&apos;t repeat across drafts</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setNumberOfDrafts(Math.max(1, numberOfDrafts - 1))}
                    disabled={numberOfDrafts <= 1}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center font-mono font-bold text-lg">
                    {numberOfDrafts}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setNumberOfDrafts(Math.min(10, numberOfDrafts + 1))}
                    disabled={numberOfDrafts >= 10}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>

              {/* One Position at a Time */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">One Position at a Time</Label>
                  <p className="text-xs text-muted-foreground">All players draft the same position each round</p>
                </div>
                <Switch
                  checked={onePositionAtATime}
                  onCheckedChange={setOnePositionAtATime}
                />
              </div>

              {/* Scoring */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <Label className="text-sm font-medium">Scoring Format</Label>
                <Select
                  value={scoringFormat}
                  onValueChange={(v) => setScoringFormat(v as "PPR" | "Half" | "STD")}
                >
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PPR">PPR</SelectItem>
                    <SelectItem value="Half">Half PPR</SelectItem>
                    <SelectItem value="STD">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invalid Pick Penalty */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-sm font-medium">Invalid Pick Penalty</Label>
                  <p className="text-xs text-muted-foreground">What happens when a pick doesn&apos;t fit the category</p>
                </div>
                <Select
                  value={invalidPickPenalty}
                  onValueChange={(v) => setInvalidPickPenalty(v as InvalidPickPenalty)}
                >
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Point Penalty</SelectItem>
                    <SelectItem value="none">No Penalty</SelectItem>
                    <SelectItem value="skip">Turn Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {invalidPickPenalty === "points" && (
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-sm font-mono text-destructive">-</span>
                  <Input
                    type="number"
                    value={penaltyPoints}
                    onChange={(e) =>
                      setPenaltyPoints(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    autoComplete="off"
                    className="w-20 h-9 font-mono"
                  />
                  <span className="text-sm text-muted-foreground">pts per invalid pick</span>
                </div>
              )}
            </div>

            {!loadingCategories && !hasCategories && (
              <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                No categories available. An admin needs to create and publish trivia categories before you can play.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleStart}
            disabled={!canAdvance || (!loadingCategories && !hasCategories)}
            className="btn-chamfer h-11 px-8 text-base font-bold gap-2"
          >
            <Play className="size-4" />
            Start Draft
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canAdvance}
            className="btn-chamfer gap-1"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
