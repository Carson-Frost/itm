"use client"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { CircleHelp, BarChart3, CalendarDays } from "lucide-react"

interface GameHeaderProps {
  date: string
  onOpenHelp: () => void
  onOpenStats: () => void
  onOpenCalendar: () => void
}

export function GameHeader({
  date,
  onOpenHelp,
  onOpenStats,
  onOpenCalendar,
}: GameHeaderProps) {
  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
    "default",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  )

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <div className="flex items-baseline gap-3 w-full justify-center">
        <h1 className="text-2xl font-bold tracking-wide">ITM Connections</h1>
        <span className="text-sm text-muted-foreground">{formattedDate}</span>
      </div>

      <Separator />

      <div className="flex items-center justify-between w-full">
        <p className="text-xs text-muted-foreground">
          Create four groups of four!
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenHelp}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenStats}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenCalendar}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
