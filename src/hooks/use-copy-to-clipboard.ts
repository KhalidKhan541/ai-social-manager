"use client"

import * as React from "react"

interface UseCopyToClipboardReturn {
  copiedText: string | null
  copy: (text: string) => Promise<boolean>
  reset: () => void
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const copy = React.useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.error("Clipboard API not supported")
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.error("Failed to copy text:", error)
      setCopiedText(null)
      return false
    }
  }, [])

  const reset = React.useCallback(() => {
    setCopiedText(null)
  }, [])

  React.useEffect(() => {
    if (copiedText) {
      const timeout = setTimeout(() => {
        setCopiedText(null)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [copiedText])

  return { copiedText, copy, reset }
}