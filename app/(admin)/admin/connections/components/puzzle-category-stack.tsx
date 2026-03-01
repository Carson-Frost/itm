"use client"

import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import type { ConnectionsPuzzle } from "@/lib/types/connections"

interface PuzzleCategoryStackProps {
  puzzle: ConnectionsPuzzle
  layout?: "vertical" | "grid"
  showAuthor?: boolean
}

function getAuthorDisplay(createdBy: { email: string; username?: string }): string {
  return createdBy.username || createdBy.email.split("@")[0]
}

export function PuzzleCategoryStack({
  puzzle,
  layout = "vertical",
  showAuthor = true,
}: PuzzleCategoryStackProps) {
  const sorted = [...(puzzle.categories || [])]
    .sort((a, b) => a.difficulty - b.difficulty)

  const rows = [1, 2, 3, 4].map((diff) => {
    const cat = sorted.find((c) => c.difficulty === diff)
    return { difficulty: diff, name: cat?.name || null }
  })

  const containerClass = layout === "grid"
    ? "grid grid-cols-2 gap-1"
    : "flex flex-col gap-1"

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
          {getAuthorDisplay(puzzle.createdBy)}
        </p>
      )}

      {/* Category pills */}
      <div className={`${containerClass} ${showAuthor || puzzle.title ? "mt-1" : ""}`}>
        {rows.map((row) => {
          const colors = DIFFICULTY_COLORS[row.difficulty]
          const isEmpty = !row.name
          return (
            <span
              key={row.difficulty}
              className={`${colors.bg} ${colors.text} px-2 py-0.5 text-[11px] font-semibold truncate block ${isEmpty ? "opacity-30" : ""}`}
            >
              {row.name || "—"}
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface MiniCategoryPillsProps {
  puzzle: ConnectionsPuzzle
}

export function MiniCategoryPills({ puzzle }: MiniCategoryPillsProps) {
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
          <span
            key={row.difficulty}
            className={`${colors.bg} ${colors.text} text-[8px] font-semibold px-1 py-px truncate block`}
          >
            {row.name || "—"}
          </span>
        )
      })}
    </div>
  )
}
