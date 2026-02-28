import { useState, useEffect } from "react"

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function useRelativeTime(date: Date | null): string | null {
  const [text, setText] = useState<string | null>(
    date ? formatRelativeTime(date) : null
  )

  useEffect(() => {
    if (!date) {
      setText(null)
      return
    }

    setText(formatRelativeTime(date))
    const interval = setInterval(() => {
      setText(formatRelativeTime(date))
    }, 10_000)

    return () => clearInterval(interval)
  }, [date])

  return text
}
