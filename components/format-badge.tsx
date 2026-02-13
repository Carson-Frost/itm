"use client"

import { cn } from "@/lib/utils"
import { ScoringFormat, QBFormat } from "@/lib/types/ranking-schemas"

// Scoring format badge — intensity scales with reception value
const scoringLabels: Record<ScoringFormat, string> = {
  PPR: "PPR",
  Half: "Half",
  STD: "STD",
}

const scoringStyles: Record<ScoringFormat, string> = {
  STD: "bg-muted text-muted-foreground border border-blue-500/40",
  Half: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  PPR: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40",
}

export function ScoringBadge({ scoring, className }: { scoring: ScoringFormat; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold leading-none pt-px h-4 px-1.5 rounded-full shrink-0",
        scoringStyles[scoring],
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

const qbStyles: Record<QBFormat, string> = {
  "1qb": "bg-muted text-muted-foreground border border-purple-500/40",
  superflex: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  "2qb": "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40",
}

export function QBFormatBadge({ qbFormat, className }: { qbFormat: QBFormat; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold leading-none pt-px h-4 px-1.5 rounded-full shrink-0",
        qbStyles[qbFormat],
        className
      )}
    >
      {qbLabels[qbFormat]}
    </span>
  )
}

// TE premium badge — intensity scales with premium level
const tepLabels: Record<number, string> = {
  0.5: "+0.5 TEP",
  1: "+1 TEP",
}

const tepStyles: Record<number, string> = {
  0: "bg-muted text-muted-foreground border border-amber-500/40",
  0.5: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  1: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40",
}

export function TEPremiumBadge({ tePremium, className }: { tePremium: number; className?: string }) {
  const label = tepLabels[tePremium] || "No TEP"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-semibold leading-none pt-px h-4 px-1.5 rounded-full shrink-0",
        tepStyles[tePremium] || tepStyles[0],
        className
      )}
    >
      {label}
    </span>
  )
}
