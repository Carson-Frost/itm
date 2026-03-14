"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import usePartySocket from "partysocket/react"
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

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999"

type View = "menu" | "connecting" | "lobby" | "game"

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function CodenamesPage() {
  const [view, setView] = useState<View>("menu")
  const [lobby, setLobby] = useState<CodenamesLobby | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<object | null>(null)

  // Menu state
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [joinName, setJoinName] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  // Restore session from sessionStorage
  useEffect(() => {
    const savedCode = sessionStorage.getItem("codenames-code")
    const savedPlayerId = sessionStorage.getItem("codenames-playerId")
    if (savedCode && savedPlayerId) {
      setRoomId(savedCode)
      setPlayerId(savedPlayerId)
      setView("connecting")
    }
  }, [])

  const handleCreate = useCallback(() => {
    if (!createName.trim()) return
    const code = generateLobbyCode()
    setIsConnecting(true)
    setPendingAction({ type: "init", hostName: createName.trim() })
    setRoomId(code)
    setView("connecting")
  }, [createName])

  const handleJoin = useCallback(() => {
    if (!joinCode.trim() || !joinName.trim()) return
    const code = joinCode.trim().toUpperCase()
    setIsConnecting(true)
    setPendingAction({ type: "join", playerName: joinName.trim() })
    setRoomId(code)
    setView("connecting")
  }, [joinCode, joinName])

  const handleLeave = useCallback(() => {
    sessionStorage.removeItem("codenames-code")
    sessionStorage.removeItem("codenames-playerId")
    setView("menu")
    setLobby(null)
    setPlayerId(null)
    setRoomId(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        {/* Menu view — centered with max-width */}
        {view === "menu" && (
          <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
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
                  disabled={!createName.trim() || isConnecting}
                  className="btn-chamfer w-full h-11 gap-2 font-bold"
                >
                  {isConnecting ? (
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
                  disabled={!joinCode.trim() || !joinName.trim() || isConnecting}
                  variant="outline"
                  className="w-full h-11 gap-2 font-bold"
                >
                  {isConnecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Join Lobby
                </Button>
              </section>
            </div>
          </div>
        )}

        {/* Connected state — WebSocket manages everything */}
        {(view === "connecting" || view === "lobby" || view === "game") && roomId && (
          <CodenamesRoom
            roomId={roomId}
            playerId={playerId}
            pendingAction={pendingAction}
            lobby={lobby}
            view={view}
            onLobbyUpdate={setLobby}
            onPlayerIdSet={(id) => {
              setPlayerId(id)
              sessionStorage.setItem("codenames-code", roomId)
              sessionStorage.setItem("codenames-playerId", id)
              setIsConnecting(false)
            }}
            onViewChange={setView}
            onLeave={handleLeave}
            onPendingActionConsumed={() => setPendingAction(null)}
          />
        )}
      </main>
    </div>
  )
}

// ---- Separate component that owns the WebSocket connection ----
function CodenamesRoom({
  roomId,
  playerId,
  pendingAction,
  lobby,
  view,
  onLobbyUpdate,
  onPlayerIdSet,
  onViewChange,
  onLeave,
  onPendingActionConsumed,
}: {
  roomId: string
  playerId: string | null
  pendingAction: object | null
  lobby: CodenamesLobby | null
  view: View
  onLobbyUpdate: (lobby: CodenamesLobby) => void
  onPlayerIdSet: (id: string) => void
  onViewChange: (view: View) => void
  onLeave: () => void
  onPendingActionConsumed: () => void
}) {
  const pendingSent = useRef(false)

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    query: playerId ? { playerId } : undefined,
    onOpen() {
      if (pendingAction && !pendingSent.current) {
        pendingSent.current = true
        socket.send(JSON.stringify(pendingAction))
        onPendingActionConsumed()
      }
    },
    onMessage(event) {
      const data = JSON.parse(event.data)

      if (data.type === "joined") {
        onPlayerIdSet(data.playerId)
      }

      if (data.type === "state") {
        const lobbyData = data.lobby as CodenamesLobby
        onLobbyUpdate(lobbyData)

        if (lobbyData.status === "playing" || lobbyData.status === "finished") {
          onViewChange("game")
        } else {
          onViewChange("lobby")
        }
      }

      if (data.type === "error") {
        toast.error(data.message)
      }
    },
  })

  const send = useCallback(
    (msg: object) => {
      socket.send(JSON.stringify(msg))
    },
    [socket]
  )

  if (view === "connecting" || !lobby || !playerId) {
    return (
      <div className="w-full max-w-[1400px] mx-auto pt-4 px-3 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl mx-auto" />
      </div>
    )
  }

  // Game view — full-width, no container constraints
  if (view === "game") {
    return <GameBoard lobby={lobby} playerId={playerId} send={send} onLeave={onLeave} />
  }

  // Lobby view — centered with max-width
  return <GameLobby lobby={lobby} playerId={playerId} send={send} onLeave={onLeave} />
}
