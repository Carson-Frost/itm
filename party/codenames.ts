import type * as Party from "partykit/server"

// ---- Types (duplicated from lib/types/codenames to avoid import issues in PartyKit worker) ----

type CardAssignment = "red" | "blue" | "neutral" | "assassin" | "green"
type GameMode = "classic" | "duet"
type TeamColor = "red" | "blue"
type PlayerRole = "spymaster" | "operative"
type CardContentType = "player" | "team" | "college" | "coach"

interface CodenamesSettings {
  gameMode: GameMode
  includePlayers: boolean
  includeTeams: boolean
  includeCollegeTeams: boolean
  includeCoaches: boolean
  turnTimer: number | null
}

interface LobbyPlayer {
  id: string
  name: string
  team: TeamColor
  role: PlayerRole
}

interface CodenamesCard {
  id: string
  name: string
  imageUrl: string | null
  contentType: CardContentType
  subtitle: string | null
  assignment: CardAssignment
  isRevealed: boolean
  revealedBy: TeamColor | null
}

interface CodenamesClue {
  word: string
  number: number
  team: TeamColor
  spymasterName: string
}

interface TurnEntry {
  team: TeamColor
  clue: CodenamesClue
  guesses: { cardId: string; cardName: string; result: CardAssignment }[]
}

interface CodenamesGameState {
  cards: CodenamesCard[]
  currentTeam: TeamColor
  currentClue: CodenamesClue | null
  guessesRemaining: number
  redFound: number
  blueFound: number
  redTotal: number
  blueTotal: number
  winner: TeamColor | null
  winReason: "all-found" | "assassin" | "tokens-depleted" | null
  turnHistory: TurnEntry[]
  gameMode: GameMode
  duetTokensRemaining?: number
  duetGreenFound?: number
  duetGreenTotal?: number
  duetAssignmentsA?: CardAssignment[]
  duetAssignmentsB?: CardAssignment[]
}

interface WordPoolItem {
  name: string
  imageUrl: string | null
  contentType: CardContentType
  subtitle: string | null
}

interface LobbyState {
  code: string
  hostId: string
  players: LobbyPlayer[]
  settings: CodenamesSettings
  gameState: CodenamesGameState | null
  status: "waiting" | "playing" | "finished"
}

// ---- Message types ----

type ClientMessage =
  | { type: "init"; hostName: string }
  | { type: "join"; playerName: string }
  | { type: "update-player"; playerId: string; team?: TeamColor; role?: PlayerRole }
  | { type: "update-settings"; settings: CodenamesSettings }
  | { type: "start"; wordPool: WordPoolItem[] }
  | { type: "give-clue"; clue: CodenamesClue }
  | { type: "guess"; cardId: string; playerId: string }
  | { type: "end-turn" }
  | { type: "play-again" }

function generatePlayerId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- PartyKit Server ----

export default class CodenamesServer implements Party.Server {
  state: LobbyState | null = null

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<LobbyState>("state")
    if (saved) this.state = saved
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    if (this.state) {
      const url = new URL(ctx.request.url)
      const playerId = url.searchParams.get("playerId")
      connection.setState({ playerId })
      connection.send(
        JSON.stringify({
          type: "state",
          lobby: this.getFilteredState(playerId),
        })
      )
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message) as ClientMessage

    switch (data.type) {
      case "init": {
        const hostId = generatePlayerId()
        const hostPlayer: LobbyPlayer = {
          id: hostId,
          name: data.hostName,
          team: "red",
          role: "spymaster",
        }
        this.state = {
          code: this.room.id,
          hostId,
          players: [hostPlayer],
          settings: {
            gameMode: "classic",
            includePlayers: true,
            includeTeams: true,
            includeCollegeTeams: false,
            includeCoaches: false,
            turnTimer: null,
          },
          gameState: null,
          status: "waiting",
        }
        sender.setState({ playerId: hostId })
        sender.send(JSON.stringify({ type: "joined", playerId: hostId }))
        break
      }

      case "join": {
        if (!this.state || this.state.status !== "waiting") return
        if (this.state.players.length >= 6) {
          sender.send(JSON.stringify({ type: "error", message: "Lobby is full" }))
          return
        }

        const playerId = generatePlayerId()
        const redCount = this.state.players.filter((p) => p.team === "red").length
        const blueCount = this.state.players.filter((p) => p.team === "blue").length
        const team: TeamColor = blueCount < redCount ? "blue" : "red"
        const hasSpymaster = this.state.players.some(
          (p) => p.team === team && p.role === "spymaster"
        )

        this.state.players.push({
          id: playerId,
          name: data.playerName,
          team,
          role: hasSpymaster ? "operative" : "spymaster",
        })

        sender.setState({ playerId })
        sender.send(JSON.stringify({ type: "joined", playerId }))
        break
      }

      case "update-player": {
        if (!this.state) return
        this.state.players = this.state.players.map((p) => {
          if (p.id === data.playerId) {
            return {
              ...p,
              ...(data.team && { team: data.team }),
              ...(data.role && { role: data.role }),
            }
          }
          return p
        })
        break
      }

      case "update-settings": {
        if (!this.state) return
        this.state.settings = data.settings
        break
      }

      case "start": {
        if (!this.state || !data.wordPool || data.wordPool.length < 25) return
        if (this.state.players.length < 2) return

        const gameMode = this.state.settings.gameMode

        const shuffledPool = shuffle(data.wordPool)
        const selected = shuffledPool.slice(0, 25)

        if (gameMode === "duet") {
          this.startDuetGame(selected)
        } else {
          this.startClassicGame(selected)
        }
        break
      }

      case "give-clue": {
        if (!this.state?.gameState || this.state.gameState.winner) return
        this.state.gameState.currentClue = data.clue
        this.state.gameState.guessesRemaining = data.clue.number + 1
        this.state.gameState.turnHistory.push({
          team: data.clue.team,
          clue: data.clue,
          guesses: [],
        })
        break
      }

      case "guess": {
        const gs = this.state?.gameState
        if (!gs || gs.winner) return

        const player = this.state!.players.find((p) => p.id === data.playerId)
        if (!player) return

        if (gs.gameMode === "duet") {
          this.handleDuetGuess(gs, player, data.cardId)
        } else {
          this.handleClassicGuess(gs, player, data.cardId)
        }
        break
      }

      case "end-turn": {
        const gs = this.state?.gameState
        if (!gs || gs.winner) return
        gs.currentTeam = gs.currentTeam === "red" ? "blue" : "red"
        gs.currentClue = null
        gs.guessesRemaining = 0
        break
      }

      case "play-again": {
        if (!this.state) return
        this.state.gameState = null
        this.state.status = "waiting"
        break
      }
    }

    // Persist and broadcast after every action
    await this.persist()
    await this.broadcastState()
  }

  startClassicGame(selected: WordPoolItem[]) {
    const firstTeam: TeamColor = "red"
    const assignments: CardAssignment[] = shuffle([
      ...Array(9).fill(firstTeam),
      ...Array(8).fill("blue"),
      ...Array(7).fill("neutral"),
      "assassin",
    ] as CardAssignment[])

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

    this.state!.gameState = {
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
      gameMode: "classic",
    }
    this.state!.status = "playing"
  }

  startDuetGame(selected: WordPoolItem[]) {
    // Generate duet assignments: 15 unique green positions across two perspectives
    // Each perspective: 9 green, 3 assassin, 13 neutral
    // Overlap: 3 positions green for both, 6 green-only-A, 6 green-only-B
    const indices = shuffle(Array.from({ length: 25 }, (_, i) => i))

    // Assign positions
    const bothGreen = indices.slice(0, 3)         // green for A and B
    const greenAOnly = indices.slice(3, 9)         // green for A, neutral for B
    const greenBOnly = indices.slice(9, 15)        // green for B, neutral for A
    const assassinA = indices.slice(15, 18)        // assassin for A, neutral for B
    const assassinB = indices.slice(18, 21)        // assassin for B, neutral for A
    // indices 21-24: neutral for both

    const assignmentsA: CardAssignment[] = new Array(25).fill("neutral")
    const assignmentsB: CardAssignment[] = new Array(25).fill("neutral")

    for (const i of bothGreen) { assignmentsA[i] = "green"; assignmentsB[i] = "green" }
    for (const i of greenAOnly) { assignmentsA[i] = "green" }
    for (const i of greenBOnly) { assignmentsB[i] = "green" }
    for (const i of assassinA) { assignmentsA[i] = "assassin" }
    for (const i of assassinB) { assignmentsB[i] = "assassin" }

    const cards: CodenamesCard[] = selected.map((item, i) => ({
      id: `card-${i}`,
      name: item.name,
      imageUrl: item.imageUrl,
      contentType: item.contentType,
      subtitle: item.subtitle,
      assignment: "neutral" as CardAssignment, // placeholder, filtered per-player
      isRevealed: false,
      revealedBy: null,
    }))

    this.state!.gameState = {
      cards,
      currentTeam: "red", // Player A goes first
      currentClue: null,
      guessesRemaining: 0,
      redFound: 0,
      blueFound: 0,
      redTotal: 0,
      blueTotal: 0,
      winner: null,
      winReason: null,
      turnHistory: [],
      gameMode: "duet",
      duetTokensRemaining: 9,
      duetGreenFound: 0,
      duetGreenTotal: 15,
      duetAssignmentsA: assignmentsA,
      duetAssignmentsB: assignmentsB,
    }
    this.state!.status = "playing"
  }

  handleClassicGuess(gs: CodenamesGameState, player: LobbyPlayer, cardId: string) {
    if (player.role !== "operative") return

    const card = gs.cards.find((c) => c.id === cardId)
    if (!card || card.isRevealed) return

    card.isRevealed = true
    card.revealedBy = player.team

    if (card.assignment === "red") gs.redFound++
    if (card.assignment === "blue") gs.blueFound++

    const currentTurn = gs.turnHistory[gs.turnHistory.length - 1]
    if (currentTurn) {
      currentTurn.guesses.push({
        cardId: card.id,
        cardName: card.name,
        result: card.assignment,
      })
    }

    let endTurn = false

    if (card.assignment === "assassin") {
      gs.winner = player.team === "red" ? "blue" : "red"
      gs.winReason = "assassin"
      gs.cards.forEach((c) => { c.isRevealed = true })
    } else if (gs.redFound === gs.redTotal) {
      gs.winner = "red"
      gs.winReason = "all-found"
      gs.cards.forEach((c) => { c.isRevealed = true })
    } else if (gs.blueFound === gs.blueTotal) {
      gs.winner = "blue"
      gs.winReason = "all-found"
      gs.cards.forEach((c) => { c.isRevealed = true })
    } else if (card.assignment !== player.team) {
      endTurn = true
    } else {
      gs.guessesRemaining--
      if (gs.guessesRemaining <= 0) endTurn = true
    }

    if (endTurn && !gs.winner) {
      gs.currentTeam = gs.currentTeam === "red" ? "blue" : "red"
      gs.currentClue = null
      gs.guessesRemaining = 0
    }

    if (gs.winner) this.state!.status = "finished"
  }

  handleDuetGuess(gs: CodenamesGameState, player: LobbyPlayer, cardId: string) {
    const cardIndex = gs.cards.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) return
    const card = gs.cards[cardIndex]
    if (card.isRevealed) return

    // In duet, the clue-giver's assignments determine the result
    // currentTeam = who gave the clue. The OTHER player is guessing.
    // So check against the clue-giver's (currentTeam's) assignments
    const clueGiverAssignments = gs.currentTeam === "red"
      ? gs.duetAssignmentsA!
      : gs.duetAssignmentsB!

    const actualAssignment = clueGiverAssignments[cardIndex]

    card.isRevealed = true
    card.revealedBy = player.team
    card.assignment = actualAssignment // store what was revealed

    const currentTurn = gs.turnHistory[gs.turnHistory.length - 1]
    if (currentTurn) {
      currentTurn.guesses.push({
        cardId: card.id,
        cardName: card.name,
        result: actualAssignment,
      })
    }

    if (actualAssignment === "green") {
      gs.duetGreenFound = (gs.duetGreenFound ?? 0) + 1
      // Mark this position as revealed/green in both assignment arrays so it's not double-counted
      gs.duetAssignmentsA![cardIndex] = "green"
      gs.duetAssignmentsB![cardIndex] = "green"

      if (gs.duetGreenFound >= (gs.duetGreenTotal ?? 15)) {
        gs.winner = "red" // cooperative win — "red" represents the team
        gs.winReason = "all-found"
        gs.cards.forEach((c) => { c.isRevealed = true })
        this.state!.status = "finished"
      }
      // Correct guess — can keep guessing
      gs.guessesRemaining--
      if (gs.guessesRemaining <= 0 && !gs.winner) {
        gs.currentTeam = gs.currentTeam === "red" ? "blue" : "red"
        gs.currentClue = null
        gs.guessesRemaining = 0
      }
    } else if (actualAssignment === "assassin") {
      gs.winner = "blue" // cooperative loss — use "blue" to indicate loss
      gs.winReason = "assassin"
      gs.cards.forEach((c) => { c.isRevealed = true })
      this.state!.status = "finished"
    } else {
      // Neutral — lose a token, end turn
      gs.duetTokensRemaining = (gs.duetTokensRemaining ?? 9) - 1
      if (gs.duetTokensRemaining <= 0) {
        gs.winner = "blue" // cooperative loss
        gs.winReason = "tokens-depleted"
        gs.cards.forEach((c) => { c.isRevealed = true })
        this.state!.status = "finished"
      } else {
        gs.currentTeam = gs.currentTeam === "red" ? "blue" : "red"
        gs.currentClue = null
        gs.guessesRemaining = 0
      }
    }
  }

  async persist() {
    if (this.state) {
      await this.room.storage.put("state", this.state)
    }
  }

  async broadcastState() {
    const connections = Array.from(this.room.getConnections())
    for (const connection of connections) {
      const playerId = (connection.state as { playerId?: string })?.playerId ?? null
      connection.send(
        JSON.stringify({
          type: "state",
          lobby: this.getFilteredState(playerId),
        })
      )
    }
  }

  getFilteredState(playerId: string | null): LobbyState {
    if (!this.state) return this.state!

    const lobby = JSON.parse(JSON.stringify(this.state)) as LobbyState

    if (lobby.gameState && lobby.status === "playing") {
      const player = lobby.players.find((p) => p.id === playerId)

      if (lobby.gameState.gameMode === "duet") {
        // In duet, each player sees their own assignments for unrevealed cards
        const assignments = player?.team === "red"
          ? lobby.gameState.duetAssignmentsA
          : lobby.gameState.duetAssignmentsB

        if (assignments) {
          lobby.gameState.cards = lobby.gameState.cards.map((card, i) => ({
            ...card,
            assignment: card.isRevealed ? card.assignment : assignments[i],
          }))
        }
        // Remove full assignment arrays from client payload
        delete lobby.gameState.duetAssignmentsA
        delete lobby.gameState.duetAssignmentsB
      } else {
        // Classic: hide assignments from non-spymasters
        if (!player || player.role !== "spymaster") {
          lobby.gameState.cards = lobby.gameState.cards.map((card) => ({
            ...card,
            assignment: card.isRevealed ? card.assignment : ("neutral" as CardAssignment),
          }))
        }
      }
    }

    // Also strip duet assignments when game is finished (all cards revealed anyway)
    if (lobby.gameState && lobby.status === "finished") {
      delete lobby.gameState.duetAssignmentsA
      delete lobby.gameState.duetAssignmentsB
    }

    return lobby
  }
}

CodenamesServer satisfies Party.Worker
