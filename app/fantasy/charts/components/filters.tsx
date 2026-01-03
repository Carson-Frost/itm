"use client"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { Position } from "@/lib/mock-fantasy-data"

interface FiltersProps {
  selectedPosition: Position | 'ALL'
  onPositionChange: (position: Position | 'ALL') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedSeason: number | null
  onSeasonChange: (season: number) => void
  availableSeasons: { year: number; label: string }[]
}

export function Filters({
  selectedPosition,
  onPositionChange,
  searchQuery,
  onSearchChange,
  selectedSeason,
  onSeasonChange,
  availableSeasons,
}: FiltersProps) {
  return (
    <div className="space-y-4 pb-4 border-b">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs
          value={selectedPosition}
          onValueChange={(value) => onPositionChange(value as Position | 'ALL')}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full sm:w-auto grid-cols-5">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="QB">QB</TabsTrigger>
            <TabsTrigger value="RB">RB</TabsTrigger>
            <TabsTrigger value="WR">WR</TabsTrigger>
            <TabsTrigger value="TE">TE</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-3 w-full sm:w-auto">
          {selectedSeason !== null && (
            <Select
              value={selectedSeason.toString()}
              onValueChange={(value) => onSeasonChange(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSeasons.map((season) => (
                  <SelectItem key={season.year} value={season.year.toString()}>
                    {season.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1 sm:flex-initial sm:w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
