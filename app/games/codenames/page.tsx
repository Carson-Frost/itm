"use client"

import { useState, useCallback, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, LogIn, Loader2 } from "lucide-react"
import { GameLobby } from "./components/game-lobby"
import { GameBoard } from "./components/game-board"
import type { CodenamesLobby } from "@/lib/types/codenames"

type View = "menu" | "lobby" | "game"

export default function CodenamesPage() {
  const [view, setView] = useState<View>("menu")
  const [lobby, setLobby] = useState<CodenamesLobby | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [lobbyCode, setLobbyCode] = useState<string | null>(null)

  // Menu state
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [joinName, setJoinName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  // Restore session from sessionStorage
  useEffect(() => {
    const savedCode = sessionStorage.getItem("codenames-code")
    const savedPlayerId = sessionStorage.getItem("codenames-playerId")
    if (savedCode && savedPlayerId) {
      setLobbyCode(savedCode)
      setPlayerId(savedPlayerId)
      setView("lobby")
    }
  }, [])

  // Fetch lobby data
  const fetchLobby = useCallback(async () => {
    if (!lobbyCode || !playerId) return
    try {
      const res = await fetch(
        `/api/games/codenames/lobbies/${lobbyCode}?playerId=${playerId}`
      )
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Lobby no longer exists")
          sessionStorage.removeItem("codenames-code")
          sessionStorage.removeItem("codenames-playerId")
          setView("menu")
          return
        }
        throw new Error("Failed to fetch")
      }
      const data = await res.json()
      setLobby(data.lobby)

      if (data.lobby.status === "playing" || data.lobby.status === "finished") {
        setView("game")
      }
    } catch {
      // silent - polling will retry
    }
  }, [lobbyCode, playerId])

  // Initial fetch when code/playerId are set
  useEffect(() => {
    if (lobbyCode && playerId) {
      fetchLobby()
    }
  }, [lobbyCode, playerId, fetchLobby])

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/games/codenames/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: createName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create lobby")
      const data = await res.json()

      sessionStorage.setItem("codenames-code", data.code)
      sessionStorage.setItem("codenames-playerId", data.playerId)
      setLobbyCode(data.code)
      setPlayerId(data.playerId)
      setView("lobby")
    } catch {
      toast.error("Failed to create lobby")
    } finally {
      setIsCreating(false)
    }
  }, [createName])

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim() || !joinName.trim()) return
    setIsJoining(true)
    try {
      const res = await fetch(`/api/games/codenames/lobbies/${joinCode.trim().toUpperCase()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", playerName: joinName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to join")
        setIsJoining(false)
        return
      }
      const data = await res.json()
      const code = joinCode.trim().toUpperCase()

      sessionStorage.setItem("codenames-code", code)
      sessionStorage.setItem("codenames-playerId", data.playerId)
      setLobbyCode(code)
      setPlayerId(data.playerId)
      setView("lobby")
    } catch {
      toast.error("Failed to join lobby")
    } finally {
      setIsJoining(false)
    }
  }, [joinCode, joinName])

  const handleLeave = useCallback(() => {
    sessionStorage.removeItem("codenames-code")
    sessionStorage.removeItem("codenames-playerId")
    setView("menu")
    setLobby(null)
    setPlayerId(null)
    setLobbyCode(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          {view === "menu" && (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold underline mb-8">
                Codenames
              </h1>

              <div className="max-w-md mx-auto space-y-8">
                {/* Create lobby */}
                <section className="space-y-3">
                  <h2 className="text-lg font-bold">Create Game</h2>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="off"
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && createName.trim()) handleCreate()
                    }}
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={!createName.trim() || isCreating}
                    className="btn-chamfer w-full h-11 gap-2 font-bold"
                  >
                    {isCreating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Create Lobby
                  </Button>
                </section>

                <div className="flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">or</span>
                  <Separator className="flex-1" />
                </div>

                {/* Join lobby */}
                <section className="space-y-3">
                  <h2 className="text-lg font-bold">Join Game</h2>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Lobby code"
                    autoComplete="off"
                    className="h-11 font-mono text-center text-lg tracking-[0.3em] uppercase"
                    maxLength={5}
                  />
                  <Input
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="off"
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && joinCode.trim() && joinName.trim()) handleJoin()
                    }}
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={!joinCode.trim() || !joinName.trim() || isJoining}
                    variant="outline"
                    className="w-full h-11 gap-2 font-bold"
                  >
                    {isJoining ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogIn className="size-4" />
                    )}
                    Join Lobby
                  </Button>
                </section>
              </div>
            </>
          )}

          {view === "lobby" && lobby && playerId && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold underline">
                  Codenames
                </h1>
                <Button variant="outline" size="sm" onClick={handleLeave}>
                  Leave
                </Button>
              </div>
              <GameLobby
                lobby={lobby}
                playerId={playerId}
                onRefresh={fetchLobby}
                onGameStart={() => setView("game")}
              />
            </>
          )}

          {view === "lobby" && !lobby && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full max-w-2xl mx-auto" />
            </div>
          )}

          {view === "game" && lobby && playerId && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl sm:text-2xl font-bold underline">
                  Codenames
                </h1>
                <Button variant="outline" size="sm" onClick={handleLeave}>
                  Leave
                </Button>
              </div>
              <GameBoard
                lobby={lobby}
                playerId={playerId}
                onRefresh={fetchLobby}
              />
            </>
          )}

          {view === "game" && !lobby && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-96 w-full" />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
