"use client"

import { memo, useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { RankedPlayer, TierSeparator } from "@/lib/types/ranking-schemas"
import { TierBucket } from "@/lib/tier-utils"
import { PositionBadge } from "@/components/position-badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { PlayerContextMenuItems } from "./player-row"
import { TierContextMenuItems } from "./tier-row"
import { cn } from "@/lib/utils"

function cardName(name: string): string {
  if (name.length <= 15) return name
  const spaceIdx = name.indexOf(" ")
  if (spaceIdx === -1) return name
  return `${name[0]}. ${name.slice(spaceIdx + 1)}`
}

// ---------- Shared card visuals ----------

const TierPlayerCardContent = memo(function TierPlayerCardContent({
  player,
  onClick,
}: {
  player: RankedPlayer
  onClick: (player: RankedPlayer) => void
}) {
  return (
    <div className="group/card relative w-full h-full">
      <div className="relative w-full h-full overflow-hidden">
        {player.headshotUrl ? (
          <img
            src={player.headshotUrl}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <span className="absolute top-1 right-1.5 text-sm font-semibold text-foreground pointer-events-none">
          {player.rank}
        </span>
        <div className="absolute left-0 top-[48%] -translate-y-1/2 text-muted-foreground/70 dark:text-white/80 opacity-0 group-hover/card:opacity-100 transition-opacity dark:[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.6))] pointer-events-none">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 px-2 flex flex-col items-center justify-end pointer-events-none">
          <button
            className="text-xs font-semibold text-center truncate w-full leading-tight text-white hover:underline [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation()
              onClick(player)
            }}
          >
            {cardName(player.name)}
          </button>
          <div className="flex items-center gap-1">
            <PositionBadge position={player.position} />
            <span className="text-[10px] text-white/80 font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{player.team}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// ---------- Card ----------

interface TierPlayerCardProps {
  player: RankedPlayer
  isPlacingTier: boolean
  isSelected: boolean
  onClick: (player: RankedPlayer) => void
  onSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onMoveUp?: (player: RankedPlayer) => void
  onMoveDown?: (player: RankedPlayer) => void
  onRemove?: (player: RankedPlayer) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

const TierPlayerCard = memo(function TierPlayerCard({
  player,
  isPlacingTier,
  isSelected,
  onClick,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: TierPlayerCardProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-player-card={player.playerId}
          className={cn(
            "w-[120px] h-[120px] touch-none relative overflow-hidden border border-border/20",
            isSelected && "border-primary shadow-[inset_0_0_10px_-2px_var(--primary)]",
            isPlacingTier ? "cursor-cell" : "cursor-grab"
          )}
          onClick={(e) => isPlacingTier ? onClick(player) : onSelect(player, e.ctrlKey || e.metaKey)}
        >
          <TierPlayerCardContent player={player} onClick={onClick} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <PlayerContextMenuItems
          player={player}
          isSelected={isSelected}
          canMoveUp={!!canMoveUp}
          canMoveDown={!!canMoveDown}
          onClick={onClick}
          onSelect={onSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
})

// ---------- Overlay (kept for DragOverlay compatibility) ----------

export function TierPlayerCardOverlay({ player }: { player: RankedPlayer }) {
  return (
    <div
      className="w-[120px] h-[120px] shadow-lg relative overflow-hidden border border-border/20"
    >
      {player.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-full h-full object-cover object-top" />
      ) : (
        <div className="w-full h-full bg-muted" />
      )}
      <span className="absolute top-1 right-1.5 text-sm font-semibold text-foreground">
        {player.rank}
      </span>
      <div className="absolute left-0 top-[48%] -translate-y-1/2 text-muted-foreground/40 dark:text-white/40 dark:[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.6))]">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 px-2 flex flex-col items-center justify-end">
        <span className="text-xs font-semibold text-center truncate w-full leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
          {cardName(player.name)}
        </span>
        <div className="flex items-center gap-1">
          <PositionBadge position={player.position} />
          <span className="text-[10px] text-white/80 font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{player.team}</span>
        </div>
      </div>
    </div>
  )
}

// ---------- Helpers ----------

export function getBucketContainerId(bucket: TierBucket): string {
  return bucket.tierIndex !== null ? `tier-bucket-${bucket.tierIndex}` : "tier-bucket-untiered"
}

const DRAG_THRESHOLD = 3
const CELL_W = 120
const CELL_H = 120
const GAP = 8
const PAD_X = 8
const PAD_Y = 8

// Compute which card slot the cursor is over within a tier container
function computeInsertIndex(
  container: HTMLElement,
  cursorX: number,
  cursorY: number,
  cardCount: number,
): number {
  const rect = container.getBoundingClientRect()
  const contentWidth = container.clientWidth - PAD_X * 2
  const cols = Math.max(1, Math.floor((contentWidth + GAP) / (CELL_W + GAP)))

  const relX = cursorX - rect.left - PAD_X
  const relY = cursorY - rect.top - PAD_Y

  const col = Math.floor((relX + GAP / 2) / (CELL_W + GAP))
  const row = Math.floor((relY + GAP / 2) / (CELL_H + GAP))

  const clampedCol = Math.max(0, Math.min(col, cols - 1))
  const clampedRow = Math.max(0, row)

  const index = clampedRow * cols + clampedCol
  return Math.max(0, Math.min(index, cardCount))
}

// ---------- Custom tier drag ----------
// Handles the entire drag lifecycle with pure DOM. Zero dnd-kit hooks.
// On pointerdown: clone card, follow cursor.
// After 3px movement: remove card from source tier, show placeholder at cursor position.
// On pointermove: update placeholder position as cursor moves between tiers/slots.
// On pointerup: commit the reorder.

interface InsertPos {
  containerId: string
  index: number
}

function useTierDrag(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  buckets: TierBucket[],
  isPlacingTier: boolean,
  onReorder: (buckets: TierBucket[]) => void,
) {
  const cloneRef = useRef<HTMLElement | null>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const startPosRef = useRef({ x: 0, y: 0 })
  const dragActiveRef = useRef(false)
  const playerIdRef = useRef<string | null>(null)
  const draggedPlayerRef = useRef<RankedPlayer | null>(null)
  const insertPosRef = useRef<InsertPos | null>(null)

  // React state — only set when drag activates or insertion changes
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [baseBuckets, setBaseBuckets] = useState<TierBucket[] | null>(null)
  const [insertPos, setInsertPos] = useState<InsertPos | null>(null)

  // Stable refs for event handlers
  const bucketsRef = useRef(buckets)
  bucketsRef.current = buckets
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder

  useEffect(() => {
    const container = scrollRef.current
    if (!container || isPlacingTier) return

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      const card = (e.target as HTMLElement).closest?.("[data-player-card]") as HTMLElement | null
      if (!card) return

      const playerId = card.getAttribute("data-player-card")
      if (!playerId) return

      e.preventDefault()

      const rect = card.getBoundingClientRect()
      offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      startPosRef.current = { x: e.clientX, y: e.clientY }
      playerIdRef.current = playerId
      dragActiveRef.current = false

      // Create clone immediately for instant visual feedback
      const clone = card.cloneNode(true) as HTMLElement
      clone.style.position = "fixed"
      clone.style.left = `${rect.left}px`
      clone.style.top = `${rect.top}px`
      clone.style.width = `${rect.width}px`
      clone.style.height = `${rect.height}px`
      clone.style.zIndex = "10000"
      clone.style.pointerEvents = "none"
      clone.style.willChange = "transform"
      clone.style.transition = "none"
      document.body.appendChild(clone)
      cloneRef.current = clone
    }

    function activateDrag() {
      const playerId = playerIdRef.current
      if (!playerId) return

      // Hide source card via DOM immediately
      const sourceCard = document.querySelector(`[data-player-card="${playerId}"]`) as HTMLElement | null
      if (sourceCard) sourceCard.style.opacity = "0"

      // Find and extract the dragged player from buckets
      const current = bucketsRef.current
      let draggedPlayer: RankedPlayer | null = null
      const newBuckets = current.map(b => {
        const idx = b.players.findIndex(p => p.playerId === playerId)
        if (idx !== -1) {
          draggedPlayer = b.players[idx]
          return { ...b, players: b.players.filter(p => p.playerId !== playerId) }
        }
        return b
      })

      if (!draggedPlayer) return

      dragActiveRef.current = true
      draggedPlayerRef.current = draggedPlayer
      setActivePlayerId(playerId)
      setBaseBuckets(newBuckets)
    }

    function onPointerMove(e: PointerEvent) {
      if (!playerIdRef.current) return

      // Move clone
      const clone = cloneRef.current
      if (clone) {
        clone.style.left = `${e.clientX - offsetRef.current.x}px`
        clone.style.top = `${e.clientY - offsetRef.current.y}px`
      }

      // Check activation threshold
      if (!dragActiveRef.current) {
        const dx = e.clientX - startPosRef.current.x
        const dy = e.clientY - startPosRef.current.y
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        activateDrag()
        return
      }

      // Find which tier container the cursor is over
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const tierContainer = el?.closest("[data-tier-container]") as HTMLElement | null
      if (!tierContainer) return

      const containerId = tierContainer.getAttribute("data-tier-container")!

      // Count current cards in this container (excluding placeholder)
      const cards = tierContainer.querySelectorAll("[data-player-card]")
      const cardCount = cards.length

      const index = computeInsertIndex(tierContainer, e.clientX, e.clientY, cardCount)

      // Only update React state if position actually changed
      const prev = insertPosRef.current
      if (prev && prev.containerId === containerId && prev.index === index) return

      const newPos = { containerId, index }
      insertPosRef.current = newPos
      setInsertPos(newPos)
    }

    function onPointerUp() {
      if (dragActiveRef.current && draggedPlayerRef.current && insertPosRef.current) {
        // Commit: insert dragged player into baseBuckets at insertPos
        const base = bucketsRef.current
        const player = draggedPlayerRef.current
        const { containerId, index } = insertPosRef.current

        // Start from original buckets, remove player, insert at new position
        let draggedFromBuckets: RankedPlayer | null = null
        const result = base.map(b => {
          const idx = b.players.findIndex(p => p.playerId === player.playerId)
          if (idx !== -1) {
            draggedFromBuckets = b.players[idx]
            return { ...b, players: b.players.filter(p => p.playerId !== player.playerId) }
          }
          return b
        })

        const targetBucket = result.find(b => getBucketContainerId(b) === containerId)
        if (targetBucket && (draggedFromBuckets || player)) {
          const insertPlayer = draggedFromBuckets || player
          const newPlayers = [...targetBucket.players]
          newPlayers.splice(index, 0, insertPlayer)
          const finalBuckets = result.map(b =>
            getBucketContainerId(b) === containerId ? { ...b, players: newPlayers } : b
          )
          onReorderRef.current(finalBuckets)
        }
      }

      cleanup()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && playerIdRef.current) {
        cleanup()
      }
    }

    function cleanup() {
      if (cloneRef.current) {
        cloneRef.current.remove()
        cloneRef.current = null
      }
      // Restore any dimmed source card
      if (playerIdRef.current) {
        const src = document.querySelector(`[data-player-card="${playerIdRef.current}"]`) as HTMLElement | null
        if (src) src.style.opacity = ""
      }
      playerIdRef.current = null
      dragActiveRef.current = false
      draggedPlayerRef.current = null
      insertPosRef.current = null
      setActivePlayerId(null)
      setBaseBuckets(null)
      setInsertPos(null)
    }

    container.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("keydown", onKeyDown)

    return () => {
      container.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("keydown", onKeyDown)
      cleanup()
    }
  }, [scrollRef, isPlacingTier])

  // The buckets to render: baseBuckets (with player removed) during drag, original otherwise
  const activeBuckets = baseBuckets ?? buckets

  return { activeBuckets, activePlayerId, insertPos }
}

// ---------- Tier row ----------

interface TierListRowProps {
  bucket: TierBucket
  containerId: string
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  activePlayerId: string | null
  insertPos: InsertPos | null
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onTierRename?: (tierId: string, newLabel: string) => void
  onTierRemove?: (tier: TierSeparator) => void
  onMoveUp?: (player: RankedPlayer) => void
  onMoveDown?: (player: RankedPlayer) => void
  onRemovePlayer?: (player: RankedPlayer) => void
  playerCount: number
  startIndex: number
}

const TierListRow = memo(function TierListRow({
  bucket,
  containerId,
  isPlacingTier,
  selectedPlayerIds,
  activePlayerId,
  insertPos,
  onPlayerClick,
  onPlayerSelect,
  onTierRename,
  onTierRemove,
  onMoveUp,
  onMoveDown,
  onRemovePlayer,
  playerCount,
  startIndex,
}: TierListRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(bucket.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const renamingFromMenu = useRef(false)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== bucket.label && bucket.tierId && onTierRename) {
      onTierRename(bucket.tierId, trimmed)
    }
    setIsEditing(false)
  }

  function startEditing() {
    if (!bucket.tierId || !onTierRename) return
    setEditValue(bucket.label)
    setIsEditing(true)
  }

  const hasTier = !!bucket.tierId
  const isInsertTarget = insertPos?.containerId === containerId

  const tierLabelContent = (
    <div
      className="w-[126px] shrink-0 flex items-center justify-center p-2"
      style={bucket.color ? {
        backgroundColor: `color-mix(in oklch, ${bucket.color} 20%, transparent)`,
      } : undefined}
      onDoubleClick={startEditing}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit()
            if (e.key === "Escape") {
              setEditValue(bucket.label)
              setIsEditing(false)
            }
          }}
          autoComplete="off"
          className="text-sm font-extrabold text-center w-full bg-transparent border rounded-sm outline-none px-1"
          style={{ color: bucket.color ?? undefined, borderColor: bucket.color ?? "var(--border)" }}
        />
      ) : (
        <button
          onClick={startEditing}
          className={cn(
            "text-sm font-extrabold text-center",
            !bucket.color && "text-muted-foreground",
            bucket.tierId && "hover:underline"
          )}
          style={bucket.color ? { color: bucket.color } : undefined}
        >
          {bucket.label}
        </button>
      )}
    </div>
  )

  // Build card elements with placeholder insertion
  const cardElements: React.ReactNode[] = []
  for (let i = 0; i <= bucket.players.length; i++) {
    if (isInsertTarget && insertPos.index === i) {
      cardElements.push(
        <div
          key="__placeholder__"
          className="h-[120px] transition-[width] duration-150 ease-out"
          ref={(el) => { if (el) requestAnimationFrame(() => { el.style.width = '120px' }) }}
          style={{ width: 0 }}
        />
      )
    }
    if (i < bucket.players.length) {
      const player = bucket.players[i]
      const globalIndex = startIndex + i
      cardElements.push(
        <TierPlayerCard
          key={player.playerId}
          player={player}
          isPlacingTier={isPlacingTier}
          isSelected={selectedPlayerIds.has(player.playerId)}
          onClick={onPlayerClick}
          onSelect={onPlayerSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemovePlayer}
          canMoveUp={globalIndex > 0}
          canMoveDown={globalIndex < playerCount - 1}
        />
      )
    }
  }

  return (
    <div className="flex">
      {hasTier ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {tierLabelContent}
          </ContextMenuTrigger>
          <ContextMenuContent
            onCloseAutoFocus={(e) => {
              if (renamingFromMenu.current) {
                e.preventDefault()
                renamingFromMenu.current = false
                inputRef.current?.focus()
                inputRef.current?.select()
              }
            }}
          >
            <TierContextMenuItems
              onRename={() => {
                renamingFromMenu.current = true
                startEditing()
              }}
              onDelete={() => {
                if (bucket.tierId && onTierRemove) {
                  onTierRemove({
                    id: bucket.tierId,
                    label: bucket.label,
                    afterRank: 0,
                  } as TierSeparator)
                }
              }}
            />
          </ContextMenuContent>
        </ContextMenu>
      ) : tierLabelContent}

      <div
        data-tier-container={containerId}
        className="flex-1 grid grid-cols-[repeat(auto-fill,120px)] auto-rows-[120px] gap-2 p-2 min-h-[126px] content-start"
        style={{ contain: "layout style" }}
      >
        {cardElements}
      </div>
    </div>
  )
})

// ---------- TierListView ----------

interface TierListViewProps {
  buckets: TierBucket[]
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onTierRename: (tierId: string, newLabel: string) => void
  onTierRemove: (tier: TierSeparator) => void
  onMoveUp: (player: RankedPlayer) => void
  onMoveDown: (player: RankedPlayer) => void
  onRemovePlayer?: (player: RankedPlayer) => void
  onReorder: (buckets: TierBucket[]) => void
  className?: string
}

export function TierListView({
  buckets,
  isPlacingTier,
  selectedPlayerIds,
  onPlayerClick,
  onPlayerSelect,
  onTierRename,
  onTierRemove,
  onMoveUp,
  onMoveDown,
  onRemovePlayer,
  onReorder,
  className,
}: TierListViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { activeBuckets, activePlayerId, insertPos } = useTierDrag(
    scrollRef,
    buckets,
    isPlacingTier,
    onReorder,
  )

  const totalPlayers = activeBuckets.reduce((sum, b) => sum + b.players.length, 0)

  let runningIndex = 0
  return (
    <div
      ref={scrollRef}
      className={cn("border rounded-md overflow-auto max-h-[calc(100vh-320px)] bg-background", className)}
    >
      {activeBuckets.map((bucket, i) => {
        const containerId = getBucketContainerId(bucket)
        const bucketStartIndex = runningIndex
        runningIndex += bucket.players.length
        return (
          <TierListRow
            key={bucket.tierIndex ?? `untiered-${i}`}
            bucket={bucket}
            containerId={containerId}
            isPlacingTier={isPlacingTier}
            selectedPlayerIds={selectedPlayerIds}
            activePlayerId={activePlayerId}
            insertPos={insertPos}
            onPlayerClick={onPlayerClick}
            onPlayerSelect={onPlayerSelect}
            onTierRename={onTierRename}
            onTierRemove={onTierRemove}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemovePlayer={onRemovePlayer}
            playerCount={totalPlayers}
            startIndex={bucketStartIndex}
          />
        )
      })}
    </div>
  )
}
