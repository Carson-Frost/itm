import { Badge } from "@/components/ui/badge"

const baseClasses = "text-[10px] leading-none py-0 px-1.5 font-medium"

export type PuzzleStatus = "draft" | "ready" | "scheduled" | "ondeck" | "active" | "archived"

const STATUS_CONFIG: Record<PuzzleStatus, { bg: string; text: string; border: string; label: string }> = {
  draft: {
    bg: "bg-neutral-100 dark:bg-neutral-800/50",
    text: "text-neutral-700 dark:text-neutral-400",
    border: "border-neutral-400 dark:border-neutral-600",
    label: "Draft",
  },
  ready: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-500/30",
    label: "Ready",
  },
  scheduled: {
    bg: "bg-orange-100 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-500/30",
    label: "Scheduled",
  },
  ondeck: {
    bg: "bg-yellow-100 dark:bg-yellow-500/10",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-300 dark:border-yellow-500/30",
    label: "On Deck",
  },
  active: {
    bg: "bg-green-100 dark:bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-300 dark:border-green-500/30",
    label: "Active",
  },
  archived: {
    bg: "bg-purple-100 dark:bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-500/30",
    label: "Archived",
  },
}

export interface StatusBadgeProps {
  status: PuzzleStatus | string
  children?: never // Children not allowed - use status prop instead
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as PuzzleStatus]

  if (!config) {
    // Error badge for invalid status
    return (
      <Badge variant="outline" className={`${baseClasses} bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30`}>
        "{status}"
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`${baseClasses} ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </Badge>
  )
}

// Legacy exports for backward compatibility - deprecated
export function DraftBadge({ children }: { children: React.ReactNode }) {
  console.warn("DraftBadge is deprecated. Use <StatusBadge status='draft' /> instead.")
  return <StatusBadge status="draft" />
}

export function ReadyBadge({ children }: { children: React.ReactNode }) {
  console.warn("ReadyBadge is deprecated. Use <StatusBadge status='ready' /> instead.")
  return <StatusBadge status="ready" />
}

export function ScheduledBadge({ children }: { children: React.ReactNode }) {
  console.warn("ScheduledBadge is deprecated. Use <StatusBadge status='scheduled' /> instead.")
  return <StatusBadge status="scheduled" />
}

export function BacklogBadge({ children }: { children: React.ReactNode }) {
  console.warn("BacklogBadge is deprecated. Use <StatusBadge status='ondeck' /> instead.")
  return <StatusBadge status="ondeck" />
}

export function OnDeckBadge({ children }: { children: React.ReactNode }) {
  console.warn("OnDeckBadge is deprecated. Use <StatusBadge status='ondeck' /> instead.")
  return <StatusBadge status="ondeck" />
}

export function ActiveBadge({ children }: { children: React.ReactNode }) {
  console.warn("ActiveBadge is deprecated. Use <StatusBadge status='active' /> instead.")
  return <StatusBadge status="active" />
}

export function ArchivedBadge({ children }: { children: React.ReactNode }) {
  console.warn("ArchivedBadge is deprecated. Use <StatusBadge status='archived' /> instead.")
  return <StatusBadge status="archived" />
}
