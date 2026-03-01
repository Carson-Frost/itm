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

export const GameTile = memo(function GameTile({
  name,
  headshotUrl,
  isSelected,
  isShaking,
  disabled,
  onClick,
}: GameTileProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        aspect-square relative
        border-3 border-border transition-colors select-none overflow-hidden
        bg-muted/30
        ${isShaking ? "animate-shake" : ""}
        ${isSelected ? "shadow-[inset_0_0_0_3px_var(--color-ring),inset_0_0_10px_-2px_var(--color-ring)]" : "hover:bg-muted/60"}
        ${disabled ? "cursor-default" : "cursor-pointer"}
      `}
    >
      {headshotUrl ? (
        <img
          src={headshotUrl}
          alt=""
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full bg-muted/50" />
      )}

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-5 pb-1 px-1">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {name}
        </p>
      </div>
    </button>
  )
})
