"use client"

import { memo } from "react"
import { Skull } from "lucide-react"
import type { CodenamesCard, CardAssignment, GameMode } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

function getCardStyles(
  assignment: CardAssignment,
  isRevealed: boolean,
  showHints: boolean,
): { borderClass: string; glowStyle: string } {
  if (isRevealed) {
    switch (assignment) {
      case "red":
        return { borderClass: "border-red-400", glowStyle: "inset 0 0 20px -2px rgba(248,113,113,0.45)" }
      case "blue":
        return { borderClass: "border-blue-400", glowStyle: "inset 0 0 20px -2px rgba(96,165,250,0.45)" }
      case "green":
        return { borderClass: "border-emerald-400", glowStyle: "inset 0 0 20px -2px rgba(52,211,153,0.45)" }
      case "assassin":
        return { borderClass: "border-zinc-900", glowStyle: "inset 0 0 20px -2px rgba(0,0,0,0.7)" }
      default:
        return { borderClass: "border-zinc-600/30", glowStyle: "" }
    }
  }
  if (showHints) {
    switch (assignment) {
      case "red":
        return { borderClass: "border-red-400", glowStyle: "inset 0 0 14px -2px rgba(248,113,113,0.25)" }
      case "blue":
        return { borderClass: "border-blue-400", glowStyle: "inset 0 0 14px -2px rgba(96,165,250,0.25)" }
      case "green":
        return { borderClass: "border-emerald-400", glowStyle: "inset 0 0 14px -2px rgba(52,211,153,0.25)" }
      case "assassin":
        return { borderClass: "border-zinc-900", glowStyle: "inset 0 0 14px -2px rgba(0,0,0,0.5)" }
    }
  }
  return { borderClass: "border-zinc-600/30", glowStyle: "" }
}

interface GameCardProps {
  card: CodenamesCard
  isSpymaster: boolean
  isMyTurn: boolean
  canGuess: boolean
  gameMode: GameMode
  onClick: () => void
}

export const GameCard = memo(function GameCard({
  card, isSpymaster, isMyTurn, canGuess, gameMode, onClick,
}: GameCardProps) {
  const isClickable = !card.isRevealed && canGuess && isMyTurn && (gameMode === "duet" || !isSpymaster)
  const isDuet = gameMode === "duet"
  const a = card.assignment
  const showHints = !card.isRevealed && (isSpymaster || isDuet) && a !== "neutral"
  const isTeamRevealed = card.isRevealed && a !== "neutral"

  const { borderClass, glowStyle } = getCardStyles(a, card.isRevealed, showHints)

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "aspect-square border-[5px] relative overflow-hidden bg-card/80 transition-all duration-150 select-none",
        borderClass,
        isClickable && "cursor-pointer hover:scale-105 hover:brightness-110 active:scale-[0.97]",
        !isClickable && "cursor-default",
        card.isRevealed && a === "neutral" && "opacity-35",
      )}
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0">
        {card.isRevealed && a === "assassin" ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <Skull
              className="size-10 sm:size-14 lg:size-16 text-white/70"
              style={{ filter: "drop-shadow(0 0 14px rgba(255,255,255,0.3)) drop-shadow(0 0 6px rgba(255,255,255,0.15))" }}
            />
          </div>
        ) : card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover object-top",
              card.isRevealed && "brightness-[0.25] grayscale-[80%]",
            )}
          />
        ) : (
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-muted-foreground/25">
              {card.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Inner shadow for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 12px 0 rgba(0,0,0,0.5)" }}
      />

      {/* Team glow overlay */}
      {glowStyle && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ boxShadow: glowStyle }}
        />
      )}

      {/* Revealed team badge */}
      {isTeamRevealed && a !== "assassin" && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="size-12 sm:size-14 lg:size-16 flex items-center justify-center text-white font-black text-lg sm:text-xl lg:text-2xl border-2 border-white/30"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(6px)",
            }}
          >
            {a === "red" ? "R" : a === "blue" ? "B" : "G"}
          </div>
        </div>
      )}

      {/* Name overlay — gradient from bottom, directly on image */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-1.5">
        <p className={cn(
          "text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wide text-center leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]",
          isTeamRevealed ? "text-white/80" : "text-white",
        )}>
          {card.name}
        </p>
      </div>
    </button>
  )
})
