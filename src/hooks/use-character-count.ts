"use client"

import * as React from "react"

interface UseCharacterCountOptions {
  maxLength?: number
  minLength?: number
  onChange?: (value: string) => void
}

interface UseCharacterCountReturn {
  value: string
  setValue: (value: string) => void
  characterCount: number
  characterCountWithSpaces: number
  wordCount: number
  lineCount: number
  isOverLimit: boolean
  isUnderMinLength: boolean
  remainingCharacters: number
  percentage: number
}

export function useCharacterCount({
  maxLength,
  minLength = 0,
  onChange,
}: UseCharacterCountOptions = {}): UseCharacterCountReturn {
  const [value, setValue] = React.useState("")

  const handleChange = React.useCallback(
    (newValue: string) => {
      if (maxLength && newValue.length > maxLength) {
        return
      }
      setValue(newValue)
      onChange?.(newValue)
    },
    [maxLength, onChange]
  )

  const characterCount = value.length

  const characterCountWithSpaces = value.replace(/\s/g, "").length

  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length

  const lineCount = value === "" ? 0 : value.split("\n").length

  const isOverLimit = maxLength !== undefined ? characterCount > maxLength : false

  const isUnderMinLength = characterCount < minLength

  const remainingCharacters = maxLength !== undefined ? maxLength - characterCount : 0

  const percentage = maxLength !== undefined ? Math.min((characterCount / maxLength) * 100, 100) : 0

  return {
    value,
    setValue: handleChange,
    characterCount,
    characterCountWithSpaces,
    wordCount,
    lineCount,
    isOverLimit,
    isUnderMinLength,
    remainingCharacters,
    percentage,
  }
}