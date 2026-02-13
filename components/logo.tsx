"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import GradientText from "@/components/GradientText"

export function Logo({
  className,
  asLink = true,
}: {
  className?: string
  asLink?: boolean
}) {
  const text = (
    <GradientText
      colors={["var(--primary)", "var(--border)"]}
      animationSpeed={2}
      direction="horizontal"
      className={cn("logo-gradient", className)}
    >
      <span
        className="text-xl leading-none"
        style={{ fontFamily: "'Protest Guerrilla', sans-serif" }}
      >
        ITM
      </span>
    </GradientText>
  )

  if (!asLink) return text

  return (
    <Link href="/" className="flex items-center">
      {text}
    </Link>
  )
}
