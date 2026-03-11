"use client"

import { useState, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { GameSetup } from "./components/game-setup"
import { DraftBoard } from "./components/draft-board"
import { FinalResults } from "./components/final-results"
import type {
  TriviaDraftSettings,
  GameSession,
  DraftResult,
} from "@/lib/types/trivia-draft"

export default function TriviaDraftPage() {
  const [session, setSession] = useState<GameSession | null>(null)

  const handleStart = useCallback(
    (settings: TriviaDraftSettings, categoryIds: string[], penaltyPoints: number) => {
      const newSession: GameSession = {
        settings,
        drafts: [],
        usedPlayerSeasons: [],
        currentDraftIndex: 0,
        categoryIds,
        phase: "drafting",
        penaltyPoints,
      }
      setSession(newSession)
    },
    []
  )

  const handleSessionUpdate = useCallback((updated: GameSession) => {
    setSession(updated)
  }, [])

  const handlePlayAgain = useCallback(() => {
    setSession(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          {!session ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold underline mb-6">
                Trivia Draft
              </h1>
              <GameSetup onStart={handleStart} />
            </>
          ) : session.phase === "final-results" ? (
            <FinalResults
              session={session}
              onPlayAgain={handlePlayAgain}
            />
          ) : (
            <DraftBoard
              session={session}
              onSessionUpdate={handleSessionUpdate}
            />
          )}
        </div>
      </main>
    </div>
  )
}
