"use client"

import { memo } from "react"
import { Skull } from "lucide-react"
import type { CodenamesCard, TeamColor } from "@/lib/types/codenames"
import { TEAM_COLORS } from "@/lib/types/codenames"
import { cn } from "@/lib/utils"

interface GameCardProps {
  card: CodenamesCard
  isSpymaster: boolean
  isMyTurn: boolean
  canGuess: boolean
  onClick: () => void
}

export const GameCard = memo(function GameCard({
  card,
  isSpymaster,
  isMyTurn,
  canGuess,
  onClick,
}: GameCardProps) {
  const isClickable = !card.isRevealed && canGuess && isMyTurn && !isSpymaster

  // Spymaster sees color coding on unrevealed cards
  const spymasterBorder = isSpymaster && !card.isRevealed
    ? card.assignment === "red"
      ? "border-red-500"
      : card.assignment === "blue"
        ? "border-blue-500"
        : card.assignment === "assassin"
          ? "border-foreground"
          : "border-border/40"
    : ""

  const spymasterBg = isSpymaster && !card.isRevealed
    ? card.assignment === "red"
      ? "bg-red-600/8"
      : card.assignment === "blue"
        ? "bg-blue-600/8"
        : card.assignment === "assassin"
          ? "bg-foreground/8"
          : ""
    : ""

  // Revealed card styling
  const revealedStyle = card.isRevealed
    ? card.assignment === "red"
      ? "border-red-600 bg-red-600/20"
      : card.assignment === "blue"
        ? "border-blue-600 bg-blue-600/20"
        : card.assignment === "assassin"
          ? "border-foreground bg-foreground/20"
          : "border-muted-foreground/30 bg-muted/40"
    : ""

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden border-3 transition-all select-none group",
        card.isRevealed && revealedStyle,
        !card.isRevealed && !spymasterBorder && "border-border/40 bg-muted/20",
        !card.isRevealed && spymasterBorder,
        !card.isRevealed && spymasterBg,
        isClickable && "hover:border-primary hover:bg-muted/40 cursor-pointer",
        !isClickable && "cursor-default",
        card.isRevealed && "opacity-75",
      )}
    >
      {/* Image area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {card.isRevealed && card.assignment === "assassin" ? (
          <Skull className="size-8 sm:size-12 text-foreground/60" />
        ) : card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover object-top",
              card.isRevealed && "grayscale-[30%]",
            )}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <span className="text-muted-foreground/40 text-2xl sm:text-3xl font-bold">
              {card.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Spymaster indicator dot */}
      {isSpymaster && !card.isRevealed && card.assignment !== "neutral" && (
        <div className="absolute top-1.5 right-1.5 z-20">
          <div
            className={cn(
              "size-2.5 sm:size-3",
              card.assignment === "red" && "bg-red-500",
              card.assignment === "blue" && "bg-blue-500",
              card.assignment === "assassin" && "bg-foreground",
            )}
          />
        </div>
      )}

      {/* Revealed team overlay bar */}
      {card.isRevealed && card.assignment !== "neutral" && card.assignment !== "assassin" && (
        <div
          className={cn(
            "absolute top-0 inset-x-0 h-1.5 z-20",
            card.assignment === "red" && "bg-red-500",
            card.assignment === "blue" && "bg-blue-500",
          )}
        />
      )}

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-1">
        <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {card.name}
        </p>
        {card.subtitle && (
          <p className="text-[7px] sm:text-[9px] text-white/60 text-center leading-tight mt-0.5 font-medium tracking-wider">
            {card.subtitle}
          </p>
        )}
      </div>
    </button>
  )
})
