"use client"

import * as React from "react"
import { Search, Command as CommandIcon, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  group?: string
  onSelect?: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandItem[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(
  (
    {
      open,
      onOpenChange,
      items,
      placeholder = "Type a command or search...",
      searchPlaceholder = "Search...",
      emptyMessage = "No results found.",
    },
    ref
  ) => {
    const [search, setSearch] = React.useState("")
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (open) {
        setSearch("")
        setSelectedIndex(0)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }, [open])

    const filteredItems = React.useMemo(() => {
      if (!search) return items
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description?.toLowerCase().includes(search.toLowerCase())
      )
    }, [items, search])

    const groupedItems = React.useMemo(() => {
      const groups: Record<string, CommandItem[]> = {}
      filteredItems.forEach((item) => {
        const group = item.group || "Suggestions"
        if (!groups[group]) groups[group] = []
        groups[group].push(item)
      })
      return groups
    }, [filteredItems])

    const flatItems = filteredItems

    React.useEffect(() => {
      setSelectedIndex(0)
    }, [search])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        flatItems[selectedIndex]?.onSelect?.()
        onOpenChange(false)
      } else if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    if (!open) return null

    let itemIndex = 0

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="fixed inset-0 bg-black/80"
          onClick={() => onOpenChange(false)}
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
            <div
              ref={ref}
              className={cn(
                "relative w-full max-w-lg translate-y-[-20%] overflow-hidden rounded-lg border bg-background shadow-lg"
              )}
              onKeyDown={handleKeyDown}
            >
              <div className="flex items-center border-b px-3">
                <CommandIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  ref={inputRef}
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto p-2">
                {Object.entries(groupedItems).map(([group, groupItems]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {group}
                    </div>
                    {groupItems.map((item) => {
                      const currentIndex = itemIndex++
                      return (
                        <button
                          key={item.id}
                          className={cn(
                            "flex w-full items-center rounded-sm px-2 py-2 text-sm outline-none",
                            currentIndex === selectedIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50"
                          )}
                          onClick={() => {
                            item.onSelect?.()
                            onOpenChange(false)
                          }}
                        >
                          {item.icon && (
                            <span className="mr-2 h-4 w-4">{item.icon}</span>
                          )}
                          <div className="flex-1 text-left">
                            <div>{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.shortcut && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}

                {flatItems.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </div>

              <div className="flex items-center border-t px-3 py-2">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    <ArrowDown className="mr-1 h-3 w-3" />
                    to navigate
                  </span>
                  <span className="flex items-center">
                    <CornerDownLeft className="mr-1 h-3 w-3" />
                    to select
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
CommandPalette.displayName = "CommandPalette"

export { CommandPalette }
export type { CommandItem, CommandPaletteProps }