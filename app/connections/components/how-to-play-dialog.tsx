"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"

interface HowToPlayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowToPlayDialog({ open, onOpenChange }: HowToPlayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>How to Play</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <p>
            Find groups of four NFL players that share something in common.
          </p>

          <ul className="flex flex-col gap-2 text-sm">
            <li>Select four players and tap <strong>Submit</strong> to check if they belong to the same group.</li>
            <li>Find all four groups without making 4 mistakes!</li>
          </ul>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              DIFFICULTY
            </p>
            <div className="flex flex-col gap-1">
              {([1, 2, 3, 4] as const).map((d) => {
                const colors = DIFFICULTY_COLORS[d]
                return (
                  <div
                    key={d}
                    className={`${colors.bg} ${colors.text} px-3 py-1.5 text-xs font-semibold`}
                  >
                    {colors.label}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Categories are ordered from easiest (yellow) to hardest (purple).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
