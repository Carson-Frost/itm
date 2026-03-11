"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RotateCcw, Trophy } from "lucide-react"
import type { GameSession } from "@/lib/types/trivia-draft"
import { cn } from "@/lib/utils"

interface FinalResultsProps {
  session: GameSession
  onPlayAgain: () => void
}

export function FinalResults({ session, onPlayAgain }: FinalResultsProps) {
  const { settings, drafts } = session

  const totalScores = useMemo(() => {
    const scores: Record<string, number> = {}
    settings.players.forEach((p) => {
      scores[p.id] = 0
    })

    drafts.forEach((draft) => {
      if (!draft?.scores) return
      Object.entries(draft.scores).forEach(([playerId, score]) => {
        scores[playerId] = (scores[playerId] || 0) + score
      })
    })

    return scores
  }, [settings.players, drafts])

  const sortedPlayers = useMemo(() => {
    return [...settings.players].sort(
      (a, b) => (totalScores[b.id] || 0) - (totalScores[a.id] || 0)
    )
  }, [settings.players, totalScores])

  const maxScore = Math.max(...Object.values(totalScores))
  const winners = sortedPlayers.filter(
    (p) => totalScores[p.id] === maxScore
  )

  const isSingleDraft = drafts.length <= 1

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Winner announcement */}
      <div className="text-center space-y-3 pt-4">
        <Trophy className="size-10 text-primary mx-auto" />
        <h1 className="text-3xl font-bold">
          {winners.length === 1 ? (
            <span style={{ color: winners[0].color }}>
              {winners[0].name} Wins!
            </span>
          ) : (
            "It's a Tie!"
          )}
        </h1>
        {!isSingleDraft && (
          <p className="text-muted-foreground text-sm">
            Final standings across {drafts.length} drafts
          </p>
        )}
      </div>

      {/* Overall Standings */}
      <div className="border">
        <div className="px-4 py-3 bg-muted/30">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {isSingleDraft ? "Results" : "Final Standings"}
          </h2>
        </div>
        <Separator />
        {sortedPlayers.map((player, rank) => {
          const score = totalScores[player.id] || 0
          const isWinner = score === maxScore
          return (
            <div key={player.id}>
              <div
                className={cn(
                  "flex items-center gap-4 px-4 py-3",
                  isWinner && "bg-primary/5"
                )}
              >
                <span className="text-lg font-mono font-bold text-muted-foreground w-8">
                  #{rank + 1}
                </span>
                <div
                  className="size-4 shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-bold flex-1">{player.name}</span>
                <span className="font-mono font-bold text-xl tabular-nums">
                  {score.toFixed(1)}
                </span>
                {isWinner && (
                  <Trophy className="size-4 text-primary shrink-0" />
                )}
              </div>
              {rank < sortedPlayers.length - 1 && <Separator />}
            </div>
          )
        })}
      </div>

      {/* Per-draft breakdown (only if multiple drafts) */}
      {!isSingleDraft && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Draft Breakdown
          </h2>
          {drafts.map((draft, i) => {
            if (!draft) return null
            const draftSorted = [...settings.players].sort(
              (a, b) => (draft.scores[b.id] || 0) - (draft.scores[a.id] || 0)
            )
            return (
              <div key={i} className="border">
                <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Draft {i + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {draft.categoryName}
                  </span>
                </div>
                <Separator />
                <div className="flex flex-wrap">
                  {draftSorted.map((player, rank) => {
                    const score = draft.scores[player.id] || 0
                    const isWinner = draft.winner === player.id
                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 flex-1 min-w-[140px] border-r last:border-r-0",
                          isWinner && "bg-primary/5"
                        )}
                      >
                        <span className="text-xs font-mono text-muted-foreground">
                          #{rank + 1}
                        </span>
                        <div
                          className="size-2.5 shrink-0"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="text-sm font-medium truncate flex-1">
                          {player.name}
                        </span>
                        <span className="text-sm font-mono font-bold tabular-nums">
                          {score.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Play again */}
      <div className="flex justify-center pb-8">
        <Button
          onClick={onPlayAgain}
          className="btn-chamfer h-11 px-8 font-bold gap-2"
        >
          <RotateCcw className="size-4" />
          Play Again
        </Button>
      </div>
    </div>
  )
}
