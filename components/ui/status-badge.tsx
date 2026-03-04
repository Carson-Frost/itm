import { Badge } from "@/components/ui/badge"
import type { ReactNode } from "react"

interface StatusBadgeProps {
  children: ReactNode
}

const baseClasses = "text-[10px] leading-none py-0 px-1.5"

export function DraftBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-muted text-muted-foreground border-border`}>
      {children}
    </Badge>
  )
}

export function ReadyBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30`}>
      {children}
    </Badge>
  )
}

export function ScheduledBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30`}>
      {children}
    </Badge>
  )
}

export function BacklogBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30`}>
      {children}
    </Badge>
  )
}

export function ActiveBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-primary/10 text-primary border-primary/30`}>
      {children}
    </Badge>
  )
}

export function ArchivedBadge({ children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${baseClasses} bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30`}>
      {children}
    </Badge>
  )
}
