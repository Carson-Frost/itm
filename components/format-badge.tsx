"use client"

import { cn } from "@/lib/utils"
import { ScoringFormat, QBFormat } from "@/lib/types/ranking-schemas"

// Scoring format badge — always active (blue)
const scoringLabels: Record<ScoringFormat, string> = {
  PPR: "PPR",
  Half: "Half",
  STD: "STD",
}

export function ScoringBadge({ scoring, className }: { scoring: ScoringFormat; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold h-4 px-1.5 rounded-full shrink-0",
        "bg-blue-500/20 text-blue-600 dark:text-blue-400",
        className
      )}
    >
      {scoringLabels[scoring]}
    </span>
  )
}

// QB format badge — colored when SF/2QB, muted when 1QB
const qbLabels: Record<QBFormat, string> = {
  superflex: "SF",
  "2qb": "2QB",
  "1qb": "1QB",
}

export function QBFormatBadge({ qbFormat, className }: { qbFormat: QBFormat; className?: string }) {
  const active = qbFormat !== "1qb"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold h-4 px-1.5 rounded-full shrink-0",
        active
          ? "bg-purple-500/20 text-purple-600 dark:text-purple-400"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {qbLabels[qbFormat]}
    </span>
  )
}

// TE premium badge — colored when TEP+/TEP++, muted when none
const tepLabels: Record<number, string> = {
  0.5: "TEP+",
  1: "TEP++",
}

export function TEPremiumBadge({ tePremium, className }: { tePremium: number; className?: string }) {
  const active = tePremium > 0
  const label = tepLabels[tePremium] || "No TEP"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold h-4 px-1.5 rounded-full shrink-0",
        active
          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  )
}
