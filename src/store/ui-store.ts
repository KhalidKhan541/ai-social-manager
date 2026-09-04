import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface Modal {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UIState {
  modals: Modal[];
  toasts: Toast[];
  isCommandPaletteOpen: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  isProfileMenuOpen: boolean;
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  isFullWidth: boolean;
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
  activeModal: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
    variant?: "default" | "destructive";
  } | null;
  tooltips: Record<string, boolean>;
  dragState: {
    isDragging: boolean;
    draggedItem: unknown;
    dropTarget: string | null;
  };
  scrollPosition: {
    x: number;
    y: number;
  };
  viewportSize: {
    width: number;
    height: number;
  };
  isResizing: boolean;
  resizablePanels: Record<string, number>;
  colorMode: "light" | "dark" | "system";
  reducedMotion: boolean;
  highContrast: boolean;
}

interface UIActions {
  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  toggleModal: (id: string, data?: unknown) => void;
  isModalOpen: (id: string) => boolean;
  getModalData: <T = unknown>(id: string) => T | undefined;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  setProfileMenuOpen: (open: boolean) => void;
  toggleProfileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setFullWidth: (fullWidth: boolean) => void;
  toggleFullWidth: () => void;
  setBreadcrumbs: (breadcrumbs: UIState["breadcrumbs"]) => void;
  addBreadcrumb: (breadcrumb: { label: string; href?: string }) => void;
  removeBreadcrumb: (index: number) => void;
  clearBreadcrumbs: () => void;
  setActiveModal: (modalId: string | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  showConfirmDialog: (config: Omit<UIState["confirmDialog"], "isOpen">) => void;
  hideConfirmDialog: () => void;
  setTooltipVisible: (id: string, visible: boolean) => void;
  setDragState: (state: Partial<UIState["dragState"]>) => void;
  resetDragState: () => void;
  setScrollPosition: (position: { x: number; y: number }) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setIsResizing: (resizing: boolean) => void;
  setResizablePanel: (id: string, size: number) => void;
  setColorMode: (mode: "light" | "dark" | "system") => void;
  setReducedMotion: (reduced: boolean) => void;
  setHighContrast: (high: boolean) => void;
  closeAllOverlays: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  modals: [],
  toasts: [],
  isCommandPaletteOpen: false,
  isSearchOpen: false,
  isNotificationsOpen: false,
  isProfileMenuOpen: false,
  isMobileMenuOpen: false,
  isSidebarCollapsed: false,
  isFullWidth: false,
  breadcrumbs: [],
  activeModal: null,
  isLoading: false,
  loadingMessage: null,
  confirmDialog: null,
  tooltips: {},
  dragState: {
    isDragging: false,
    draggedItem: null,
    dropTarget: null,
  },
  scrollPosition: { x: 0, y: 0 },
  viewportSize: { width: 0, height: 0 },
  isResizing: false,
  resizablePanels: {},
  colorMode: "system",
  reducedMotion: false,
  highContrast: false,
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        openModal: (id, data) =>
          set((state) => {
            const existingIndex = state.modals.findIndex((m) => m.id === id);
            if (existingIndex !== -1) {
              state.modals[existingIndex]!.isOpen = true;
              state.modals[existingIndex]!.data = data;
            } else {
              state.modals.push({ id, isOpen: true, data });
            }
            state.activeModal = id;
          }),

        closeModal: (id) =>
          set((state) => {
            const modal = state.modals.find((m) => m.id === id);
            if (modal) {
              modal.isOpen = false;
              modal.data = undefined;
            }
            if (state.activeModal === id) {
              state.activeModal = null;
            }
          }),

        closeAllModals: () =>
          set((state) => {
            state.modals = state.modals.map((m) => ({
              ...m,
              isOpen: false,
              data: undefined,
            }));
            state.activeModal = null;
          }),

        toggleModal: (id, data) => {
          const { modals } = get();
          const modal = modals.find((m) => m.id === id);
          if (modal?.isOpen) {
            get().closeModal(id);
          } else {
            get().openModal(id, data);
          }
        },

        isModalOpen: (id) => {
          const modal = get().modals.find((m) => m.id === id);
          return modal?.isOpen || false;
        },

        getModalData: (id) => {
          const modal = get().modals.find((m) => m.id === id);
          return modal?.data;
        },

        addToast: (toast) =>
          set((state) => {
            const newToast: Toast = {
              ...toast,
              id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            };
            state.toasts.push(newToast);
            
            const duration = toast.duration || 5000;
            if (duration > 0) {
              setTimeout(() => {
                get().removeToast(newToast.id);
              }, duration);
            }
          }),

        removeToast: (id) =>
          set((state) => {
            state.toasts = state.toasts.filter((t) => t.id !== id);
          }),

        clearToasts: () =>
          set((state) => {
            state.toasts = [];
          }),

        setCommandPaletteOpen: (open) =>
          set((state) => {
            state.isCommandPaletteOpen = open;
          }),

        toggleCommandPalette: () =>
          set((state) => {
            state.isCommandPaletteOpen = !state.isCommandPaletteOpen;
          }),

        setSearchOpen: (open) =>
          set((state) => {
            state.isSearchOpen = open;
          }),

        toggleSearch: () =>
          set((state) => {
            state.isSearchOpen = !state.isSearchOpen;
          }),

        setNotificationsOpen: (open) =>
          set((state) => {
            state.isNotificationsOpen = open;
          }),

        toggleNotifications: () =>
          set((state) => {
            state.isNotificationsOpen = !state.isNotificationsOpen;
          }),

        setProfileMenuOpen: (open) =>
          set((state) => {
            state.isProfileMenuOpen = open;
          }),

        toggleProfileMenu: () =>
          set((state) => {
            state.isProfileMenuOpen = !state.isProfileMenuOpen;
          }),

        setMobileMenuOpen: (open) =>
          set((state) => {
            state.isMobileMenuOpen = open;
          }),

        toggleMobileMenu: () =>
          set((state) => {
            state.isMobileMenuOpen = !state.isMobileMenuOpen;
          }),

        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.isSidebarCollapsed = collapsed;
          }),

        toggleSidebar: () =>
          set((state) => {
            state.isSidebarCollapsed = !state.isSidebarCollapsed;
          }),

        setFullWidth: (fullWidth) =>
          set((state) => {
            state.isFullWidth = fullWidth;
          }),

        toggleFullWidth: () =>
          set((state) => {
            state.isFullWidth = !state.isFullWidth;
          }),

        setBreadcrumbs: (breadcrumbs) =>
          set((state) => {
            state.breadcrumbs = breadcrumbs;
          }),

        addBreadcrumb: (breadcrumb) =>
          set((state) => {
            state.breadcrumbs.push(breadcrumb);
          }),

        removeBreadcrumb: (index) =>
          set((state) => {
            state.breadcrumbs.splice(index, 1);
          }),

        clearBreadcrumbs: () =>
          set((state) => {
            state.breadcrumbs = [];
          }),

        setActiveModal: (modalId) =>
          set((state) => {
            state.activeModal = modalId;
          }),

        setLoading: (loading, message) =>
          set((state) => {
            state.isLoading = loading;
            state.loadingMessage = message || null;
          }),

        showConfirmDialog: (config) =>
          set((state) => {
            state.confirmDialog = {
              ...config,
              isOpen: true,
            };
          }),

        hideConfirmDialog: () =>
          set((state) => {
            state.confirmDialog = null;
          }),

        setTooltipVisible: (id, visible) =>
          set((state) => {
            state.tooltips[id] = visible;
          }),

        setDragState: (dragState) =>
          set((state) => {
            Object.assign(state.dragState, dragState);
          }),

        resetDragState: () =>
          set((state) => {
            state.dragState = {
              isDragging: false,
              draggedItem: null,
              dropTarget: null,
            };
          }),

        setScrollPosition: (position) =>
          set((state) => {
            state.scrollPosition = position;
          }),

        setViewportSize: (size) =>
          set((state) => {
            state.viewportSize = size;
          }),

        setIsResizing: (resizing) =>
          set((state) => {
            state.isResizing = resizing;
          }),

        setResizablePanel: (id, size) =>
          set((state) => {
            state.resizablePanels[id] = size;
          }),

        setColorMode: (mode) =>
          set((state) => {
            state.colorMode = mode;
          }),

        setReducedMotion: (reduced) =>
          set((state) => {
            state.reducedMotion = reduced;
          }),

        setHighContrast: (high) =>
          set((state) => {
            state.highContrast = high;
          }),

        closeAllOverlays: () =>
          set((state) => {
            state.isCommandPaletteOpen = false;
            state.isSearchOpen = false;
            state.isNotificationsOpen = false;
            state.isProfileMenuOpen = false;
            state.isMobileMenuOpen = false;
            state.modals = state.modals.map((m) => ({
              ...m,
              isOpen: false,
            }));
            state.activeModal = null;
            state.confirmDialog = null;
          }),
      }))
    ),
    { name: "UIStore" }
  )
);

export const selectModals = (state: UIStore) => state.modals;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectCommandPaletteOpen = (state: UIStore) =>
  state.isCommandPaletteOpen;
export const selectSearchOpen = (state: UIStore) => state.isSearchOpen;
export const selectNotificationsOpen = (state: UIStore) =>
  state.isNotificationsOpen;
export const selectProfileMenuOpen = (state: UIStore) => state.isProfileMenuOpen;
export const selectMobileMenuOpen = (state: UIStore) => state.isMobileMenuOpen;
export const selectSidebarCollapsed = (state: UIStore) =>
  state.isSidebarCollapsed;
export const selectFullWidth = (state: UIStore) => state.isFullWidth;
export const selectBreadcrumbs = (state: UIStore) => state.breadcrumbs;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectUILoading = (state: UIStore) => state.isLoading;
export const selectConfirmDialog = (state: UIStore) => state.confirmDialog;
export const selectDragState = (state: UIStore) => state.dragState;
export const selectViewportSize = (state: UIStore) => state.viewportSize;
export const selectColorMode = (state: UIStore) => state.colorMode;
