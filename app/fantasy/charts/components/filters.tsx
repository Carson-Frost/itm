"use client"

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
import { Search, X } from "lucide-react"
import { Position } from "@/lib/types/player"
import { Button } from "@/components/ui/button"
import { nflTeamsByName, nflDivisions, nflConferences, getTeamFilterLabel } from "@/lib/team-utils"

type ScoringFormat = 'PPR' | 'Half PPR' | 'STD'
export type StatView = 'all' | 'passing' | 'rushing' | 'receiving'

interface FiltersProps {
  selectedPosition: Position | 'ALL'
  onPositionChange: (position: Position | 'ALL') => void
  selectedTeam: string
  onTeamChange: (team: string) => void
  availableTeams: string[]
  selectedScoringFormat: ScoringFormat
  onScoringFormatChange: (format: ScoringFormat) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedSeason: number | null
  onSeasonChange: (season: number) => void
  availableSeasons: { year: number; label: string }[]
  statView: StatView
  onStatViewChange: (view: StatView) => void
}

export function Filters({
  selectedPosition,
  onPositionChange,
  selectedTeam,
  onTeamChange,
  availableTeams: _availableTeams,
  selectedScoringFormat,
  onScoringFormatChange,
  searchQuery,
  onSearchChange,
  selectedSeason,
  onSeasonChange,
  availableSeasons,
  statView,
  onStatViewChange,
}: FiltersProps) {
  return (
    <div className="pb-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
        <div className="flex gap-3 w-full sm:w-auto items-end">
          <div className="flex flex-col gap-1 w-full sm:w-[400px]">
            <div className="text-xs font-semibold text-muted-foreground invisible">SEARCH</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground">STATS</label>
            <Select value={statView} onValueChange={(v) => onStatViewChange(v as StatView)}>
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
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">POSITION</label>
            <Select
              value={selectedPosition}
              onValueChange={(value) => onPositionChange(value as Position | 'ALL')}
            >
              <SelectTrigger className="w-full sm:w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="!max-h-[500px]">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="QB">QB</SelectItem>
                <SelectItem value="RB">RB</SelectItem>
                <SelectItem value="WR">WR</SelectItem>
                <SelectItem value="TE">TE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedSeason !== null && (
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-muted-foreground">SEASON</label>
              <Select
                value={selectedSeason.toString()}
                onValueChange={(value) => onSeasonChange(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="!max-h-[500px]">
                  {availableSeasons.map((season) => (
                    <SelectItem key={season.year} value={season.year.toString()}>
                      {season.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
            <Select
              value={selectedTeam}
              onValueChange={onTeamChange}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue>{getTeamFilterLabel(selectedTeam)}</SelectValue>
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
                  {nflTeamsByName.map((team) => (
                    <SelectItem key={team.abbr} value={team.abbr}>{team.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">FORMAT</label>
            <Select
              value={selectedScoringFormat}
              onValueChange={(value) => onScoringFormatChange(value as ScoringFormat)}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="!max-h-[500px]">
                <SelectItem value="PPR">PPR</SelectItem>
                <SelectItem value="Half PPR">Half PPR</SelectItem>
                <SelectItem value="STD">STD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
