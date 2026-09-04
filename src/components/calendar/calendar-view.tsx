"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store";
import { cn, PLATFORMS, type PlatformKey } from "@/lib/utils";
import { CalendarEvent } from "@/components/calendar/calendar-event";

interface CalendarViewProps {
  currentDate: Date;
  view: "month" | "week";
}

export function CalendarView({ currentDate, view }: CalendarViewProps) {
  const { calendarEvents } = useAppStore();

  const days = useMemo(() => {
    if (view === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        weekDays.push(day);
      }
      return weekDays;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const daysArray = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      daysArray.push(day);
    }
    return daysArray;
  }, [currentDate, view]);

  const eventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return calendarEvents.filter((e) => e.date === dateStr);
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (view === "week") {
    return (
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDayLabels.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[500px]">
          {days.map((day, i) => {
            const dayEvents = eventsForDate(day);
            const isToday = day.toISOString().split("T")[0] === todayStr;
            return (
              <div
                key={i}
                className={cn(
                  "border-r last:border-r-0 border-b p-2 min-h-[100px]",
                  day.getMonth() !== currentDate.getMonth() && "bg-muted/30",
                  isToday && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-2",
                    isToday
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <CalendarEvent key={event.id} event={event} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {weekDayLabels.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = eventsForDate(day);
          const isToday = day.toISOString().split("T")[0] === todayStr;
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={i}
              className={cn(
                "border-r last:border-r-0 border-b p-2 min-h-[120px] hover:bg-muted/30 transition-colors cursor-pointer",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && isCurrentMonth && "text-foreground",
                  !isCurrentMonth && "text-muted-foreground"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEvent key={event.id} event={event} compact />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
