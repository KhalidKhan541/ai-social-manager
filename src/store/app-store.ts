import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Theme, Language, Timezone, UserPreferences, Notification } from "@/types";

interface AppState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    avatar: string | null;
    plan: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: Theme;
  language: Language;
  timezone: Timezone;
  preferences: UserPreferences;
  notifications: Notification[];
  unreadCount: number;
  sidebarOpen: boolean;
  currentWorkspace: {
    id: string;
    name: string;
  } | null;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  connectedPlatforms: string[];
  maintenanceMode: boolean;
  version: string;
}

interface AppActions {
  setUser: (user: AppState["user"]) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setTimezone: (timezone: Timezone) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentWorkspace: (workspace: AppState["currentWorkspace"]) => void;
  setWorkspaces: (workspaces: AppState["workspaces"]) => void;
  setConnectedPlatforms: (platforms: string[]) => void;
  addConnectedPlatform: (platform: string) => void;
  removeConnectedPlatform: (platform: string) => void;
  setMaintenanceMode: (enabled: boolean) => void;
  setVersion: (version: string) => void;
  logout: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  theme: "system",
  language: "en",
  timezone: "UTC",
  preferences: {
    theme: "system",
    language: "en",
    timezone: "UTC",
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: true,
  },
  notifications: [],
  unreadCount: 0,
  sidebarOpen: true,
  currentWorkspace: null,
  workspaces: [],
  connectedPlatforms: [],
  maintenanceMode: false,
  version: "1.0.0",
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          setUser: (user) =>
            set((state) => {
              state.user = user;
              state.isAuthenticated = user !== null;
            }),

          clearUser: () =>
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
              state.currentWorkspace = null;
              state.workspaces = [];
            }),

          setLoading: (loading) =>
            set((state) => {
              state.isLoading = loading;
            }),

          setTheme: (theme) =>
            set((state) => {
              state.theme = theme;
              state.preferences.theme = theme;
            }),

          setLanguage: (language) =>
            set((state) => {
              state.language = language;
              state.preferences.language = language;
            }),

          setTimezone: (timezone) =>
            set((state) => {
              state.timezone = timezone;
              state.preferences.timezone = timezone;
            }),

          updatePreferences: (preferences) =>
            set((state) => {
              Object.assign(state.preferences, preferences);
              if (preferences.theme) state.theme = preferences.theme;
              if (preferences.language) state.language = preferences.language;
              if (preferences.timezone) state.timezone = preferences.timezone;
            }),

          addNotification: (notification) =>
            set((state) => {
              const newNotification: Notification = {
                ...notification,
                id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                createdAt: new Date().toISOString(),
              };
              state.notifications.unshift(newNotification);
              if (!newNotification.read) {
                state.unreadCount++;
              }
            }),

          markNotificationRead: (id) =>
            set((state) => {
              const notification = state.notifications.find((n) => n.id === id);
              if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }),

          markAllNotificationsRead: () =>
            set((state) => {
              state.notifications.forEach((n) => {
                n.read = true;
              });
              state.unreadCount = 0;
            }),

          removeNotification: (id) =>
            set((state) => {
              const index = state.notifications.findIndex((n) => n.id === id);
              if (index !== -1) {
                const notification = state.notifications[index];
                if (notification && !notification.read) {
                  state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                state.notifications.splice(index, 1);
              }
            }),

          clearNotifications: () =>
            set((state) => {
              state.notifications = [];
              state.unreadCount = 0;
            }),

          toggleSidebar: () =>
            set((state) => {
              state.sidebarOpen = !state.sidebarOpen;
            }),

          setSidebarOpen: (open) =>
            set((state) => {
              state.sidebarOpen = open;
            }),

          setCurrentWorkspace: (workspace) =>
            set((state) => {
              state.currentWorkspace = workspace;
            }),

          setWorkspaces: (workspaces) =>
            set((state) => {
              state.workspaces = workspaces;
            }),

          setConnectedPlatforms: (platforms) =>
            set((state) => {
              state.connectedPlatforms = platforms;
            }),

          addConnectedPlatform: (platform) =>
            set((state) => {
              if (!state.connectedPlatforms.includes(platform)) {
                state.connectedPlatforms.push(platform);
              }
            }),

          removeConnectedPlatform: (platform) =>
            set((state) => {
              state.connectedPlatforms = state.connectedPlatforms.filter(
                (p) => p !== platform
              );
            }),

          setMaintenanceMode: (enabled) =>
            set((state) => {
              state.maintenanceMode = enabled;
            }),

          setVersion: (version) =>
            set((state) => {
              state.version = version;
            }),

          logout: () =>
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
              state.currentWorkspace = null;
              state.workspaces = [];
              state.connectedPlatforms = [];
              state.notifications = [];
              state.unreadCount = 0;
            }),
        }))
      ),
      {
        name: "app-store",
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          timezone: state.timezone,
          preferences: state.preferences,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: "AppStore" }
  )
);

export const selectUser = (state: AppStore) => state.user;
export const selectIsAuthenticated = (state: AppStore) => state.isAuthenticated;
export const selectTheme = (state: AppStore) => state.theme;
export const selectLanguage = (state: AppStore) => state.language;
export const selectTimezone = (state: AppStore) => state.timezone;
export const selectPreferences = (state: AppStore) => state.preferences;
export const selectNotifications = (state: AppStore) => state.notifications;
export const selectUnreadCount = (state: AppStore) => state.unreadCount;
export const selectSidebarOpen = (state: AppStore) => state.sidebarOpen;
export const selectCurrentWorkspace = (state: AppStore) => state.currentWorkspace;
export const selectConnectedPlatforms = (state: AppStore) => state.connectedPlatforms;
export const selectIsLoading = (state: AppStore) => state.isLoading;
