"use client"

import * as React from "react"

export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = React.useState(initialValue)

  const toggle = React.useCallback(() => {
    setValue((prev) => !prev)
  }, [])

  return [value, toggle, setValue]
}

export function useToggleValue<T>(
  value: T,
  alternativeValue: T
): [T, () => void, (value: T) => void] {
  const [currentValue, setCurrentValue] = React.useState(value)

  const toggle = React.useCallback(() => {
    setCurrentValue((prev) => (prev === value ? alternativeValue : value))
  }, [value, alternativeValue])

  return [currentValue, toggle, setCurrentValue]
}