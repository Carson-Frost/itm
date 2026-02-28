import { useState, useEffect, useCallback, useRef, CSSProperties } from "react"

interface SelectionBoxResult {
  selectionBoxStyle: CSSProperties | null
  isSelecting: boolean
  selectionBoxRef: React.RefObject<HTMLDivElement | null>
}

export function useSelectionBox(
  containerRef: React.RefObject<HTMLElement | null>,
  onSelectionComplete: (selectedIds: Set<string>) => void,
  isActive: boolean
): SelectionBoxResult {
  const [boxStyle, setBoxStyle] = useState<CSSProperties | null>(null)
  const selectionBoxRef = useRef<HTMLDivElement | null>(null)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const isSelectingRef = useRef(false)
  const boxRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)
  const onSelectionCompleteRef = useRef(onSelectionComplete)
  onSelectionCompleteRef.current = onSelectionComplete

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isActive) return
      if (e.button !== 0) return

      // Only start from empty space — not on a card
      const target = e.target as HTMLElement
      if (target.closest("[data-player-card]")) return

      const container = containerRef.current
      if (!container) return
      if (!container.contains(target)) return

      const rect = container.getBoundingClientRect()
      startPoint.current = {
        x: e.clientX - rect.left + container.scrollLeft,
        y: e.clientY - rect.top + container.scrollTop,
      }
      isSelectingRef.current = true
      const initial = {
        left: startPoint.current.x,
        top: startPoint.current.y,
        width: 0,
        height: 0,
      }
      boxRef.current = initial
      setBoxStyle({
        position: "absolute",
        ...initial,
        background: "var(--color-ring)",
        opacity: 0.15,
        border: "1px solid var(--color-ring)",
        pointerEvents: "none" as const,
        zIndex: 50,
      })
    },
    [isActive, containerRef]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelectingRef.current || !startPoint.current) return
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const currentX = e.clientX - rect.left + container.scrollLeft
      const currentY = e.clientY - rect.top + container.scrollTop

      const left = Math.min(startPoint.current.x, currentX)
      const top = Math.min(startPoint.current.y, currentY)
      const width = Math.abs(currentX - startPoint.current.x)
      const height = Math.abs(currentY - startPoint.current.y)

      boxRef.current = { left, top, width, height }
      setBoxStyle((prev) =>
        prev ? { ...prev, left, top, width, height } : null
      )
    },
    [containerRef]
  )

  const handleMouseUp = useCallback(() => {
    if (!isSelectingRef.current || !startPoint.current) return
    const container = containerRef.current
    if (!container) return

    const box = boxRef.current
    if (!box || (box.width < 5 && box.height < 5)) {
      isSelectingRef.current = false
      boxRef.current = null
      setBoxStyle(null)
      startPoint.current = null
      return
    }

    // Find all cards that intersect the selection box
    const cards = container.querySelectorAll("[data-player-card]")
    const containerRect = container.getBoundingClientRect()
    const scrollLeft = container.scrollLeft
    const scrollTop = container.scrollTop

    const selectedIds = new Set<string>()
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect()
      const cardLeft = cardRect.left - containerRect.left + scrollLeft
      const cardTop = cardRect.top - containerRect.top + scrollTop
      const cardRight = cardLeft + cardRect.width
      const cardBottom = cardTop + cardRect.height

      if (
        cardLeft < box.left + box.width &&
        cardRight > box.left &&
        cardTop < box.top + box.height &&
        cardBottom > box.top
      ) {
        const id = card.getAttribute("data-player-card")
        if (id) selectedIds.add(id)
      }
    })

    onSelectionCompleteRef.current(selectedIds)
    isSelectingRef.current = false
    boxRef.current = null
    setBoxStyle(null)
    startPoint.current = null
  }, [containerRef])

  useEffect(() => {
    if (!isActive) return

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isActive, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    selectionBoxStyle: boxStyle,
    isSelecting: isSelectingRef.current,
    selectionBoxRef,
  }
}
