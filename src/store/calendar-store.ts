import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Post, PlatformType } from "@/types";

interface CalendarDay {
  date: string;
  posts: Post[];
  scheduledCount: number;
  publishedCount: number;
  draftCount: number;
}

interface CalendarState {
  currentDate: Date;
  selectedDate: Date | null;
  viewMode: "month" | "week" | "day";
  calendarDays: CalendarDay[];
  selectedDayPosts: Post[];
  isLoading: boolean;
  error: string | null;
  filters: {
    platforms: PlatformType[];
    statuses: string[];
    tags: string[];
  };
  highlightedDates: string[];
  draggedPost: Post | null;
  quickCreateMode: boolean;
}

interface CalendarActions {
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setViewMode: (mode: CalendarState["viewMode"]) => void;
  setCalendarDays: (days: CalendarDay[]) => void;
  setSelectedDayPosts: (posts: Post[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<CalendarState["filters"]>) => void;
  resetFilters: () => void;
  setHighlightedDates: (dates: string[]) => void;
  addHighlightedDate: (date: string) => void;
  removeHighlightedDate: (date: string) => void;
  setDraggedPost: (post: Post | null) => void;
  setQuickCreateMode: (enabled: boolean) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToMonth: (year: number, month: number) => void;
  goToWeek: (date: Date) => void;
  goToDay: (date: Date) => void;
  addPostToDay: (date: string, post: Post) => void;
  removePostFromDay: (date: string, postId: string) => void;
  movePost: (fromDate: string, toDate: string, postId: string) => void;
  getPostsForDate: (date: string) => Post[];
  getPostsForDateRange: (start: Date, end: Date) => Post[];
  getPostCountForDate: (date: string) => number;
  hasPostsOnDate: (date: string) => boolean;
  getBusiestDay: () => string | null;
  getUpcomingPosts: (days?: number) => Post[];
}

type CalendarStore = CalendarState & CalendarActions;

const initialFilters = {
  platforms: [],
  statuses: [],
  tags: [],
};

const initialState: CalendarState = {
  currentDate: new Date(),
  selectedDate: null,
  viewMode: "month",
  calendarDays: [],
  selectedDayPosts: [],
  isLoading: false,
  error: null,
  filters: initialFilters,
  highlightedDates: [],
  draggedPost: null,
  quickCreateMode: false,
};

export const useCalendarStore = create<CalendarStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setCurrentDate: (date) =>
          set((state) => {
            state.currentDate = date;
          }),

        setSelectedDate: (date) =>
          set((state) => {
            state.selectedDate = date;
            if (date) {
              const dateStr = date.toISOString().split("T")[0]!;
              state.selectedDayPosts = get().getPostsForDate(dateStr);
            }
          }),

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        setCalendarDays: (days) =>
          set((state) => {
            state.calendarDays = days;
          }),

        setSelectedDayPosts: (posts) =>
          set((state) => {
            state.selectedDayPosts = posts;
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setFilters: (filters) =>
          set((state) => {
            Object.assign(state.filters, filters);
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = { ...initialFilters };
          }),

        setHighlightedDates: (dates) =>
          set((state) => {
            state.highlightedDates = dates;
          }),

        addHighlightedDate: (date) =>
          set((state) => {
            if (!state.highlightedDates.includes(date)) {
              state.highlightedDates.push(date);
            }
          }),

        removeHighlightedDate: (date) =>
          set((state) => {
            state.highlightedDates = state.highlightedDates.filter(
              (d) => d !== date
            );
          }),

        setDraggedPost: (post) =>
          set((state) => {
            state.draggedPost = post;
          }),

        setQuickCreateMode: (enabled) =>
          set((state) => {
            state.quickCreateMode = enabled;
          }),

        goToToday: () =>
          set((state) => {
            state.currentDate = new Date();
          }),

        goToPrevious: () =>
          set((state) => {
            const date = new Date(state.currentDate);
            switch (state.viewMode) {
              case "month":
                date.setMonth(date.getMonth() - 1);
                break;
              case "week":
                date.setDate(date.getDate() - 7);
                break;
              case "day":
                date.setDate(date.getDate() - 1);
                break;
            }
            state.currentDate = date;
          }),

        goToNext: () =>
          set((state) => {
            const date = new Date(state.currentDate);
            switch (state.viewMode) {
              case "month":
                date.setMonth(date.getMonth() + 1);
                break;
              case "week":
                date.setDate(date.getDate() + 7);
                break;
              case "day":
                date.setDate(date.getDate() + 1);
                break;
            }
            state.currentDate = date;
          }),

        goToMonth: (year, month) =>
          set((state) => {
            state.currentDate = new Date(year, month, 1);
          }),

        goToWeek: (date) =>
          set((state) => {
            state.currentDate = date;
            state.viewMode = "week";
          }),

        goToDay: (date) =>
          set((state) => {
            state.currentDate = date;
            state.viewMode = "day";
          }),

        addPostToDay: (date, post) =>
          set((state) => {
            const dayIndex = state.calendarDays.findIndex((d) => d.date === date);
            if (dayIndex !== -1) {
              const day = state.calendarDays[dayIndex];
              if (day && !day.posts.some((p) => p.id === post.id)) {
                day.posts.push(post);
                day.scheduledCount++;
              }
            }
          }),

        removePostFromDay: (date, postId) =>
          set((state) => {
            const dayIndex = state.calendarDays.findIndex((d) => d.date === date);
            if (dayIndex !== -1) {
              const day = state.calendarDays[dayIndex];
              if (day) {
                const postIndex = day.posts.findIndex((p) => p.id === postId);
                if (postIndex !== -1) {
                  const post = day.posts[postIndex];
                  if (post?.status === "scheduled") day.scheduledCount--;
                  else if (post?.status === "published") day.publishedCount--;
                  else if (post?.status === "draft") day.draftCount--;
                  day.posts.splice(postIndex, 1);
                }
              }
            }
          }),

        movePost: (fromDate, toDate, postId) =>
          set((state) => {
            const fromDay = state.calendarDays.find((d) => d.date === fromDate);
            const toDay = state.calendarDays.find((d) => d.date === toDate);
            
            if (fromDay && toDay) {
              const postIndex = fromDay.posts.findIndex((p) => p.id === postId);
              if (postIndex !== -1) {
                const post = fromDay.posts[postIndex];
                if (post) {
                  fromDay.posts.splice(postIndex, 1);
                  if (post.status === "scheduled") fromDay.scheduledCount--;
                  else if (post.status === "published") fromDay.publishedCount--;
                  else if (post.status === "draft") fromDay.draftCount--;
                  
                  toDay.posts.push(post);
                  if (post.status === "scheduled") toDay.scheduledCount++;
                  else if (post.status === "published") toDay.publishedCount++;
                  else if (post.status === "draft") toDay.draftCount++;
                }
              }
            }
          }),

        getPostsForDate: (date) => {
          const day = get().calendarDays.find((d) => d.date === date);
          return day?.posts || [];
        },

        getPostsForDateRange: (start, end) => {
          const startStr = start.toISOString().split("T")[0]!;
          const endStr = end.toISOString().split("T")[0]!;
          
          return get().calendarDays
            .filter((d) => d.date >= startStr && d.date <= endStr)
            .flatMap((d) => d.posts);
        },

        getPostCountForDate: (date) => {
          const day = get().calendarDays.find((d) => d.date === date);
          return day?.posts.length || 0;
        },

        hasPostsOnDate: (date) => {
          const day = get().calendarDays.find((d) => d.date === date);
          return (day?.posts.length || 0) > 0;
        },

        getBusiestDay: () => {
          const days = get().calendarDays;
          if (days.length === 0) return null;
          
          return days.reduce((busiest, day) =>
            day.posts.length > (busiest?.posts.length || 0) ? day : busiest
          )?.date || null;
        },

        getUpcomingPosts: (days = 7) => {
          const now = new Date();
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + days);
          
          const startStr = now.toISOString().split("T")[0]!;
          const endStr = endDate.toISOString().split("T")[0]!;
          
          return get().calendarDays
            .filter((d) => d.date >= startStr && d.date <= endStr)
            .flatMap((d) => d.posts)
            .filter((p) => p.status === "scheduled")
            .sort((a, b) => {
              const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
              const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
              return aTime - bTime;
            });
        },
      }))
    ),
    { name: "CalendarStore" }
  )
);

export const selectCurrentDate = (state: CalendarStore) => state.currentDate;
export const selectSelectedDate = (state: CalendarStore) => state.selectedDate;
export const selectCalendarViewMode = (state: CalendarStore) => state.viewMode;
export const selectCalendarDays = (state: CalendarStore) => state.calendarDays;
export const selectSelectedDayPosts = (state: CalendarStore) => state.selectedDayPosts;
export const selectCalendarLoading = (state: CalendarStore) => state.isLoading;
export const selectCalendarFilters = (state: CalendarStore) => state.filters;
export const selectHighlightedDates = (state: CalendarStore) => state.highlightedDates;
export const selectDraggedPost = (state: CalendarStore) => state.draggedPost;
export const selectQuickCreateMode = (state: CalendarStore) => state.quickCreateMode;
