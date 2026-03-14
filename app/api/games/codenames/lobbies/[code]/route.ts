import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type {
  CodenamesLobby,
  LobbyPlayer,
  CodenamesSettings,
  CodenamesGameState,
  CodenamesCard,
  CodenamesClue,
  TeamColor,
  CardAssignment,
  TurnEntry,
  WordPoolItem,
} from "@/lib/types/codenames"

function generatePlayerId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// GET: Fetch lobby state
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const db = getAdminFirestore()
    const doc = await db.collection("codenames_lobbies").doc(code.toUpperCase()).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Lobby not found" }, { status: 404 })
    }

    const data = doc.data()!
    const lobby: CodenamesLobby = {
      code: data.code,
      hostId: data.hostId,
      players: data.players || [],
      settings: data.settings,
      gameState: data.gameState || null,
      status: data.status,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
    }

    // For non-spymasters during active game, hide card assignments
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (lobby.gameState && lobby.status === "playing" && playerId) {
      const player = lobby.players.find((p) => p.id === playerId)
      if (!player || player.role !== "spymaster") {
        lobby.gameState.cards = lobby.gameState.cards.map((card) => ({
          ...card,
          assignment: card.isRevealed ? card.assignment : "neutral",
        }))
      }
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error("Get codenames lobby error:", error)
    return NextResponse.json({ error: "Failed to fetch lobby" }, { status: 500 })
  }
}

// PUT: Update lobby (join, settings, team changes, start game, give clue, guess)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await req.json()
    const { action } = body

    const db = getAdminFirestore()
    const docRef = db.collection("codenames_lobbies").doc(code.toUpperCase())
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Lobby not found" }, { status: 404 })
    }

    const data = doc.data()!

    switch (action) {
      case "join": {
        const { playerName } = body
        if (!playerName?.trim()) {
          return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }
        if (data.status !== "waiting") {
          return NextResponse.json({ error: "Game already started" }, { status: 400 })
        }
        const players = data.players as LobbyPlayer[]
        if (players.length >= 6) {
          return NextResponse.json({ error: "Lobby is full" }, { status: 400 })
        }

        const playerId = generatePlayerId()
        // Auto-assign to team with fewer players
        const redCount = players.filter((p) => p.team === "red").length
        const blueCount = players.filter((p) => p.team === "blue").length
        const team: TeamColor = blueCount < redCount ? "blue" : "red"
        const hasSpymaster = players.some((p) => p.team === team && p.role === "spymaster")

        const newPlayer: LobbyPlayer = {
          id: playerId,
          name: playerName.trim(),
          team,
          role: hasSpymaster ? "operative" : "spymaster",
        }

        await docRef.update({
          players: FieldValue.arrayUnion(newPlayer),
          updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ playerId })
      }

      case "update-player": {
        const { playerId, team, role } = body
        const players = (data.players as LobbyPlayer[]).map((p) => {
          if (p.id === playerId) {
            return { ...p, ...(team && { team }), ...(role && { role }) }
          }
          return p
        })
        await docRef.update({ players, updatedAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ ok: true })
      }

      case "update-settings": {
        const { settings } = body as { settings: CodenamesSettings }
        await docRef.update({ settings, updatedAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ ok: true })
      }

      case "start": {
        const { wordPool } = body as { wordPool: WordPoolItem[] }
        if (!wordPool || wordPool.length < 25) {
          return NextResponse.json({ error: "Need at least 25 words" }, { status: 400 })
        }

        const players = data.players as LobbyPlayer[]
        if (players.length < 2) {
          return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 })
        }

        // Shuffle and pick 25
        const shuffled = [...wordPool].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, 25)

        // First team (red goes first) gets 9 cards, second gets 8
        const firstTeam: TeamColor = "red"
        const assignments: CardAssignment[] = [
          ...Array(9).fill(firstTeam),
          ...Array(8).fill("blue" as CardAssignment),
          ...Array(7).fill("neutral" as CardAssignment),
          "assassin",
        ].sort(() => Math.random() - 0.5) as CardAssignment[]

        const cards: CodenamesCard[] = selected.map((item, i) => ({
          id: `card-${i}`,
          name: item.name,
          imageUrl: item.imageUrl,
          contentType: item.contentType,
          subtitle: item.subtitle,
          assignment: assignments[i],
          isRevealed: false,
          revealedBy: null,
        }))

        const gameState: CodenamesGameState = {
          cards,
          currentTeam: firstTeam,
          currentClue: null,
          guessesRemaining: 0,
          redFound: 0,
          blueFound: 0,
          redTotal: 9,
          blueTotal: 8,
          winner: null,
          winReason: null,
          turnHistory: [],
        }

        await docRef.update({
          gameState,
          status: "playing",
          updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ ok: true })
      }

      case "give-clue": {
        const { clue } = body as { clue: CodenamesClue }
        const gameState = data.gameState as CodenamesGameState
        if (!gameState || gameState.winner) {
          return NextResponse.json({ error: "Game not active" }, { status: 400 })
        }

        gameState.currentClue = clue
        gameState.guessesRemaining = clue.number + 1 // Can guess number + 1

        // Add turn entry
        gameState.turnHistory.push({
          team: clue.team,
          clue,
          guesses: [],
        })

        await docRef.update({ gameState, updatedAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ ok: true })
      }

      case "guess": {
        const { cardId, playerId } = body
        const gameState = data.gameState as CodenamesGameState
        const players = data.players as LobbyPlayer[]

        if (!gameState || gameState.winner) {
          return NextResponse.json({ error: "Game not active" }, { status: 400 })
        }

        const player = players.find((p) => p.id === playerId)
        if (!player || player.role !== "operative") {
          return NextResponse.json({ error: "Only operatives can guess" }, { status: 400 })
        }

        const card = gameState.cards.find((c) => c.id === cardId)
        if (!card || card.isRevealed) {
          return NextResponse.json({ error: "Invalid card" }, { status: 400 })
        }

        // Reveal the card
        card.isRevealed = true
        card.revealedBy = player.team

        // Update scores
        if (card.assignment === "red") gameState.redFound++
        if (card.assignment === "blue") gameState.blueFound++

        // Add to current turn history
        const currentTurn = gameState.turnHistory[gameState.turnHistory.length - 1]
        if (currentTurn && currentTurn.clue === gameState.currentClue) {
          currentTurn.guesses.push({
            cardId: card.id,
            cardName: card.name,
            result: card.assignment,
          })
        }

        let endTurn = false

        // Check win conditions
        if (card.assignment === "assassin") {
          // Team that hit assassin loses
          gameState.winner = player.team === "red" ? "blue" : "red"
          gameState.winReason = "assassin"
          // Reveal all cards
          gameState.cards.forEach((c) => { c.isRevealed = true })
        } else if (gameState.redFound === gameState.redTotal) {
          gameState.winner = "red"
          gameState.winReason = "all-found"
          gameState.cards.forEach((c) => { c.isRevealed = true })
        } else if (gameState.blueFound === gameState.blueTotal) {
          gameState.winner = "blue"
          gameState.winReason = "all-found"
          gameState.cards.forEach((c) => { c.isRevealed = true })
        } else if (card.assignment !== player.team) {
          // Wrong guess - end turn
          endTurn = true
        } else {
          // Correct guess - decrement remaining
          gameState.guessesRemaining--
          if (gameState.guessesRemaining <= 0) {
            endTurn = true
          }
        }

        if (endTurn && !gameState.winner) {
          gameState.currentTeam = gameState.currentTeam === "red" ? "blue" : "red"
          gameState.currentClue = null
          gameState.guessesRemaining = 0
        }

        const newStatus = gameState.winner ? "finished" : "playing"

        await docRef.update({
          gameState,
          status: newStatus,
          updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ ok: true, revealed: card.assignment })
      }

      case "end-turn": {
        const gameState = data.gameState as CodenamesGameState
        if (!gameState || gameState.winner) {
          return NextResponse.json({ error: "Game not active" }, { status: 400 })
        }

        gameState.currentTeam = gameState.currentTeam === "red" ? "blue" : "red"
        gameState.currentClue = null
        gameState.guessesRemaining = 0

        await docRef.update({ gameState, updatedAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ ok: true })
      }

      case "play-again": {
        await docRef.update({
          gameState: null,
          status: "waiting",
          updatedAt: FieldValue.serverTimestamp(),
        })
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Update codenames lobby error:", error)
    return NextResponse.json({ error: "Failed to update lobby" }, { status: 500 })
  }
}
