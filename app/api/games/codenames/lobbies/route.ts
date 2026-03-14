import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { CodenamesSettings, LobbyPlayer } from "@/lib/types/codenames"
import { DEFAULT_SETTINGS } from "@/lib/types/codenames"

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function generatePlayerId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// POST: Create a new lobby
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hostName } = body

    if (!hostName || typeof hostName !== "string" || hostName.trim().length === 0) {
      return NextResponse.json({ error: "Host name is required" }, { status: 400 })
    }

    const db = getAdminFirestore()

    // Generate unique lobby code
    let code = generateLobbyCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.collection("codenames_lobbies").where("code", "==", code).limit(1).get()
      if (existing.empty) break
      code = generateLobbyCode()
      attempts++
    }

    const hostId = generatePlayerId()
    const hostPlayer: LobbyPlayer = {
      id: hostId,
      name: hostName.trim(),
      team: "red",
      role: "spymaster",
    }

    const settings: CodenamesSettings = { ...DEFAULT_SETTINGS }

    const lobbyData = {
      code,
      hostId,
      players: [hostPlayer],
      settings,
      gameState: null,
      status: "waiting",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await db.collection("codenames_lobbies").doc(code).set(lobbyData)

    return NextResponse.json({ code, playerId: hostId })
  } catch (error) {
    console.error("Create codenames lobby error:", error)
    return NextResponse.json({ error: "Failed to create lobby" }, { status: 500 })
  }
}
