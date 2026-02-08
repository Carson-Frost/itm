"use client"

import { cn } from "@/lib/utils"

type Position = "QB" | "RB" | "WR" | "TE"

interface PositionBadgeProps {
  position: Position | string
  className?: string
}

const positionColors: Record<string, string> = {
  QB: "bg-[var(--position-qb)]",
  RB: "bg-[var(--position-rb)]",
  WR: "bg-[var(--position-wr)]",
  TE: "bg-[var(--position-te)]",
}

export function PositionBadge({ position, className }: PositionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold h-4 px-1.5 rounded-full text-white shrink-0",
        positionColors[position] || "bg-muted",
        className
      )}
    >
      {position}
    </span>
  )
}
