"use client"

import { useState } from "react"
import Image from "next/image"
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
  errors: string[]
}

export function CategoryBuilder({
  category,
  onChange,
  existingPlayerIds,
  errors,
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
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                CATEGORY NAME
              </label>
              <span className={`text-[10px] font-bold uppercase ${diffColor.bg} ${diffColor.text} px-1.5 py-0.5 leading-none`}>
                {diffColor.label}
              </span>
            </div>
            <Input
              value={category.name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoComplete="off"
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

        {/* Player slots — match game tile appearance */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">
            PLAYERS ({category.players.length}/4)
          </label>
          <div className="grid grid-cols-4 gap-1">
            {category.players.map((player, i) => (
              <div
                key={player.playerId}
                className="relative h-16 sm:h-20 border-3 border-border bg-muted/30 group overflow-hidden"
              >
                {player.headshotUrl ? (
                  <Image
                    src={player.headshotUrl}
                    alt=""
                    fill
                    className="object-cover object-top"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50" />
                )}

                {/* Name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-1 px-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {player.name}
                  </p>
                </div>

                <button
                  onClick={() => handleRemovePlayer(i)}
                  className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center
                    bg-background/80 text-muted-foreground hover:text-destructive
                    opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {category.players.length < 4 && (
              <button
                onClick={() => setIsPlayerSearchOpen(true)}
                className="h-16 sm:h-20 flex items-center justify-center border-3 border-dashed border-border
                  text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Inline errors */}
        {errors.length > 0 && (
          <div className="text-xs text-destructive flex flex-col gap-0.5">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
      </div>

      <PlayerSearch
        open={isPlayerSearchOpen}
        onOpenChange={setIsPlayerSearchOpen}
        onSelectPlayer={handleAddPlayer}
        existingPlayerIds={existingPlayerIds}
      />
    </div>
  )
}
