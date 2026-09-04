"use client"

import * as React from "react"

export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined)

  React.useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

export function usePreviousValue<T>(value: T, onChange: (prev: T | undefined, current: T) => void): void {
  const prevRef = React.useRef<T | undefined>(undefined)

  React.useEffect(() => {
    const prev = prevRef.current
    if (prev !== value) {
      onChange(prev, value)
      prevRef.current = value
    }
  }, [value, onChange])
}