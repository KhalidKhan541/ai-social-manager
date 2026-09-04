import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  PlatformType,
  AnalyticsPeriod,
  MetricType,
  AnalyticsMetric,
  PlatformAnalytics,
  ContentAnalytics,
  AudienceAnalytics,
} from "@/types";

interface AnalyticsState {
  overview: AnalyticsMetric[];
  platformAnalytics: PlatformAnalytics[];
  contentAnalytics: ContentAnalytics | null;
  audienceAnalytics: AudienceAnalytics | null;
  isLoading: boolean;
  error: string | null;
  dateRange: {
    start: Date;
    end: Date;
  };
  period: AnalyticsPeriod;
  selectedPlatforms: PlatformType[];
  selectedMetrics: MetricType[];
  comparisonEnabled: boolean;
  customDateRange: {
    start: Date | null;
    end: Date | null;
  };
  cachedData: Record<string, unknown>;
  lastFetchedAt: Record<string, Date>;
  realTimeEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface AnalyticsActions {
  setOverview: (metrics: AnalyticsMetric[]) => void;
  updateOverviewMetric: (name: string, value: Partial<AnalyticsMetric>) => void;
  setPlatformAnalytics: (analytics: PlatformAnalytics[]) => void;
  updatePlatformAnalytics: (
    platform: PlatformType,
    updates: Partial<PlatformAnalytics>
  ) => void;
  setContentAnalytics: (analytics: ContentAnalytics | null) => void;
  setAudienceAnalytics: (analytics: AudienceAnalytics | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDateRange: (range: { start: Date; end: Date }) => void;
  setPeriod: (period: AnalyticsPeriod) => void;
  setSelectedPlatforms: (platforms: PlatformType[]) => void;
  togglePlatform: (platform: PlatformType) => void;
  setSelectedMetrics: (metrics: MetricType[]) => void;
  toggleMetric: (metric: MetricType) => void;
  setComparisonEnabled: (enabled: boolean) => void;
  setCustomDateRange: (range: {
    start: Date | null;
    end: Date | null;
  }) => void;
  setCachedData: (key: string, data: unknown) => void;
  getCachedData: <T>(key: string) => T | null;
  clearCache: () => void;
  setLastFetchedAt: (key: string) => void;
  isStale: (key: string, maxAge?: number) => boolean;
  setRealTimeEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  resetFilters: () => void;
  getMetricByName: (name: string) => AnalyticsMetric | undefined;
  getPlatformByName: (platform: PlatformType) =>
    | PlatformAnalytics
    | undefined;
  getTotalFollowers: () => number;
  getTotalEngagement: () => number;
  getTotalImpressions: () => number;
  getTotalReach: () => number;
  getAverageEngagementRate: () => number;
  getTopPlatform: () => PlatformAnalytics | undefined;
  getGrowthTrend: () => "up" | "down" | "stable";
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

const defaultDateRange = {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
};

const initialState: AnalyticsState = {
  overview: [],
  platformAnalytics: [],
  contentAnalytics: null,
  audienceAnalytics: null,
  isLoading: false,
  error: null,
  dateRange: defaultDateRange,
  period: "month",
  selectedPlatforms: [],
  selectedMetrics: [],
  comparisonEnabled: false,
  customDateRange: {
    start: null,
    end: null,
  },
  cachedData: {},
  lastFetchedAt: {},
  realTimeEnabled: false,
  autoRefresh: true,
  refreshInterval: 300000,
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setOverview: (metrics) =>
          set((state) => {
            state.overview = metrics;
          }),

        updateOverviewMetric: (name, value) =>
          set((state) => {
            const index = state.overview.findIndex((m) => m.name === name);
            if (index !== -1) {
              Object.assign(state.overview[index], value);
            }
          }),

        setPlatformAnalytics: (analytics) =>
          set((state) => {
            state.platformAnalytics = analytics;
          }),

        updatePlatformAnalytics: (platform, updates) =>
          set((state) => {
            const index = state.platformAnalytics.findIndex(
              (p) => p.platform === platform
            );
            if (index !== -1) {
              Object.assign(state.platformAnalytics[index], updates);
            }
          }),

        setContentAnalytics: (analytics) =>
          set((state) => {
            state.contentAnalytics = analytics;
          }),

        setAudienceAnalytics: (analytics) =>
          set((state) => {
            state.audienceAnalytics = analytics;
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setDateRange: (range) =>
          set((state) => {
            state.dateRange = range;
            state.period = "custom";
          }),

        setPeriod: (period) =>
          set((state) => {
            state.period = period;
            const now = new Date();
            switch (period) {
              case "day":
                state.dateRange = {
                  start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                  end: now,
                };
                break;
              case "week":
                state.dateRange = {
                  start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                  end: now,
                };
                break;
              case "month":
                state.dateRange = {
                  start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                  end: now,
                };
                break;
              case "quarter":
                state.dateRange = {
                  start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
                  end: now,
                };
                break;
              case "year":
                state.dateRange = {
                  start: new Date(now.getFullYear(), 0, 1),
                  end: now,
                };
                break;
            }
          }),

        setSelectedPlatforms: (platforms) =>
          set((state) => {
            state.selectedPlatforms = platforms;
          }),

        togglePlatform: (platform) =>
          set((state) => {
            const index = state.selectedPlatforms.indexOf(platform);
            if (index === -1) {
              state.selectedPlatforms.push(platform);
            } else {
              state.selectedPlatforms.splice(index, 1);
            }
          }),

        setSelectedMetrics: (metrics) =>
          set((state) => {
            state.selectedMetrics = metrics;
          }),

        toggleMetric: (metric) =>
          set((state) => {
            const index = state.selectedMetrics.indexOf(metric);
            if (index === -1) {
              state.selectedMetrics.push(metric);
            } else {
              state.selectedMetrics.splice(index, 1);
            }
          }),

        setComparisonEnabled: (enabled) =>
          set((state) => {
            state.comparisonEnabled = enabled;
          }),

        setCustomDateRange: (range) =>
          set((state) => {
            state.customDateRange = range;
            if (range.start && range.end) {
              state.dateRange = {
                start: range.start,
                end: range.end,
              };
              state.period = "custom";
            }
          }),

        setCachedData: (key, data) =>
          set((state) => {
            state.cachedData[key] = data;
            state.lastFetchedAt[key] = new Date();
          }),

        getCachedData: (key) => {
          return get().cachedData[key] || null;
        },

        clearCache: () =>
          set((state) => {
            state.cachedData = {};
            state.lastFetchedAt = {};
          }),

        setLastFetchedAt: (key) =>
          set((state) => {
            state.lastFetchedAt[key] = new Date();
          }),

        isStale: (key, maxAge = 300000) => {
          const lastFetched = get().lastFetchedAt[key];
          if (!lastFetched) return true;
          return Date.now() - new Date(lastFetched).getTime() > maxAge;
        },

        setRealTimeEnabled: (enabled) =>
          set((state) => {
            state.realTimeEnabled = enabled;
          }),

        setAutoRefresh: (enabled) =>
          set((state) => {
            state.autoRefresh = enabled;
          }),

        setRefreshInterval: (interval) =>
          set((state) => {
            state.refreshInterval = interval;
          }),

        resetFilters: () =>
          set((state) => {
            state.selectedPlatforms = [];
            state.selectedMetrics = [];
            state.comparisonEnabled = false;
            state.customDateRange = { start: null, end: null };
            state.period = "month";
            state.dateRange = defaultDateRange;
          }),

        getMetricByName: (name) => {
          return get().overview.find((m) => m.name === name);
        },

        getPlatformByName: (platform) => {
          return get().platformAnalytics.find((p) => p.platform === platform);
        },

        getTotalFollowers: () => {
          return get().platformAnalytics.reduce(
            (sum, p) => sum + p.followers,
            0
          );
        },

        getTotalEngagement: () => {
          return get().platformAnalytics.reduce(
            (sum, p) => sum + p.engagement,
            0
          );
        },

        getTotalImpressions: () => {
          return get().platformAnalytics.reduce(
            (sum, p) => sum + p.impressions,
            0
          );
        },

        getTotalReach: () => {
          return get().platformAnalytics.reduce((sum, p) => sum + p.reach, 0);
        },

        getAverageEngagementRate: () => {
          const platforms = get().platformAnalytics;
          if (platforms.length === 0) return 0;
          const totalRate = platforms.reduce(
            (sum, p) => sum + p.engagementRate,
            0
          );
          return totalRate / platforms.length;
        },

        getTopPlatform: () => {
          const platforms = get().platformAnalytics;
          if (platforms.length === 0) return undefined;
          return platforms.reduce((top, p) =>
            p.engagement > (top?.engagement || 0) ? p : top
          );
        },

        getGrowthTrend: () => {
          const overview = get().overview;
          const growthMetric = overview.find((m) => m.name === "growth");
          if (!growthMetric) return "stable";
          if (growthMetric.trend === "up") return "up";
          if (growthMetric.trend === "down") return "down";
          return "stable";
        },
      }))
    ),
    { name: "AnalyticsStore" }
  )
);

export const selectOverview = (state: AnalyticsStore) => state.overview;
export const selectPlatformAnalytics = (state: AnalyticsStore) =>
  state.platformAnalytics;
export const selectContentAnalytics = (state: AnalyticsStore) =>
  state.contentAnalytics;
export const selectAudienceAnalytics = (state: AnalyticsStore) =>
  state.audienceAnalytics;
export const selectAnalyticsLoading = (state: AnalyticsStore) => state.isLoading;
export const selectAnalyticsError = (state: AnalyticsStore) => state.error;
export const selectDateRange = (state: AnalyticsStore) => state.dateRange;
export const selectPeriod = (state: AnalyticsStore) => state.period;
export const selectSelectedPlatforms = (state: AnalyticsStore) =>
  state.selectedPlatforms;
export const selectSelectedMetrics = (state: AnalyticsStore) =>
  state.selectedMetrics;
export const selectComparisonEnabled = (state: AnalyticsStore) =>
  state.comparisonEnabled;
export const selectRealTimeEnabled = (state: AnalyticsStore) =>
  state.realTimeEnabled;
export const selectAutoRefresh = (state: AnalyticsStore) => state.autoRefresh;
