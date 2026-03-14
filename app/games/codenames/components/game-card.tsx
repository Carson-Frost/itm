"use client"

import { memo } from "react"
import { Skull } from "lucide-react"
import type { CodenamesCard, GameMode } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"
import { PositionBadge } from "@/components/position-badge"

interface GameCardProps {
  card: CodenamesCard
  isSpymaster: boolean
  isMyTurn: boolean
  canGuess: boolean
  gameMode: GameMode
  onClick: () => void
}

export const GameCard = memo(function GameCard({
  card,
  isSpymaster,
  isMyTurn,
  canGuess,
  gameMode,
  onClick,
}: GameCardProps) {
  const isClickable = !card.isRevealed && canGuess && isMyTurn && (gameMode === "duet" || !isSpymaster)
  const isDuet = gameMode === "duet"

  // Extract position from subtitle (e.g. "QB - KC" -> "QB")
  const position = card.contentType === "player" && card.subtitle
    ? card.subtitle.split(" - ")[0]
    : null

  // --- Spymaster border color (classic) or duet key color ---
  const getUnrevealedBorder = () => {
    if (card.isRevealed) return ""
    if (isDuet) {
      if (card.assignment === "green") return "border-emerald-500"
      if (card.assignment === "assassin") return "border-foreground"
      return ""
    }
    if (!isSpymaster) return ""
    if (card.assignment === "red") return "border-red-500"
    if (card.assignment === "blue") return "border-blue-500"
    if (card.assignment === "assassin") return "border-foreground"
    return ""
  }

  const getUnrevealedBg = () => {
    if (card.isRevealed) return ""
    if (isDuet) {
      if (card.assignment === "green") return "bg-emerald-600/8"
      if (card.assignment === "assassin") return "bg-foreground/8"
      return ""
    }
    if (!isSpymaster) return ""
    if (card.assignment === "red") return "bg-red-600/8"
    if (card.assignment === "blue") return "bg-blue-600/8"
    if (card.assignment === "assassin") return "bg-foreground/8"
    return ""
  }

  const unrevealedBorder = getUnrevealedBorder()
  const unrevealedBg = getUnrevealedBg()

  // --- Revealed styling ---
  const getRevealedStyle = () => {
    if (!card.isRevealed) return ""
    if (card.assignment === "red") return "border-red-600 ring-1 ring-red-600/30"
    if (card.assignment === "blue") return "border-blue-600 ring-1 ring-blue-600/30"
    if (card.assignment === "green") return "border-emerald-500 ring-1 ring-emerald-500/30"
    if (card.assignment === "assassin") return "border-foreground ring-1 ring-foreground/30"
    return "border-muted-foreground/30"
  }

  // Show indicator dot for non-neutral unrevealed cards
  const showDot = !card.isRevealed && card.assignment !== "neutral" && (isSpymaster || isDuet)

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "relative aspect-square overflow-hidden border-3 transition-all select-none group",
        // Base unrevealed
        !card.isRevealed && !unrevealedBorder && "border-amber-700/40",
        !card.isRevealed && unrevealedBorder,
        !card.isRevealed && unrevealedBg,
        !card.isRevealed && !unrevealedBg && "bg-amber-900/5",
        // Revealed
        card.isRevealed && getRevealedStyle(),
        // Interactive
        isClickable && "hover:border-primary hover:scale-[1.03] cursor-pointer",
        !isClickable && "cursor-default",
      )}
    >
      {/* Headshot / image area — fills entire card */}
      <div className="absolute inset-0">
        {card.isRevealed && card.assignment === "assassin" ? (
          <div className="w-full h-full bg-foreground/15 flex items-center justify-center">
            <Skull className="size-8 sm:size-10 lg:size-12 text-foreground/70" />
          </div>
        ) : card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover object-top",
              card.isRevealed && "grayscale-[50%] brightness-50",
            )}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <span className="text-muted-foreground/40 text-2xl sm:text-3xl lg:text-4xl font-bold">
              {card.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Revealed: team color overlay */}
      {card.isRevealed && card.assignment !== "neutral" && card.assignment !== "assassin" && (
        <div className={cn(
          "absolute inset-0 z-[1]",
          card.assignment === "red" && "bg-red-600/30",
          card.assignment === "blue" && "bg-blue-600/30",
          card.assignment === "green" && "bg-emerald-600/30",
        )} />
      )}

      {/* Revealed: team color strip at top */}
      {card.isRevealed && card.assignment !== "neutral" && (
        <div className={cn(
          "absolute top-0 inset-x-0 h-1 z-20",
          card.assignment === "red" && "bg-red-500",
          card.assignment === "blue" && "bg-blue-500",
          card.assignment === "green" && "bg-emerald-500",
          card.assignment === "assassin" && "bg-foreground",
        )} />
      )}

      {/* Position badge — top-left */}
      {position && !card.isRevealed && (
        <div className="absolute top-1 left-1 z-20">
          <PositionBadge position={position} size="compact" />
        </div>
      )}

      {/* Spymaster/duet indicator dot — top-right */}
      {showDot && (
        <div className="absolute top-1.5 right-1.5 z-20">
          <div className={cn(
            "size-2 sm:size-2.5",
            card.assignment === "red" && "bg-red-500",
            card.assignment === "blue" && "bg-blue-500",
            card.assignment === "green" && "bg-emerald-500",
            card.assignment === "assassin" && "bg-foreground",
          )} />
        </div>
      )}

      {/* Name overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 sm:pt-8 pb-1 sm:pb-1.5 px-1">
        <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {card.name}
        </p>
      </div>
    </button>
  )
})
