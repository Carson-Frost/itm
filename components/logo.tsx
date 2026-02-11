import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  asLink = true,
}: {
  className?: string
  asLink?: boolean
}) {
  const text = (
    <span
      className={cn("text-xl leading-none text-foreground", className)}
      style={{ fontFamily: "'Protest Guerrilla', sans-serif" }}
    >
      ITM
    </span>
  )

  if (!asLink) return text

  return (
    <Link href="/" className="flex items-center">
      {text}
    </Link>
  )
}
