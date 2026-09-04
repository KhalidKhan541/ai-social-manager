"use client"

import * as React from "react"

export function useKeyPress(
  targetKey: string,
  handler: (event: KeyboardEvent) => void,
  options?: {
    enabled?: boolean
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
) {
  const { enabled = true, ctrl = false, shift = false, alt = false, meta = false } = options || {}

  React.useEffect(() => {
    if (!enabled) return

    const listener = (event: KeyboardEvent) => {
      if (event.key !== targetKey) return
      if (ctrl && !event.ctrlKey) return
      if (shift && !event.shiftKey) return
      if (alt && !event.altKey) return
      if (meta && !event.metaKey) return

      handler(event)
    }

    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [targetKey, handler, enabled, ctrl, shift, alt, meta])
}

export function useEscapeKey(handler: () => void, enabled: boolean = true) {
  useKeyPress("Escape", handler, { enabled })
}

export function useEnterKey(handler: () => void, enabled: boolean = true) {
  useKeyPress("Enter", handler, { enabled })
}