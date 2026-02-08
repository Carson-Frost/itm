"use client"

import { useState } from "react"
import { Settings, ChevronDown, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserRanking,
  FantasyPosition,
  ScoringFormat,
  RankingType,
  QBFormat,
  TeamFilter,
} from "@/lib/types/ranking-schemas"
import { nflTeamAbbreviations } from "@/lib/team-utils"
import { cn } from "@/lib/utils"
import { PositionBadge } from "@/components/position-badge"

interface SettingsDialogProps {
  ranking: UserRanking
  onSave: (updates: Partial<UserRanking>) => void
}

const allPositions: FantasyPosition[] = ["QB", "RB", "WR", "TE"]

const scoringOptions: { value: ScoringFormat; label: string }[] = [
  { value: "PPR", label: "PPR" },
  { value: "Half", label: "Half PPR" },
  { value: "STD", label: "Standard" },
]

const CURRENT_YEAR = new Date().getFullYear()
// Realistic bounds based on NFL player population
const MIN_DRAFT_YEAR = 2010
const MAX_DRAFT_YEAR = CURRENT_YEAR + 1
const MIN_AGE = 20
const MAX_AGE = 45

export function SettingsDialog({ ranking, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [positionsOpen, setPositionsOpen] = useState(false)

  // General
  const [name, setName] = useState(ranking.name)
  const [type, setType] = useState<RankingType>(ranking.type ?? "redraft")
  const [scoring, setScoring] = useState<ScoringFormat>(ranking.scoring)
  const [qbFormat, setQbFormat] = useState<QBFormat>(ranking.qbFormat ?? "1qb")
  const [tePremium, setTePremium] = useState<number>(
    typeof ranking.tePremium === "number" ? ranking.tePremium : 0
  )

  // Players
  const [positions, setPositions] = useState<FantasyPosition[]>(ranking.positions ?? ["QB", "RB", "WR", "TE"])
  const [draftClassRange, setDraftClassRange] = useState<[number, number]>(
    ranking.draftClassRange ?? [MIN_DRAFT_YEAR, MAX_DRAFT_YEAR]
  )
  const [ageRange, setAgeRange] = useState<[number, number]>(
    ranking.ageRange ?? [MIN_AGE, MAX_AGE]
  )
  const [teamFilter, setTeamFilter] = useState<TeamFilter>(
    ranking.teamFilter ?? "ALL"
  )

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(ranking.name)
      setType(ranking.type ?? "redraft")
      setScoring(ranking.scoring)
      setQbFormat(ranking.qbFormat ?? "1qb")
      setTePremium(typeof ranking.tePremium === "number" ? ranking.tePremium : 0)
      setPositions(ranking.positions ?? ["QB", "RB", "WR", "TE"])
      setDraftClassRange(ranking.draftClassRange ?? [MIN_DRAFT_YEAR, MAX_DRAFT_YEAR])
      setAgeRange(ranking.ageRange ?? [MIN_AGE, MAX_AGE])
      setTeamFilter(ranking.teamFilter ?? "ALL")
    }
    setOpen(isOpen)
  }

  const togglePosition = (pos: FantasyPosition) => {
    setPositions((prev) => {
      if (prev.includes(pos)) {
        if (prev.length === 1) return prev
        return prev.filter((p) => p !== pos)
      }
      return [...prev, pos]
    })
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      type,
      scoring,
      qbFormat,
      tePremium,
      positions,
      draftClassRange,
      ageRange,
      teamFilter,
    })
    setOpen(false)
  }

  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i])

  const positionsEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v) => b.includes(v))

  const defaultDraftRange = ranking.draftClassRange ?? [MIN_DRAFT_YEAR, MAX_DRAFT_YEAR]
  const defaultAgeRange = ranking.ageRange ?? [MIN_AGE, MAX_AGE]

  const hasChanges =
    name.trim() !== ranking.name ||
    type !== (ranking.type ?? "redraft") ||
    scoring !== ranking.scoring ||
    qbFormat !== (ranking.qbFormat ?? "1qb") ||
    tePremium !== (typeof ranking.tePremium === "number" ? ranking.tePremium : 0) ||
    !positionsEqual(positions, ranking.positions ?? ["QB", "RB", "WR", "TE"]) ||
    !arraysEqual(draftClassRange, defaultDraftRange) ||
    !arraysEqual(ageRange, defaultAgeRange) ||
    teamFilter !== (ranking.teamFilter ?? "ALL")

  const positionsLabel = positions.length === 4
    ? "All"
    : positions.join(", ")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ranking Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* General */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold">General</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">NAME</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ranking name"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">TYPE</label>
                <Select value={type} onValueChange={(v) => setType(v as RankingType)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redraft">Redraft</SelectItem>
                    <SelectItem value="dynasty">Dynasty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">SCORING</label>
                <Select value={scoring} onValueChange={(v) => setScoring(v as ScoringFormat)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scoringOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">QBS</label>
                <Select value={qbFormat} onValueChange={(v) => setQbFormat(v as QBFormat)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1qb">1QB</SelectItem>
                    <SelectItem value="superflex">Superflex</SelectItem>
                    <SelectItem value="2qb">2QB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-[100px]">
              <label className="text-xs font-semibold text-muted-foreground">TE PREMIUM</label>
              <Select value={String(tePremium)} onValueChange={(v) => setTePremium(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="0.5">+0.5 PPR</SelectItem>
                  <SelectItem value="1">+1 PPR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Players */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold">Players</h3>

            {/* Position and Team */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">POSITION</label>
                <Popover open={positionsOpen} onOpenChange={setPositionsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[100px] justify-between font-normal"
                    >
                      {positionsLabel}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[120px] p-1" align="start">
                    {allPositions.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => togglePosition(pos)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent"
                      >
                        <div className={cn(
                          "h-4 w-4 border rounded flex items-center justify-center",
                          positions.includes(pos) ? "bg-primary border-primary" : "border-input"
                        )}>
                          {positions.includes(pos) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <PositionBadge position={pos} />
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {nflTeamAbbreviations.map((abbr) => (
                      <SelectItem key={abbr} value={abbr}>{abbr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters - 2 column grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Age slider */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">AGE</label>
                <Slider
                  value={ageRange}
                  onValueChange={(v) => setAgeRange([v[0], v[1]])}
                  min={MIN_AGE}
                  max={MAX_AGE}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">
                  {ageRange[0]} – {ageRange[1]}
                </span>
              </div>

              {/* Draft Class slider */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">DRAFT CLASS</label>
                <Slider
                  value={draftClassRange}
                  onValueChange={(v) => setDraftClassRange([v[0], v[1]])}
                  min={MIN_DRAFT_YEAR}
                  max={MAX_DRAFT_YEAR}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">
                  {draftClassRange[0]} – {draftClassRange[1]}
                </span>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !hasChanges}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
