"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from "lucide-react";

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(
      newDate.getMonth() + (direction === "next" ? 1 : -1)
    );
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Plan and manage your content schedule
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-1.5" />
          Schedule Post
        </Button>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {monthName}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
            <TabsList>
              <TabsTrigger value="month">
                <LayoutGrid className="w-4 h-4 mr-1" />
                Month
              </TabsTrigger>
              <TabsTrigger value="week">
                <List className="w-4 h-4 mr-1" />
                Week
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarView currentDate={currentDate} view={view} />

      {/* Upcoming Posts Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6 mt-6">
        <div className="lg:col-span-3" />
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">Schedule Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This Week</span>
              <span className="font-medium">8 posts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-medium">32 posts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Drafts</span>
              <span className="font-medium">5 posts</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Best times to post
            </p>
            <div className="space-y-1.5">
              {[
                { day: "Monday", time: "9:00 AM" },
                { day: "Wednesday", time: "12:30 PM" },
                { day: "Friday", time: "6:00 PM" },
              ].map((d) => (
                <div key={d.day} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{d.day}</span>
                  <span className="font-medium">{d.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
