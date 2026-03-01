"use client"

import { memo } from "react"

interface GameTileProps {
  name: string
  headshotUrl?: string | null
  isSelected: boolean
  isShaking: boolean
  disabled: boolean
  onClick: () => void
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.split(" ")
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  }
}

export const GameTile = memo(function GameTile({
  name,
  headshotUrl,
  isSelected,
  isShaking,
  disabled,
  onClick,
}: GameTileProps) {
  const { first, last } = splitName(name)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        aspect-square flex flex-col items-center justify-end p-1
        text-[10px] sm:text-xs font-bold uppercase tracking-wide
        border-3 border-border transition-colors select-none overflow-hidden
        bg-muted/30
        ${isShaking ? "animate-shake" : ""}
        ${isSelected ? "shadow-[inset_0_0_0_3px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]" : "hover:bg-muted/60"}
        ${disabled ? "cursor-default" : "cursor-pointer"}
      `}
    >
      {headshotUrl && (
        <img
          src={headshotUrl}
          alt=""
          className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 mb-auto mt-1 object-cover object-top"
        />
      )}
      <div className="leading-tight text-center w-full px-0.5">
        <span className="block truncate">{first}</span>
        {last && <span className="block truncate">{last}</span>}
      </div>
    </button>
  )
})
