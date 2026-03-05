"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { PlayerSearch } from "./player-search"
import type { ConnectionsCategory, ConnectionsPlayer } from "@/lib/types/connections"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

interface CategoryBuilderProps {
  category: ConnectionsCategory
  onChange: (category: ConnectionsCategory) => void
  existingPlayerIds: Set<string>
  missingName: boolean
  missingPlayers: number
}

export function CategoryBuilder({
  category,
  onChange,
  existingPlayerIds,
  missingName,
  missingPlayers,
}: CategoryBuilderProps) {
  const [isPlayerSearchOpen, setIsPlayerSearchOpen] = useState(false)

  const handleNameChange = (name: string) => {
    onChange({ ...category, name })
  }

  const handleDifficultyChange = (difficulty: 1 | 2 | 3 | 4) => {
    onChange({ ...category, difficulty })
  }

  const handleAddPlayer = (player: ConnectionsPlayer) => {
    if (category.players.length >= 4) return
    if (existingPlayerIds.has(player.playerId)) return
    onChange({ ...category, players: [...category.players, player] })
  }

  const handleRemovePlayer = (index: number) => {
    onChange({
      ...category,
      players: category.players.filter((_, i) => i !== index),
    })
  }

  const diffColor = DIFFICULTY_COLORS[category.difficulty]

  return (
    <div className="border-3 border-border p-4">
      <div className="flex flex-col gap-3">
        {/* Category name + difficulty color badge + difficulty selector */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                CATEGORY NAME
              </label>
              {missingName && <span className="text-xs text-destructive ml-1.5">Required</span>}
              <span className={`text-[10px] font-bold uppercase ${diffColor.bg} ${diffColor.text} px-1.5 py-0.5 leading-none ml-auto`}>
                {diffColor.label}
              </span>
            </div>
            <Input
              value={category.name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoComplete="off"
              maxLength={30}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              DIFFICULTY
            </label>
            <div className="flex gap-1">
              {([1, 2, 3, 4] as const).map((d) => {
                const colors = DIFFICULTY_COLORS[d]
                const isSelected = category.difficulty === d
                return (
                  <button
                    key={d}
                    onClick={() => handleDifficultyChange(d)}
                    className={`
                      h-9 w-9 text-xs font-bold transition-all cursor-pointer
                      ${isSelected
                        ? `${colors.bg} ${colors.text} ring-2 ring-foreground/20`
                        : "bg-muted text-muted-foreground hover:opacity-80"
                      }
                    `}
                    title={colors.label}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Player slots — match game tile appearance with ghost slots for empties */}
        <div>
          <div className="flex items-center mb-2">
            <label className="text-xs font-semibold text-muted-foreground">
              PLAYERS ({category.players.length}/4)
            </label>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {category.players.map((player, i) => (
              <div
                key={player.playerId}
                className="aspect-square relative border-2 border-border bg-muted/30 group overflow-hidden"
              >
                {player.headshotUrl ? (
                  <img
                    src={player.headshotUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50" />
                )}

                {/* Name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-5 pb-1 px-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {player.name}
                  </p>
                </div>

                <button
                  onClick={() => handleRemovePlayer(i)}
                  className="absolute top-0.5 right-0.5 h-6 w-6 flex items-center justify-center
                    bg-background/90 border border-border text-muted-foreground hover:text-destructive hover:border-destructive
                    opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Ghost slots for missing players */}
            {Array.from({ length: 4 - category.players.length }).map((_, ghostIndex) => (
              <button
                key={`ghost-${ghostIndex}`}
                onClick={() => setIsPlayerSearchOpen(true)}
                className="aspect-square flex flex-col items-center justify-center gap-1
                  border-2 border-dashed border-muted-foreground/25
                  text-muted-foreground/40 hover:text-foreground hover:border-primary/40 hover:bg-primary/5
                  transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      <PlayerSearch
        open={isPlayerSearchOpen}
        onOpenChange={setIsPlayerSearchOpen}
        onSelectPlayer={handleAddPlayer}
        onRemovePlayer={(playerId) => {
          const index = category.players.findIndex((p) => p.playerId === playerId)
          if (index !== -1) handleRemovePlayer(index)
        }}
        existingPlayerIds={existingPlayerIds}
      />
    </div>
  )
}
