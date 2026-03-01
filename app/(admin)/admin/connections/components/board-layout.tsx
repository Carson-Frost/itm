"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Shuffle, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DIFFICULTY_COLORS } from "@/lib/types/connections"
import type { ConnectionsCategory, ConnectionsPlayer } from "@/lib/types/connections"

interface TilePlayer extends ConnectionsPlayer {
  difficulty: number
}

interface BoardLayoutProps {
  categories: ConnectionsCategory[]
  tileOrder: string[]
  onTileOrderChange: (order: string[]) => void
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function BoardLayout({
  categories,
  tileOrder,
  onTileOrderChange,
}: BoardLayoutProps) {
  const allTiles: TilePlayer[] = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.players.map((p) => ({
        ...p,
        difficulty: cat.difficulty,
      }))
    )
  }, [categories])

  const tileMap = useMemo(() => {
    const map = new Map<string, TilePlayer>()
    for (const t of allTiles) map.set(t.playerId, t)
    return map
  }, [allTiles])

  const totalPlayers = allTiles.length

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Build 16-slot grid: tiles in order + empty slots
  const orderedTiles = useMemo(() => {
    // Filter tileOrder to only valid players
    const validOrder = tileOrder.filter((id) => tileMap.has(id))
    // Find players not in tileOrder
    const unordered = allTiles.filter((t) => !validOrder.includes(t.playerId))
    // Combine: ordered first, then unordered
    const ordered = [
      ...validOrder.map((id) => tileMap.get(id)!),
      ...unordered,
    ]
    return ordered
  }, [allTiles, tileOrder, tileMap])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedTiles.findIndex((t) => t.playerId === active.id)
    const newIndex = orderedTiles.findIndex((t) => t.playerId === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = [...orderedTiles]
    const [moved] = newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, moved)

    onTileOrderChange(newOrder.map((t) => t.playerId))
  }

  const handleRandomize = () => {
    const shuffled = shuffleArray(allTiles)
    onTileOrderChange(shuffled.map((t) => t.playerId))
  }

  // Calculate empty slots (always show 4x4 = 16 grid)
  const emptySlotCount = Math.max(0, 16 - totalPlayers)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {totalPlayers}/16 players · Drag to rearrange
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRandomize} disabled={totalPlayers === 0}>
          <Shuffle className="h-3.5 w-3.5 mr-1" />
          Shuffle
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedTiles.map((t) => t.playerId)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-4 gap-1">
            {orderedTiles.map((tile) => (
              <SortableTile key={tile.playerId} tile={tile} />
            ))}
            {/* Empty slots */}
            {Array.from({ length: emptySlotCount }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square border-3 border-dashed border-border/50 bg-muted/10"
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableTile({ tile }: { tile: TilePlayer }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.playerId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const colors = DIFFICULTY_COLORS[tile.difficulty]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        aspect-square relative group
        border-3 border-border bg-muted/30 select-none overflow-hidden cursor-grab
        active:cursor-grabbing
      `}
    >
      {tile.headshotUrl ? (
        <img
          src={tile.headshotUrl}
          alt=""
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full bg-muted/50" />
      )}

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-5 pb-1.5 px-1">
        <p className="text-[9px] font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {tile.name}
        </p>
      </div>

      {/* Difficulty stripe */}
      <div className={`absolute inset-x-0 bottom-0 h-1 ${colors.bg}`} />

      {/* Drag grip icon */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <GripVertical className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
      </div>
    </div>
  )
}
