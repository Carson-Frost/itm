import { useEffect, useCallback } from "react"

interface HotkeyBinding {
  key: string
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
  handler: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA") return true
  if (target.isContentEditable) return true
  return false
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return

      for (const binding of bindings) {
        const ctrlMatch = binding.ctrl
          ? e.ctrlKey || e.metaKey
          : !(e.ctrlKey || e.metaKey)
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey

        if (e.key === binding.key && ctrlMatch && shiftMatch) {
          e.preventDefault()
          binding.handler()
          return
        }
      }
    },
    [bindings]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
