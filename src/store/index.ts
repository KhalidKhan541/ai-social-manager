import { create } from "zustand";
import type { PlatformKey } from "@/lib/utils";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface SocialAccount {
  id: string;
  platform: PlatformKey;
  handle: string;
  displayName: string;
  avatar: string;
  followers: number;
  connected: boolean;
  lastSync?: string;
}

export interface Post {
  id: string;
  content: string;
  platforms: PlatformKey[];
  media: MediaItem[];
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  author: User;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
  };
  hashtags: string[];
  aiGenerated: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed" | "draft";
  startDate: string;
  endDate?: string;
  postsCount: number;
  platforms: PlatformKey[];
  budget?: number;
  spent?: number;
}

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "gif";
  name: string;
  size: number;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  platform: PlatformKey;
  type: "comment" | "mention" | "dm" | "review";
  content: string;
  author: string;
  authorAvatar?: string;
  postId?: string;
  read: boolean;
  replied: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  platforms: PlatformKey[];
  status: "draft" | "scheduled" | "published";
  time?: string;
}

interface AppState {
  user: User | null;
  sidebarOpen: boolean;
  accounts: SocialAccount[];
  posts: Post[];
  campaigns: Campaign[];
  mediaItems: MediaItem[];
  inboxItems: InboxItem[];
  calendarEvents: CalendarEvent[];
  selectedPlatforms: PlatformKey[];
  composeContent: string;
  setUser: (user: User | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedPlatforms: (platforms: PlatformKey[]) => void;
  setComposeContent: (content: string) => void;
  addPost: (post: Post) => void;
  markInboxRead: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@company.com",
    avatar: undefined,
    role: "owner",
  },
  sidebarOpen: true,
  accounts: [
    {
      id: "1",
      platform: "twitter",
      handle: "@company",
      displayName: "Company Inc.",
      avatar: "",
      followers: 12400,
      connected: true,
      lastSync: "2025-01-15T10:00:00Z",
    },
    {
      id: "2",
      platform: "instagram",
      handle: "@company",
      displayName: "Company Inc.",
      avatar: "",
      followers: 34200,
      connected: true,
      lastSync: "2025-01-15T09:30:00Z",
    },
    {
      id: "3",
      platform: "linkedin",
      handle: "company-inc",
      displayName: "Company Inc.",
      avatar: "",
      followers: 8900,
      connected: true,
      lastSync: "2025-01-15T08:00:00Z",
    },
    {
      id: "4",
      platform: "facebook",
      handle: "companyinc",
      displayName: "Company Inc.",
      avatar: "",
      followers: 56700,
      connected: false,
    },
    {
      id: "5",
      platform: "tiktok",
      handle: "@company",
      displayName: "Company Inc.",
      avatar: "",
      followers: 89300,
      connected: true,
      lastSync: "2025-01-15T07:00:00Z",
    },
  ],
  posts: [
    {
      id: "1",
      content:
        "Excited to announce our new AI-powered features! The future of social media management is here. 🚀",
      platforms: ["twitter", "instagram", "linkedin"],
      media: [],
      status: "published",
      publishedAt: "2025-01-15T14:00:00Z",
      createdAt: "2025-01-15T10:00:00Z",
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" },
      engagement: { likes: 342, comments: 45, shares: 89, impressions: 12400 },
      hashtags: ["AI", "SocialMedia", "Innovation"],
      aiGenerated: false,
    },
    {
      id: "2",
      content:
        "5 tips for growing your audience on Instagram in 2025. Thread below 👇",
      platforms: ["instagram", "twitter"],
      media: [],
      status: "scheduled",
      scheduledAt: "2025-01-16T18:00:00Z",
      createdAt: "2025-01-15T11:00:00Z",
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" },
      hashtags: ["InstagramTips", "GrowthHacking"],
      aiGenerated: true,
    },
    {
      id: "3",
      content:
        "Behind the scenes at our team offsite! Great strategies being planned for Q2.",
      platforms: ["instagram", "facebook", "linkedin"],
      media: [],
      status: "published",
      publishedAt: "2025-01-15T12:00:00Z",
      createdAt: "2025-01-14T09:00:00Z",
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" },
      engagement: { likes: 567, comments: 78, shares: 23, impressions: 23100 },
      hashtags: ["TeamBuilding", "CompanyCulture"],
      aiGenerated: false,
    },
    {
      id: "4",
      content:
        "Our latest blog post: How AI is transforming content creation. Read more on our website.",
      platforms: ["twitter", "linkedin", "facebook"],
      media: [],
      status: "draft",
      createdAt: "2025-01-15T08:00:00Z",
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" },
      hashtags: ["AI", "ContentCreation", "Blogging"],
      aiGenerated: true,
    },
    {
      id: "5",
      content:
        "Join us live this Friday at 3PM EST for our weekly Q&A session! Drop your questions below.",
      platforms: ["twitter", "instagram"],
      media: [],
      status: "scheduled",
      scheduledAt: "2025-01-17T15:00:00Z",
      createdAt: "2025-01-15T13:00:00Z",
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" },
      hashtags: ["LiveQA", "Community"],
      aiGenerated: false,
    },
  ],
  campaigns: [
    {
      id: "1",
      name: "Product Launch Q1 2025",
      description: "Multi-platform campaign for new product release",
      status: "active",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      postsCount: 24,
      platforms: ["twitter", "instagram", "linkedin", "facebook"],
      budget: 5000,
      spent: 2340,
    },
    {
      id: "2",
      name: "Brand Awareness Sprint",
      description: "Increase brand visibility across social channels",
      status: "active",
      startDate: "2025-01-10",
      postsCount: 12,
      platforms: ["instagram", "tiktok"],
      budget: 3000,
      spent: 890,
    },
    {
      id: "3",
      name: "Holiday Campaign 2024",
      description: "Seasonal promotion campaign",
      status: "completed",
      startDate: "2024-12-01",
      endDate: "2024-12-31",
      postsCount: 18,
      platforms: ["twitter", "instagram", "facebook"],
      budget: 4000,
      spent: 3780,
    },
  ],
  mediaItems: [
    {
      id: "1",
      url: "/media/product-shot.jpg",
      type: "image",
      name: "Product Hero Shot",
      size: 2400000,
      createdAt: "2025-01-10T10:00:00Z",
    },
    {
      id: "2",
      url: "/media/demo-video.mp4",
      type: "video",
      name: "Product Demo Video",
      size: 15000000,
      createdAt: "2025-01-12T14:00:00Z",
    },
    {
      id: "3",
      url: "/media/team-photo.jpg",
      type: "image",
      name: "Team Offsite Photo",
      size: 3200000,
      createdAt: "2025-01-14T09:00:00Z",
    },
    {
      id: "4",
      url: "/media/infographic.png",
      type: "image",
      name: "AI Stats Infographic",
      size: 1800000,
      createdAt: "2025-01-13T11:00:00Z",
    },
    {
      id: "5",
      url: "/media/animation.gif",
      type: "gif",
      name: "Logo Animation",
      size: 800000,
      createdAt: "2025-01-11T16:00:00Z",
    },
  ],
  inboxItems: [
    {
      id: "1",
      platform: "twitter",
      type: "mention",
      content: "Hey @company, love your new feature! When will it be available for everyone?",
      author: "Tech Enthusiast",
      authorAvatar: "",
      postId: "1",
      read: false,
      replied: false,
      createdAt: "2025-01-15T15:00:00Z",
    },
    {
      id: "2",
      platform: "instagram",
      type: "comment",
      content: "This is amazing! 🔥 Can you share more details?",
      author: "Social Media Pro",
      authorAvatar: "",
      postId: "1",
      read: false,
      replied: false,
      createdAt: "2025-01-15T14:30:00Z",
    },
    {
      id: "3",
      platform: "linkedin",
      type: "comment",
      content: "Great insights! Would love to collaborate on a case study.",
      author: "Marketing Director",
      authorAvatar: "",
      postId: "3",
      read: true,
      replied: true,
      createdAt: "2025-01-15T12:00:00Z",
    },
    {
      id: "4",
      platform: "facebook",
      type: "comment",
      content: "When is the next live session?",
      author: "Community Member",
      authorAvatar: "",
      postId: "5",
      read: false,
      replied: false,
      createdAt: "2025-01-15T11:00:00Z",
    },
    {
      id: "5",
      platform: "twitter",
      type: "dm",
      content: "Hi, interested in your enterprise plan. Can we schedule a call?",
      author: "Potential Client",
      authorAvatar: "",
      read: false,
      replied: false,
      createdAt: "2025-01-15T10:00:00Z",
    },
  ],
  calendarEvents: [
    {
      id: "1",
      title: "Product announcement post",
      date: "2025-01-16",
      platforms: ["twitter", "instagram"],
      status: "scheduled",
      time: "14:00",
    },
    {
      id: "2",
      title: "Weekly Q&A Live",
      date: "2025-01-17",
      platforms: ["twitter", "instagram"],
      status: "scheduled",
      time: "15:00",
    },
    {
      id: "3",
      title: "Behind the scenes reel",
      date: "2025-01-18",
      platforms: ["instagram", "tiktok"],
      status: "draft",
      time: "12:00",
    },
    {
      id: "4",
      title: "Blog post promotion",
      date: "2025-01-20",
      platforms: ["linkedin", "twitter"],
      status: "scheduled",
      time: "09:00",
    },
    {
      id: "5",
      title: "Customer spotlight",
      date: "2025-01-22",
      platforms: ["instagram", "facebook"],
      status: "draft",
      time: "16:00",
    },
  ],
  selectedPlatforms: ["twitter"],
  composeContent: "",
  setUser: (user) => set({ user }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedPlatforms: (platforms) => set({ selectedPlatforms: platforms }),
  setComposeContent: (content) => set({ composeContent: content }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  markInboxRead: (id) =>
    set((state) => ({
      inboxItems: state.inventoryItems
        ? state.inboxItems
        : state.inboxItems.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
    })),
}));
