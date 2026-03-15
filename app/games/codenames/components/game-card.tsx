"use client"

import { memo, useState } from "react"
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
        return { borderClass: "border-red-400", glowStyle: "" }
      case "blue":
        return { borderClass: "border-blue-400", glowStyle: "" }
      case "green":
        return { borderClass: "border-emerald-400", glowStyle: "" }
      case "assassin":
        return { borderClass: "border-black", glowStyle: "" }
      default:
        return { borderClass: "border-zinc-500/40", glowStyle: "" }
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
        return { borderClass: "border-black", glowStyle: "" }
    }
  }
  return { borderClass: "border-zinc-500/40", glowStyle: "" }
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
  const [isPeeking, setIsPeeking] = useState(false)

  const isDuet = gameMode === "duet"
  const a = card.assignment
  const showHints = !card.isRevealed && (isSpymaster || isDuet) && a !== "neutral"
  const isAssassinHint = showHints && a === "assassin"
  const isAssassinCard = a === "assassin" && (showHints || card.isRevealed)
  const isLogoCard = card.contentType === "team" || card.contentType === "college"
  const isTeamRevealed = card.isRevealed && (a === "red" || a === "blue" || a === "green")
  const isClickable = !card.isRevealed && canGuess && isMyTurn && (gameMode === "duet" || !isSpymaster)

  const { borderClass, glowStyle } = getCardStyles(a, card.isRevealed, showHints)

  const handleClick = () => {
    if (isTeamRevealed) {
      setIsPeeking(p => !p)
    } else {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable && !isTeamRevealed}
      className={cn(
        "aspect-square border-[5px] relative overflow-hidden dark:bg-zinc-900/80 bg-card/80 transition-all duration-150 select-none",
        borderClass,
        isAssassinCard && "!bg-zinc-900",
        isClickable && "cursor-pointer hover:scale-105 hover:brightness-110 active:scale-[0.97]",
        isTeamRevealed && "cursor-pointer",
        !isClickable && !isTeamRevealed && "cursor-default",
        card.isRevealed && a === "neutral" && "opacity-35",
      )}
      style={isAssassinCard ? { boxShadow: "0 0 8px 2px rgba(255,255,255,0.12)" } : undefined}
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0">
        {card.isRevealed && a === "assassin" ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <Skull
              className="size-12 sm:size-16 lg:size-20 text-white/80"
              style={{ filter: "drop-shadow(0 0 16px rgba(255,255,255,0.4)) drop-shadow(0 0 35px rgba(255,255,255,0.15))" }}
            />
          </div>
        ) : card.imageUrl ? (
          isLogoCard ? (
            <div className={cn(
              "w-full h-full flex items-center justify-center pb-[12%]",
              card.isRevealed && a === "neutral" && "brightness-[0.25] grayscale-[80%]",
            )}>
              <img
                src={card.imageUrl}
                alt=""
                className="w-[90%] h-[90%] object-contain"
              />
            </div>
          ) : (
            <img
              src={card.imageUrl}
              alt=""
              className={cn(
                "w-full h-full object-cover object-top",
                card.isRevealed && a === "neutral" && "brightness-[0.25] grayscale-[80%]",
              )}
            />
          )
        ) : (
          <div className="w-full h-full bg-muted/50 dark:bg-zinc-800/50 flex items-center justify-center">
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

      {/* Assassin hint — dark overlay */}
      {isAssassinHint && (
        <div className="absolute inset-0 z-10 pointer-events-none bg-black/40" />
      )}

      {/* Name overlay — visible for unrevealed cards and when peeking */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-1.5">
        <p className="text-[clamp(0.55rem,1.4dvh,0.875rem)] font-bold uppercase tracking-wide text-center leading-tight line-clamp-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {card.name}
        </p>
      </div>

      {/* Revealed team overlay */}
      {isTeamRevealed && (
        <div
          className={cn(
            "absolute inset-0 z-40",
            a === "red" && "bg-red-900",
            a === "blue" && "bg-blue-900",
            a === "green" && "bg-emerald-900",
          )}
          style={{
            backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.06) 9px), radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.07), transparent 60%)",
            boxShadow: "inset 0 0 0 4px rgba(255,255,255,0.06), inset 0 0 25px rgba(0,0,0,0.15)",
          }}
        >
          {/* Name label — slides up from bottom on click */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center px-1.5 pb-1.5 sm:pb-2 transition-transform duration-250 ease-out"
            style={{
              transform: isPeeking ? "translateY(0)" : "translateY(100%)",
            }}
          >
            <div className={cn(
              "w-full py-1 sm:py-1.5 px-1",
              a === "red" && "bg-red-950",
              a === "blue" && "bg-blue-950",
              a === "green" && "bg-emerald-950",
            )}>
              <p className="text-[clamp(0.5rem,1.3dvh,0.875rem)] font-bold uppercase tracking-wide text-center leading-tight line-clamp-1 text-white/80">
                {card.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </button>
  )
})
