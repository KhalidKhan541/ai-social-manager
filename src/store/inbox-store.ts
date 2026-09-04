import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { PlatformType } from "@/types";

interface Conversation {
  id: string;
  platform: PlatformType;
  accountId: string;
  contact: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  lastMessage: Message;
  unreadCount: number;
  status: "unread" | "read" | "replied" | "archived";
  labels: string[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: "user" | "contact";
  timestamp: string;
  attachments?: Attachment[];
  isRead: boolean;
  isDeleted: boolean;
}

interface Attachment {
  id: string;
  type: "image" | "video" | "gif" | "file";
  url: string;
  name: string;
  size: number;
}

interface InboxState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  filter: {
    status: "all" | "unread" | "read" | "replied" | "archived";
    platforms: PlatformType[];
    search: string;
    labels: string[];
    assignedTo: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  selectedConversations: string[];
  typingUsers: Record<string, string>;
  onlineUsers: Record<string, boolean>;
  drafts: Record<string, string>;
  searchResults: Conversation[];
  isSearching: boolean;
  sortBy: "updatedAt" | "unreadCount" | "createdAt";
  sortOrder: "asc" | "desc";
}

interface InboxActions {
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<InboxState["filter"]>) => void;
  resetFilter: () => void;
  setPagination: (pagination: Partial<InboxState["pagination"]>) => void;
  setSelectedConversations: (ids: string[]) => void;
  toggleConversationSelection: (id: string) => void;
  selectAllConversations: () => void;
  clearSelection: () => void;
  markAsRead: (conversationId: string) => void;
  markAsUnread: (conversationId: string) => void;
  markAsReplied: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  addLabel: (conversationId: string, label: string) => void;
  removeLabel: (conversationId: string, label: string) => void;
  assignTo: (conversationId: string, userId: string) => void;
  unassign: (conversationId: string) => void;
  setTypingUser: (conversationId: string, userId: string | null) => void;
  setOnlineUser: (userId: string, isOnline: boolean) => void;
  updateDraft: (conversationId: string, content: string) => void;
  clearDraft: (conversationId: string) => void;
  setSearchResults: (results: Conversation[]) => void;
  setSearching: (searching: boolean) => void;
  setSortBy: (sortBy: InboxState["sortBy"]) => void;
  setSortOrder: (order: InboxState["sortOrder"]) => void;
  getUnreadCount: () => number;
  getTotalUnread: () => number;
  getConversationsByPlatform: (platform: PlatformType) => Conversation[];
  getConversationsByStatus: (
    status: InboxState["filter"]["status"]
  ) => Conversation[];
  getFilteredConversations: () => Conversation[];
  getSortedConversations: () => Conversation[];
  getConversationById: (id: string) => Conversation | undefined;
  hasDraft: (conversationId: string) => boolean;
  getDraft: (conversationId: string) => string;
}

type InboxStore = InboxState & InboxActions;

const initialFilter = {
  status: "all" as const,
  platforms: [],
  search: "",
  labels: [],
  assignedTo: null,
};

const initialState: InboxState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  filter: initialFilter,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  selectedConversations: [],
  typingUsers: {},
  onlineUsers: {},
  drafts: {},
  searchResults: [],
  isSearching: false,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

export const useInboxStore = create<InboxStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setConversations: (conversations) =>
          set((state) => {
            state.conversations = conversations;
          }),

        addConversation: (conversation) =>
          set((state) => {
            state.conversations.unshift(conversation);
          }),

        updateConversation: (id, updates) =>
          set((state) => {
            const index = state.conversations.findIndex((c) => c.id === id);
            if (index !== -1) {
              Object.assign(state.conversations[index], updates);
            }
            if (state.currentConversation?.id === id) {
              Object.assign(state.currentConversation, updates);
            }
          }),

        removeConversation: (id) =>
          set((state) => {
            state.conversations = state.conversations.filter(
              (c) => c.id !== id
            );
            state.selectedConversations = state.selectedConversations.filter(
              (sid) => sid !== id
            );
            if (state.currentConversation?.id === id) {
              state.currentConversation = null;
              state.messages = [];
            }
          }),

        setCurrentConversation: (conversation) =>
          set((state) => {
            state.currentConversation = conversation;
            if (conversation) {
              const draft = state.drafts[conversation.id];
              if (!draft) {
                state.drafts[conversation.id] = "";
              }
            }
          }),

        setMessages: (messages) =>
          set((state) => {
            state.messages = messages;
          }),

        addMessage: (message) =>
          set((state) => {
            state.messages.push(message);
            const convIndex = state.conversations.findIndex(
              (c) => c.id === message.conversationId
            );
            if (convIndex !== -1) {
              const conv = state.conversations[convIndex];
              if (conv) {
                conv.lastMessage = message;
                conv.updatedAt = message.timestamp;
                if (message.sender === "contact" && !message.isRead) {
                  conv.unreadCount++;
                }
              }
            }
          }),

        updateMessage: (id, updates) =>
          set((state) => {
            const index = state.messages.findIndex((m) => m.id === id);
            if (index !== -1) {
              Object.assign(state.messages[index], updates);
            }
          }),

        removeMessage: (id) =>
          set((state) => {
            state.messages = state.messages.filter((m) => m.id !== id);
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setSending: (sending) =>
          set((state) => {
            state.isSending = sending;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setFilter: (filter) =>
          set((state) => {
            Object.assign(state.filter, filter);
            state.pagination.page = 1;
          }),

        resetFilter: () =>
          set((state) => {
            state.filter = { ...initialFilter };
            state.pagination.page = 1;
          }),

        setPagination: (pagination) =>
          set((state) => {
            Object.assign(state.pagination, pagination);
          }),

        setSelectedConversations: (ids) =>
          set((state) => {
            state.selectedConversations = ids;
          }),

        toggleConversationSelection: (id) =>
          set((state) => {
            const index = state.selectedConversations.indexOf(id);
            if (index === -1) {
              state.selectedConversations.push(id);
            } else {
              state.selectedConversations.splice(index, 1);
            }
          }),

        selectAllConversations: () =>
          set((state) => {
            state.selectedConversations = state.conversations.map(
              (c) => c.id
            );
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedConversations = [];
          }),

        markAsRead: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.unreadCount = 0;
              conv.status = "read";
            }
            if (state.currentConversation?.id === conversationId) {
              state.currentConversation.unreadCount = 0;
              state.currentConversation.status = "read";
            }
          }),

        markAsUnread: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.status = "unread";
            }
          }),

        markAsReplied: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.status = "replied";
            }
          }),

        archiveConversation: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.status = "archived";
            }
          }),

        unarchiveConversation: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.status = "unread";
            }
          }),

        addLabel: (conversationId, label) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv && !conv.labels.includes(label)) {
              conv.labels.push(label);
            }
          }),

        removeLabel: (conversationId, label) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.labels = conv.labels.filter((l) => l !== label);
            }
          }),

        assignTo: (conversationId, userId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.assignedTo = userId;
            }
          }),

        unassign: (conversationId) =>
          set((state) => {
            const conv = state.conversations.find(
              (c) => c.id === conversationId
            );
            if (conv) {
              conv.assignedTo = undefined;
            }
          }),

        setTypingUser: (conversationId, userId) =>
          set((state) => {
            if (userId) {
              state.typingUsers[conversationId] = userId;
            } else {
              delete state.typingUsers[conversationId];
            }
          }),

        setOnlineUser: (userId, isOnline) =>
          set((state) => {
            state.onlineUsers[userId] = isOnline;
          }),

        updateDraft: (conversationId, content) =>
          set((state) => {
            state.drafts[conversationId] = content;
          }),

        clearDraft: (conversationId) =>
          set((state) => {
            delete state.drafts[conversationId];
          }),

        setSearchResults: (results) =>
          set((state) => {
            state.searchResults = results;
          }),

        setSearching: (searching) =>
          set((state) => {
            state.isSearching = searching;
          }),

        setSortBy: (sortBy) =>
          set((state) => {
            state.sortBy = sortBy;
          }),

        setSortOrder: (order) =>
          set((state) => {
            state.sortOrder = order;
          }),

        getUnreadCount: () => {
          return get().conversations.filter(
            (c) => c.status === "unread"
          ).length;
        },

        getTotalUnread: () => {
          return get().conversations.reduce(
            (sum, c) => sum + c.unreadCount,
            0
          );
        },

        getConversationsByPlatform: (platform) => {
          return get().conversations.filter((c) => c.platform === platform);
        },

        getConversationsByStatus: (status) => {
          if (status === "all") return get().conversations;
          return get().conversations.filter((c) => c.status === status);
        },

        getFilteredConversations: () => {
          const { conversations, filter } = get();
          return conversations.filter((c) => {
            if (filter.status !== "all" && c.status !== filter.status) return false;
            if (
              filter.platforms.length > 0 &&
              !filter.platforms.includes(c.platform)
            )
              return false;
            if (filter.labels.length > 0) {
              if (!filter.labels.some((l) => c.labels.includes(l))) return false;
            }
            if (filter.assignedTo && c.assignedTo !== filter.assignedTo) return false;
            if (filter.search) {
              const searchLower = filter.search.toLowerCase();
              return (
                c.contact.name.toLowerCase().includes(searchLower) ||
                c.contact.username.toLowerCase().includes(searchLower) ||
                c.lastMessage.content.toLowerCase().includes(searchLower)
              );
            }
            return true;
          });
        },

        getSortedConversations: () => {
          const filtered = get().getFilteredConversations();
          const { sortBy, sortOrder } = get();
          
          return [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
              case "updatedAt":
                comparison =
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime();
                break;
              case "unreadCount":
                comparison = b.unreadCount - a.unreadCount;
                break;
              case "createdAt":
                comparison =
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime();
                break;
            }
            return sortOrder === "desc" ? comparison : -comparison;
          });
        },

        getConversationById: (id) => {
          return get().conversations.find((c) => c.id === id);
        },

        hasDraft: (conversationId) => {
          const draft = get().drafts[conversationId];
          return draft !== undefined && draft.length > 0;
        },

        getDraft: (conversationId) => {
          return get().drafts[conversationId] || "";
        },
      }))
    ),
    { name: "InboxStore" }
  )
);

export const selectConversations = (state: InboxStore) => state.conversations;
export const selectCurrentConversation = (state: InboxStore) =>
  state.currentConversation;
export const selectMessages = (state: InboxStore) => state.messages;
export const selectInboxLoading = (state: InboxStore) => state.isLoading;
export const selectInboxError = (state: InboxStore) => state.error;
export const selectInboxFilter = (state: InboxStore) => state.filter;
export const selectSelectedConversations = (state: InboxStore) =>
  state.selectedConversations;
export const selectTypingUsers = (state: InboxStore) => state.typingUsers;
export const selectOnlineUsers = (state: InboxStore) => state.onlineUsers;
export const selectDrafts = (state: InboxStore) => state.drafts;
export const selectSearchResults = (state: InboxStore) => state.searchResults;
