import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Post, PostDraft, PostTemplate, PostStatus, PlatformType, PaginationParams } from "@/types";

interface PostState {
  posts: Post[];
  currentPost: Post | null;
  drafts: PostDraft[];
  templates: PostTemplate[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status: PostStatus | "all";
    platforms: PlatformType[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    search: string;
    tags: string[];
    campaignId: string | null;
  };
  selectedPosts: string[];
  viewMode: "grid" | "list" | "calendar";
  sortBy: "createdAt" | "scheduledAt" | "publishedAt" | "engagement";
  sortOrder: "asc" | "desc";
}

interface PostActions {
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  removePost: (id: string) => void;
  setCurrentPost: (post: Post | null) => void;
  setDrafts: (drafts: PostDraft[]) => void;
  addDraft: (draft: PostDraft) => void;
  updateDraft: (id: string, updates: Partial<PostDraft>) => void;
  removeDraft: (id: string) => void;
  setTemplates: (templates: PostTemplate[]) => void;
  addTemplate: (template: PostTemplate) => void;
  updateTemplate: (id: string, updates: Partial<PostTemplate>) => void;
  removeTemplate: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<PostState["pagination"]>) => void;
  setFilters: (filters: Partial<PostState["filters"]>) => void;
  resetFilters: () => void;
  setSelectedPosts: (ids: string[]) => void;
  togglePostSelection: (id: string) => void;
  selectAllPosts: () => void;
  clearSelection: () => void;
  setViewMode: (mode: PostState["viewMode"]) => void;
  setSortBy: (sortBy: PostState["sortBy"]) => void;
  setSortOrder: (order: PostState["sortOrder"]) => void;
  getPostsByStatus: (status: PostStatus) => Post[];
  getPostsByPlatform: (platform: PlatformType) => Post[];
  getScheduledPosts: () => Post[];
  getPublishedPosts: () => Post[];
  getDraftPosts: () => Post[];
  getFailedPosts: () => Post[];
  searchPosts: (query: string) => Post[];
  clearPosts: () => void;
}

type PostStore = PostState & PostActions;

const initialFilters = {
  status: "all" as const,
  platforms: [],
  dateRange: {
    start: null,
    end: null,
  },
  search: "",
  tags: [],
  campaignId: null,
};

const initialState: PostState = {
  posts: [],
  currentPost: null,
  drafts: [],
  templates: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: initialFilters,
  selectedPosts: [],
  viewMode: "list",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export const usePostStore = create<PostStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setPosts: (posts) =>
          set((state) => {
            state.posts = posts;
          }),

        addPost: (post) =>
          set((state) => {
            state.posts.unshift(post);
          }),

        updatePost: (id, updates) =>
          set((state) => {
            const index = state.posts.findIndex((p) => p.id === id);
            if (index !== -1) {
              Object.assign(state.posts[index], updates);
            }
            if (state.currentPost?.id === id) {
              Object.assign(state.currentPost, updates);
            }
          }),

        removePost: (id) =>
          set((state) => {
            state.posts = state.posts.filter((p) => p.id !== id);
            state.selectedPosts = state.selectedPosts.filter((sid) => sid !== id);
            if (state.currentPost?.id === id) {
              state.currentPost = null;
            }
          }),

        setCurrentPost: (post) =>
          set((state) => {
            state.currentPost = post;
          }),

        setDrafts: (drafts) =>
          set((state) => {
            state.drafts = drafts;
          }),

        addDraft: (draft) =>
          set((state) => {
            state.drafts.unshift(draft);
          }),

        updateDraft: (id, updates) =>
          set((state) => {
            const index = state.drafts.findIndex((d) => d.id === id);
            if (index !== -1) {
              Object.assign(state.drafts[index], updates);
            }
          }),

        removeDraft: (id) =>
          set((state) => {
            state.drafts = state.drafts.filter((d) => d.id !== id);
          }),

        setTemplates: (templates) =>
          set((state) => {
            state.templates = templates;
          }),

        addTemplate: (template) =>
          set((state) => {
            state.templates.unshift(template);
          }),

        updateTemplate: (id, updates) =>
          set((state) => {
            const index = state.templates.findIndex((t) => t.id === id);
            if (index !== -1) {
              Object.assign(state.templates[index], updates);
            }
          }),

        removeTemplate: (id) =>
          set((state) => {
            state.templates = state.templates.filter((t) => t.id !== id);
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setPagination: (pagination) =>
          set((state) => {
            Object.assign(state.pagination, pagination);
          }),

        setFilters: (filters) =>
          set((state) => {
            Object.assign(state.filters, filters);
            state.pagination.page = 1;
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = { ...initialFilters };
            state.pagination.page = 1;
          }),

        setSelectedPosts: (ids) =>
          set((state) => {
            state.selectedPosts = ids;
          }),

        togglePostSelection: (id) =>
          set((state) => {
            const index = state.selectedPosts.indexOf(id);
            if (index === -1) {
              state.selectedPosts.push(id);
            } else {
              state.selectedPosts.splice(index, 1);
            }
          }),

        selectAllPosts: () =>
          set((state) => {
            state.selectedPosts = state.posts.map((p) => p.id);
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedPosts = [];
          }),

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        setSortBy: (sortBy) =>
          set((state) => {
            state.sortBy = sortBy;
          }),

        setSortOrder: (order) =>
          set((state) => {
            state.sortOrder = order;
          }),

        getPostsByStatus: (status) => {
          return get().posts.filter((p) => p.status === status);
        },

        getPostsByPlatform: (platform) => {
          return get().posts.filter((p) =>
            p.platforms.some((pc) => pc.platform === platform)
          );
        },

        getScheduledPosts: () => {
          return get().posts.filter((p) => p.status === "scheduled");
        },

        getPublishedPosts: () => {
          return get().posts.filter((p) => p.status === "published");
        },

        getDraftPosts: () => {
          return get().posts.filter((p) => p.status === "draft");
        },

        getFailedPosts: () => {
          return get().posts.filter((p) => p.status === "failed");
        },

        searchPosts: (query) => {
          const lowercaseQuery = query.toLowerCase();
          return get().posts.filter(
            (p) =>
              p.content.toLowerCase().includes(lowercaseQuery) ||
              p.hashtags.some((h) => h.toLowerCase().includes(lowercaseQuery)) ||
              p.mentions.some((m) => m.toLowerCase().includes(lowercaseQuery))
          );
        },

        clearPosts: () =>
          set((state) => {
            state.posts = [];
            state.currentPost = null;
            state.selectedPosts = [];
            state.pagination = initialState.pagination;
          }),
      }))
    ),
    { name: "PostStore" }
  )
);

export const selectPosts = (state: PostStore) => state.posts;
export const selectCurrentPost = (state: PostStore) => state.currentPost;
export const selectDrafts = (state: PostStore) => state.drafts;
export const selectTemplates = (state: PostStore) => state.templates;
export const selectPostLoading = (state: PostStore) => state.isLoading;
export const selectPostError = (state: PostStore) => state.error;
export const selectPostPagination = (state: PostStore) => state.pagination;
export const selectPostFilters = (state: PostStore) => state.filters;
export const selectSelectedPosts = (state: PostStore) => state.selectedPosts;
export const selectViewMode = (state: PostStore) => state.viewMode;
export const selectPostSort = (state: PostStore) => ({
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
});
