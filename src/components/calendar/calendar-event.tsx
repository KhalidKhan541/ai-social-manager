"use client";

import { cn, PLATFORMS, type PlatformKey } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/store";

interface CalendarEventProps {
  event: CalendarEvent;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export function CalendarEvent({ event, compact = false }: CalendarEventProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "p-1.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity",
          statusColors[event.status] || "bg-muted"
        )}
        title={event.title}
      >
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            {event.platforms.slice(0, 2).map((p) => (
              <div
                key={p}
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: PLATFORMS[p]?.color ?? "#888" }}
              />
            ))}
          </div>
          <span className="truncate">{event.time} {event.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer space-y-2"
      )}
    >
      <div className="flex items-center justify-between">
        <Badge
          variant="secondary"
          className={cn("text-[10px]", statusColors[event.status])}
        >
          {event.status}
        </Badge>
        <span className="text-xs text-muted-foreground">{event.time}</span>
      </div>
      <p className="text-sm font-medium line-clamp-2">{event.title}</p>
      <div className="flex gap-1">
        {event.platforms.map((p) => (
          <span
            key={p}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
            style={{ backgroundColor: PLATFORMS[p]?.color ?? "#888" }}
          >
            {PLATFORMS[p]?.name ?? p}
          </span>
        ))}
      </div>
    </div>
  );
}
