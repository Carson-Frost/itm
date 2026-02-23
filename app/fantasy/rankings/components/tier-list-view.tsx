"use client"

import { memo, useMemo, useState, useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { useSortable, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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

const noAnimations = () => false

const CARD_CHAMFER_OUTER = "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)"
const CARD_CHAMFER_INNER = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)"

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
    <div className="group/card relative w-full h-full p-[3px]">
      <div className="relative w-full h-full overflow-hidden" style={{ clipPath: CARD_CHAMFER_INNER }}>
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

// ---------- Card props shared by both sortable and static versions ----------

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

// ---------- Sortable card: used in visible tiers ----------

const SortableTierPlayerCard = memo(function SortableTierPlayerCard({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: player.playerId,
    disabled: isPlacingTier,
    animateLayoutChanges: noAnimations,
  })

  const style = isDragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          data-player-card={player.playerId}
          style={style}
          className={cn(
            "card-chamfer w-[130px] h-[110px] m-1.5 touch-none",
            isDragging && "opacity-30",
            isSelected && "card-selected",
            isPlacingTier ? "cursor-cell" : "cursor-grab active:cursor-grabbing"
          )}
          onClick={(e) => isPlacingTier ? onClick(player) : onSelect(player, e.ctrlKey || e.metaKey)}
          {...(!isPlacingTier ? { ...attributes, ...listeners } : {})}
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

// ---------- Static card: used in off-screen tiers (no dnd-kit hooks) ----------

const StaticTierPlayerCard = memo(function StaticTierPlayerCard({
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
            "card-chamfer w-[130px] h-[110px] m-1.5 touch-none",
            isSelected && "card-selected",
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

// ---------- Overlay ----------

export function TierPlayerCardOverlay({ player }: { player: RankedPlayer }) {
  return (
    <div
      className="w-[130px] h-[110px] shadow-lg"
      style={{ clipPath: CARD_CHAMFER_OUTER }}
    >
      <div className="w-full h-full bg-border flex items-center justify-center">
        <div
          className="flex flex-col"
          style={{
            width: "calc(100% - 6px)",
            height: "calc(100% - 6px)",
            clipPath: CARD_CHAMFER_INNER,
            background: "var(--background)",
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
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
        </div>
      </div>
    </div>
  )
}

// ---------- Helpers ----------

export function getBucketContainerId(bucket: TierBucket): string {
  return bucket.tierIndex !== null ? `tier-bucket-${bucket.tierIndex}` : "tier-bucket-untiered"
}

// Hook: track whether element is in/near the scrollable viewport
function useInView(scrollRoot: React.RefObject<HTMLElement | null>) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    const root = scrollRoot.current
    if (!el || !root) return

    // Synchronous initial check — avoids all tiers starting as "visible"
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const buffer = 50
    const initiallyVisible =
      elRect.bottom >= rootRect.top - buffer &&
      elRect.top <= rootRect.bottom + buffer
    setIsInView(initiallyVisible)

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { root, rootMargin: "50px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot])

  return { ref, isInView }
}

// ---------- Tier row ----------

interface TierListRowProps {
  bucket: TierBucket
  containerId: string
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  sortableTierIds: Set<string>
  isInView: boolean
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
  sortableTierIds,
  isInView,
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
  const { setNodeRef: setDropRef } = useDroppable({ id: containerId })
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(bucket.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const renamingFromMenu = useRef(false)

  const sortableIds = useMemo(
    () => bucket.players.map((p) => p.playerId),
    [bucket.players]
  )

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
  // Sortable only if in-view AND (no drag active OR this tier is in the sortable set)
  const isSortable = isInView && (sortableTierIds.size === 0 || sortableTierIds.has(containerId))
  const CardComponent = isSortable ? SortableTierPlayerCard : StaticTierPlayerCard

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

  const cardContent = bucket.players.map((player, i) => {
    const globalIndex = startIndex + i
    return (
      <CardComponent
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
  })

  return (
    <div className="flex border-b last:border-b-0">
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

      {isSortable ? (
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div
            ref={setDropRef}
            data-tier-container={containerId}
            className="flex-1 flex flex-wrap py-1 px-0.5 min-h-[126px]"
            style={{ contain: "layout style" }}
          >
            {cardContent}
          </div>
        </SortableContext>
      ) : (
        <div
          ref={setDropRef}
          data-tier-container={containerId}
          className="flex-1 flex flex-wrap py-1 px-0.5 min-h-[126px]"
          style={{ contain: "layout style" }}
        >
          {cardContent}
        </div>
      )}
    </div>
  )
})

// ---------- Optimistic grab overlay ----------
// Shows a DOM clone of the card instantly on pointerdown, before dnd-kit activates.
// Pure DOM manipulation — zero React renders — so it feels instant.

function useOptimisticGrab(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  isPlacingTier: boolean,
  activeId: string | null,
  onGrab?: (playerId: string) => void,
) {
  const cloneRef = useRef<HTMLElement | null>(null)
  const sourcePlayerIdRef = useRef<string | null>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onGrabRef = useRef(onGrab)
  onGrabRef.current = onGrab

  useEffect(() => {
    const container = scrollRef.current
    if (!container || isPlacingTier) return

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      const card = (e.target as HTMLElement).closest?.("[data-player-card]") as HTMLElement | null
      if (!card) return

      const playerId = card.getAttribute("data-player-card")
      if (!playerId) return

      const rect = card.getBoundingClientRect()
      offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

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
      clone.id = "optimistic-grab-clone"
      document.body.appendChild(clone)

      cloneRef.current = clone
      sourcePlayerIdRef.current = playerId
      card.style.opacity = "0.3"

      // Only pre-warm after 50ms hold — avoids wasted work on quick clicks
      holdTimerRef.current = setTimeout(() => {
        onGrabRef.current?.(playerId)
        holdTimerRef.current = null
      }, 50)
    }

    function onPointerMove(e: PointerEvent) {
      const clone = cloneRef.current
      if (!clone) return
      clone.style.left = `${e.clientX - offsetRef.current.x}px`
      clone.style.top = `${e.clientY - offsetRef.current.y}px`
    }

    function cleanup() {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      if (cloneRef.current) {
        cloneRef.current.remove()
        cloneRef.current = null
      }
      if (sourcePlayerIdRef.current) {
        const src = document.querySelector(`[data-player-card="${sourcePlayerIdRef.current}"]`) as HTMLElement | null
        if (src) src.style.opacity = ""
        sourcePlayerIdRef.current = null
      }
    }

    function onPointerUp() {
      cleanup()
    }

    container.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)

    return () => {
      container.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      cleanup()
    }
  }, [scrollRef, isPlacingTier])

  // When dnd-kit activates, remove clone immediately — DragOverlay takes over
  useEffect(() => {
    if (activeId && cloneRef.current) {
      cloneRef.current.remove()
      cloneRef.current = null
      if (sourcePlayerIdRef.current) {
        const src = document.querySelector(`[data-player-card="${sourcePlayerIdRef.current}"]`) as HTMLElement | null
        if (src) src.style.opacity = ""
        sourcePlayerIdRef.current = null
      }
    }
    // When drag ends, ensure cleanup
    if (!activeId) {
      if (cloneRef.current) {
        cloneRef.current.remove()
        cloneRef.current = null
      }
      if (sourcePlayerIdRef.current) {
        const src = document.querySelector(`[data-player-card="${sourcePlayerIdRef.current}"]`) as HTMLElement | null
        if (src) src.style.opacity = ""
        sourcePlayerIdRef.current = null
      }
    }
  }, [activeId])
}

// ---------- TierListView ----------

interface TierListViewProps {
  buckets: TierBucket[]
  isPlacingTier: boolean
  selectedPlayerIds: Set<string>
  activeId: string | null
  sortableTierIds: Set<string>
  onPlayerClick: (player: RankedPlayer) => void
  onPlayerSelect: (player: RankedPlayer, ctrlKey?: boolean) => void
  onTierRename: (tierId: string, newLabel: string) => void
  onTierRemove: (tier: TierSeparator) => void
  onMoveUp: (player: RankedPlayer) => void
  onMoveDown: (player: RankedPlayer) => void
  onRemovePlayer?: (player: RankedPlayer) => void
  onGrab?: (playerId: string) => void
  className?: string
}

export function TierListView({
  buckets,
  isPlacingTier,
  selectedPlayerIds,
  activeId,
  sortableTierIds,
  onPlayerClick,
  onPlayerSelect,
  onTierRename,
  onTierRemove,
  onMoveUp,
  onMoveDown,
  onRemovePlayer,
  onGrab,
  className,
}: TierListViewProps) {
  const totalPlayers = buckets.reduce((sum, b) => sum + b.players.length, 0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useOptimisticGrab(scrollRef, isPlacingTier, activeId, onGrab)

  let runningIndex = 0
  return (
    <div
      ref={scrollRef}
      className={cn("border rounded-md overflow-auto max-h-[calc(100vh-320px)] bg-card", className)}
    >
      {buckets.map((bucket, i) => {
        const containerId = getBucketContainerId(bucket)
        const bucketStartIndex = runningIndex
        runningIndex += bucket.players.length
        return (
          <TierListRowWithVisibility
            key={bucket.tierIndex ?? `untiered-${i}`}
            scrollRef={scrollRef}
            bucket={bucket}
            containerId={containerId}
            isPlacingTier={isPlacingTier}
            selectedPlayerIds={selectedPlayerIds}
            sortableTierIds={sortableTierIds}
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

// Wrapper that tracks visibility and passes isInView to TierListRow
function TierListRowWithVisibility({
  scrollRef,
  ...props
}: Omit<TierListRowProps, "isInView"> & { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { ref, isInView } = useInView(scrollRef)

  return (
    <div ref={ref}>
      <TierListRow {...props} isInView={isInView} />
    </div>
  )
}
