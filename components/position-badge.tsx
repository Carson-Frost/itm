"use client"

import { cn } from "@/lib/utils"

type Position = "QB" | "RB" | "WR" | "TE"

interface PositionBadgeProps {
  position: Position | string
  size?: "compact" | "expanded"
  className?: string
}

const positionStyles: Record<string, string> = {
  QB: "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500",
  RB: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500",
  WR: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500",
  TE: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500",
}

export function PositionBadge({ position, size = "compact", className }: PositionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold leading-none pt-px shrink-0",
        size === "compact" ? "h-[18px] w-[30px] text-[10px] rounded-full" : "h-6 w-10 text-sm rounded-full",
        positionStyles[position] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {position}
    </span>
  )
}
