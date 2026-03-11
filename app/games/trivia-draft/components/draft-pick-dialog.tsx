"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PositionBadge } from "@/components/position-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Check } from "lucide-react"
import { XButton } from "@/components/x-button"
import type { SlotPosition } from "@/lib/types/trivia-draft"
import { SLOT_VALID_POSITIONS } from "@/lib/types/trivia-draft"

interface SearchResult {
  name: string
  playerId: string
  position: string
  team: string
  season: number
  headshotUrl: string | null
  fantasyPoints: number
}

interface DraftPickDialogProps {
  isOpen: boolean
  onClose: () => void
  onPick: (player: SearchResult) => void
  slotPosition: SlotPosition
  slotLabel: string
  playerName: string
  usedPlayerSeasons: Set<string>
  availableSeasons: number[]
}

export function DraftPickDialog({
  isOpen,
  onClose,
  onPick,
  slotPosition,
  slotLabel,
  playerName,
  usedPlayerSeasons,
  availableSeasons,
}: DraftPickDialogProps) {
  const [search, setSearch] = useState("")
  const [season, setSeason] = useState<string>(
    availableSeasons[0]?.toString() || "2024"
  )
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSearch("")
      setResults([])
      setSeason(availableSeasons[0]?.toString() || "2024")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, availableSeasons])

  // Search with debounce
  useEffect(() => {
    if (!isOpen) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!search.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const validPositions = SLOT_VALID_POSITIONS[slotPosition]
        const posParam = validPositions.length === 1 ? `&position=${validPositions[0]}` : ""
        const res = await fetch(
          `/api/fantasy/players/search?search=${encodeURIComponent(search)}&season=${season}${posParam}&limit=30&sortBy=fantasyPoints`
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.players || [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, season, isOpen, slotPosition])

  const validPositions = SLOT_VALID_POSITIONS[slotPosition]

  const filteredResults = useMemo(() => {
    return results.filter((r) => validPositions.includes(r.position))
  }, [results, validPositions])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary font-bold">{playerName}</span>
            <span className="text-muted-foreground font-normal">drafting</span>
            <span className="font-mono text-sm bg-muted px-2 py-0.5">
              {slotLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a player..."
              autoComplete="off"
              className="pl-9 pr-8"
            />
            {search && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <XButton
                  size="xs"
                  variant="muted"
                  onClick={() => setSearch("")}
                />
              </div>
            )}
          </div>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t max-h-[400px] overflow-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search.trim()
                ? "No players found"
                : "Type a name to search"}
            </div>
          ) : (
            filteredResults.map((player) => {
              const key = `${player.playerId}-${player.season}`
              const isUsed = usedPlayerSeasons.has(key)
              return (
                <button
                  key={key}
                  disabled={isUsed}
                  onClick={() => onPick(player)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 text-left disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {player.headshotUrl ? (
                    <img
                      src={player.headshotUrl}
                      alt=""
                      className="size-10 object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-10 bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {player.name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PositionBadge position={player.position} size="compact" />
                      <span className="text-xs text-muted-foreground">
                        {player.team || "FA"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {player.season}
                      </span>
                    </div>
                  </div>
                  {isUsed ? (
                    <span className="text-xs text-muted-foreground font-medium">
                      Used
                    </span>
                  ) : (
                    <div className="text-sm font-bold font-mono text-right min-w-[50px]">
                      {player.fantasyPoints.toFixed(1)}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
