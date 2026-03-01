"use client"

import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import type { ConnectionsPuzzle } from "@/lib/types/connections"

interface PuzzleCategoryStackProps {
  puzzle: ConnectionsPuzzle
  size?: "sm" | "md"
  showAuthor?: boolean
}

function getAuthorUsername(email: string): string {
  return email.split("@")[0]
}

export function PuzzleCategoryStack({
  puzzle,
  size = "sm",
  showAuthor = true,
}: PuzzleCategoryStackProps) {
  const sorted = [...(puzzle.categories || [])]
    .sort((a, b) => a.difficulty - b.difficulty)

  const rows = [1, 2, 3, 4].map((diff) => {
    const cat = sorted.find((c) => c.difficulty === diff)
    return { difficulty: diff, name: cat?.name || null }
  })

  const textSize = size === "sm" ? "text-[11px]" : "text-xs"
  const barWidth = size === "sm" ? "w-[3px]" : "w-1"
  const gap = size === "sm" ? "gap-0" : "gap-0.5"

  return (
    <div className="flex flex-col gap-0.5">
      {/* Title */}
      {puzzle.title ? (
        <p className="text-sm font-medium leading-tight truncate">{puzzle.title}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground leading-tight">Untitled</p>
      )}

      {/* Author */}
      {showAuthor && puzzle.createdBy?.email && (
        <p className="text-[11px] text-muted-foreground leading-tight truncate">
          {getAuthorUsername(puzzle.createdBy.email)}
        </p>
      )}

      {/* Category rows */}
      <div className={`flex flex-col ${gap} ${showAuthor || puzzle.title ? "mt-1" : ""}`}>
        {rows.map((row) => {
          const colors = DIFFICULTY_COLORS[row.difficulty]
          return (
            <div key={row.difficulty} className="flex items-center gap-1.5">
              <div className={`${barWidth} h-3.5 shrink-0 ${colors.bg}`} />
              {row.name ? (
                <span className={`${textSize} font-medium truncate leading-tight`}>
                  {row.name}
                </span>
              ) : (
                <span className={`${textSize} text-muted-foreground/40 italic leading-tight`}>
                  —
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MiniCategoryBarsProps {
  puzzle: ConnectionsPuzzle
}

export function MiniCategoryBars({ puzzle }: MiniCategoryBarsProps) {
  const sorted = [...(puzzle.categories || [])]
    .sort((a, b) => a.difficulty - b.difficulty)

  const rows = [1, 2, 3, 4].map((diff) => {
    const cat = sorted.find((c) => c.difficulty === diff)
    return { difficulty: diff, name: cat?.name || null }
  })

  return (
    <div className="flex flex-col gap-px">
      {rows.map((row) => {
        const colors = DIFFICULTY_COLORS[row.difficulty]
        return (
          <div key={row.difficulty} className={`${colors.bg} h-1 w-full`} />
        )
      })}
    </div>
  )
}
