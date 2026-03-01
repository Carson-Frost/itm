"use client"

import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import type { ConnectionsCategory } from "@/lib/types/connections"

interface SolvedGroupProps {
  category: ConnectionsCategory
}

export function SolvedGroup({ category }: SolvedGroupProps) {
  const colors = DIFFICULTY_COLORS[category.difficulty]

  return (
    <div
      className={`${colors.bg} ${colors.text} px-4 py-3 sm:py-4 flex flex-col items-center justify-center gap-0.5`}
    >
      <p className="font-bold text-base sm:text-lg uppercase tracking-wide leading-tight">
        {category.name}
      </p>
      <p className="text-xs sm:text-sm leading-snug">
        {category.players.map((p) => p.name).join(", ")}
      </p>
    </div>
  )
}
