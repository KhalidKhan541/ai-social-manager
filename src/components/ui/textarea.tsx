"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  maxLength?: number
  showCount?: boolean
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, maxLength, showCount, autoResize, value, onChange, id, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const textareaId = id || React.useId()
    const [charCount, setCharCount] = React.useState(0)

    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    React.useEffect(() => {
      if (value) {
        setCharCount(String(value).length)
      }
    }, [value])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (autoResize) {
          const textarea = e.target
          textarea.style.height = "auto"
          textarea.style.height = `${textarea.scrollHeight}px`
        }
        onChange?.(e)
      },
      [autoResize, onChange]
    )

    const isOverLimit = maxLength !== undefined && charCount > maxLength

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={combinedRef}
          id={textareaId}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          {...props}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {(error || helperText) && (
            <p
              className={cn(
                "text-sm",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {error || helperText}
            </p>
          )}
          {showCount && (
            <p
              className={cn(
                "ml-auto text-sm",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {charCount}
              {maxLength !== undefined && `/${maxLength}`}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }