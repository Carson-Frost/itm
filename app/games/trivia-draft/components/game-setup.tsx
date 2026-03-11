"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Minus, X, Users, Trophy, Settings2, Play, Shuffle } from "lucide-react"
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

interface CategoryOption {
  id: string
  name: string
  description: string
}

interface GameSetupProps {
  onStart: (settings: TriviaDraftSettings, categoryIds: string[], penaltyPoints: number) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export function GameSetup({ onStart }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { id: generateId(), name: "", color: PLAYER_COLORS[0] },
    { id: generateId(), name: "", color: PLAYER_COLORS[1] },
  ])
  const [numberOfDrafts, setNumberOfDrafts] = useState(1)
  const [onePositionAtATime, setOnePositionAtATime] = useState(true)
  const [hasSuperFlex, setHasSuperFlex] = useState(false)
  const [invalidPickPenalty, setInvalidPickPenalty] = useState<InvalidPickPenalty>("points")
  const [penaltyPoints, setPenaltyPoints] = useState(25)
  const [scoringFormat, setScoringFormat] = useState<"PPR" | "Half" | "STD">("PPR")
  const [lineupSlots, setLineupSlots] = useState<LineupSlot[]>(DEFAULT_LINEUP_SLOTS)

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([""])
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/games/trivia-categories")
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch {
        // silent fail
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Sync player count with players array
  function handlePlayerCountChange(newCount: number) {
    const clamped = Math.max(1, Math.min(10, newCount))
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

  // Sync drafts with category selections
  function handleDraftCountChange(count: number) {
    const clamped = Math.max(1, Math.min(10, count))
    setNumberOfDrafts(clamped)
    setSelectedCategoryIds((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array(clamped - prev.length).fill("")]
      }
      return prev.slice(0, clamped)
    })
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

  function addSlot(position: SlotPosition) {
    const countOfPos = lineupSlots.filter((s) => s.position === position).length
    const label =
      position === "FLEX"
        ? `FLEX${countOfPos + 1}`
        : position === "SUPERFLEX"
        ? `SFLEX${countOfPos + 1}`
        : `${position}${countOfPos + 1}`
    setLineupSlots((prev) => [
      ...prev,
      { id: generateId(), position, label },
    ])
  }

  function removeSlot(id: string) {
    setLineupSlots((prev) => prev.filter((s) => s.id !== id))
  }

  function handleCategoryChange(index: number, id: string) {
    setSelectedCategoryIds((prev) =>
      prev.map((c, i) => (i === index ? id : c))
    )
  }

  function randomizeCategories() {
    if (categories.length === 0) return
    const shuffled = [...categories].sort(() => Math.random() - 0.5)
    setSelectedCategoryIds((prev) =>
      prev.map((_, i) => shuffled[i % shuffled.length]?.id || "")
    )
  }

  const isValid =
    players.every((p) => p.name.trim().length > 0) &&
    lineupSlots.length > 0 &&
    selectedCategoryIds.every((id) => id !== "") &&
    categories.length > 0

  function handleStart() {
    const settings: TriviaDraftSettings = {
      players: players.map((p) => ({ ...p, name: p.name.trim() })),
      numberOfDrafts,
      lineupSlots,
      onePositionAtATime,
      invalidPickPenalty,
      scoringFormat,
    }
    onStart(settings, selectedCategoryIds, penaltyPoints)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Players Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Players</h2>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm font-medium text-muted-foreground shrink-0">
            Number of Players
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePlayerCountChange(playerCount - 1)}
              disabled={playerCount <= 1}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-8 text-center font-mono font-bold text-lg">
              {playerCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePlayerCountChange(playerCount + 1)}
              disabled={playerCount >= 10}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {players.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3">
              <div
                className="size-3 shrink-0"
                style={{ backgroundColor: player.color }}
              />
              <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                {i + 1}.
              </span>
              <Input
                value={player.name}
                onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                placeholder={`Player ${i + 1} name`}
                autoComplete="off"
                className="max-w-xs"
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Lineup Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Lineup</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {lineupSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-1.5 px-3 py-1.5 border bg-muted/30 text-sm font-medium"
            >
              <span>{slot.label}</span>
              <button
                onClick={() => removeSlot(slot.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["QB", "RB", "WR", "TE", "FLEX"] as SlotPosition[]).map((pos) => (
            <Button
              key={pos}
              variant="outline"
              size="sm"
              onClick={() => addSlot(pos)}
              className="text-xs"
            >
              <Plus className="size-3 mr-1" />
              {pos}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Switch
            checked={hasSuperFlex}
            onCheckedChange={setHasSuperFlex}
            id="superflex"
          />
          <Label htmlFor="superflex" className="text-sm">
            Superflex
          </Label>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-12">
          {lineupSlots.length} rounds per draft
        </p>
      </section>

      <Separator />

      {/* Draft Settings */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Draft Settings</h2>
        </div>

        <div className="space-y-4">
          {/* Number of Drafts */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground shrink-0 w-40">
              Number of Drafts
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleDraftCountChange(numberOfDrafts - 1)}
                disabled={numberOfDrafts <= 1}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="w-8 text-center font-mono font-bold text-lg">
                {numberOfDrafts}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleDraftCountChange(numberOfDrafts + 1)}
                disabled={numberOfDrafts >= 10}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* One Position at a Time */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground shrink-0 w-40">
              One Position at a Time
            </Label>
            <Switch
              checked={onePositionAtATime}
              onCheckedChange={setOnePositionAtATime}
            />
          </div>

          {/* Scoring Format */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground shrink-0 w-40">
              Scoring
            </Label>
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
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground shrink-0 w-40">
              Invalid Pick Penalty
            </Label>
            <Select
              value={invalidPickPenalty}
              onValueChange={(v) => setInvalidPickPenalty(v as InvalidPickPenalty)}
            >
              <SelectTrigger className="w-40 h-9">
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
            <div className="flex items-center gap-3 ml-[172px]">
              <Label className="text-sm text-muted-foreground shrink-0">
                Penalty Amount
              </Label>
              <div className="flex items-center gap-1.5">
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
                <span className="text-sm text-muted-foreground">pts</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Categories</h2>
          {numberOfDrafts > 1 && categories.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={randomizeCategories}
              className="text-xs"
            >
              <Shuffle className="size-3 mr-1" />
              Randomize
            </Button>
          )}
        </div>
        {loadingCategories ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories available. An admin needs to create trivia categories first.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedCategoryIds.map((catId, i) => (
              <div key={i} className="flex items-center gap-3">
                {numberOfDrafts > 1 && (
                  <span className="text-sm font-mono text-muted-foreground w-12 shrink-0">
                    Draft {i + 1}
                  </span>
                )}
                <Select
                  value={catId}
                  onValueChange={(v) => handleCategoryChange(i, v)}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Start Button */}
      <div className="flex justify-center pb-8">
        <Button
          onClick={handleStart}
          disabled={!isValid}
          className="btn-chamfer h-12 px-8 text-lg font-bold tracking-wide"
        >
          <Play className="size-5 mr-2" />
          Start Draft
        </Button>
      </div>
    </div>
  )
}
