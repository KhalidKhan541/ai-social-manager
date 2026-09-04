import { z } from "zod";

// ─── Auth Validators ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  orgName: z.string().min(2, "Organization name required").max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// ─── Organization Validators ────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  logo: z.string().url().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  logo: z.string().url().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "MEMBER", "VIEWER"]).default("MEMBER"),
});

// ─── Post Validators ────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  mediaUrls: z.array(z.string().url()).max(10).default([]),
  hashtags: z.array(z.string()).max(30).default([]),
  mentions: z.array(z.string()).max(20).default([]),
  accountId: z.string().optional(),
  campaignId: z.string().optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]).default("DRAFT"),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  mentions: z.array(z.string()).max(20).optional(),
  accountId: z.string().optional(),
  campaignId: z.string().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ARCHIVED"]).optional(),
});

export const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime("Invalid datetime format"),
  accountId: z.string().optional(),
});

export const bulkPostSchema = z.object({
  action: z.enum(["delete", "schedule", "publish", "archive", "duplicate"]),
  postIds: z.array(z.string()).min(1, "Select at least one post").max(50),
  scheduledAt: z.string().datetime().optional(),
  accountId: z.string().optional(),
});

export const postFiltersSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED", "ARCHIVED"]).optional(),
  platform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]).optional(),
  campaignId: z.string().optional(),
  accountId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledAt", "publishedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Campaign Validators ────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().min(0).optional(),
  goals: z
    .object({
      impressions: z.number().min(0).optional(),
      engagement: z.number().min(0).optional(),
      followers: z.number().min(0).optional(),
      clicks: z.number().min(0).optional(),
    })
    .optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().min(0).optional(),
  goals: z
    .object({
      impressions: z.number().min(0).optional(),
      engagement: z.number().min(0).optional(),
      followers: z.number().min(0).optional(),
      clicks: z.number().min(0).optional(),
    })
    .optional(),
});

// ─── Calendar Validators ────────────────────────────────────────────────────────

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  color: z.string().optional(),
  postId: z.string().optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
  postId: z.string().optional(),
});

// ─── Inbox Validators ───────────────────────────────────────────────────────────

export const replyToInboxSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const updateInboxItemSchema = z.object({
  status: z.enum(["UNREAD", "READ", "REPLIED", "ARCHIVED", "FLAGGED"]).optional(),
});

// ─── AI Validators ──────────────────────────────────────────────────────────────

export const generatePostSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]),
  tone: z.string().max(100).optional(),
  brandVoice: z.string().max(500).optional(),
  includeEmojis: z.boolean().default(true),
  maxLength: z.number().min(1).max(10000).optional(),
  targetAudience: z.string().max(200).optional(),
});

export const generateHashtagsSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]),
  count: z.number().min(1).max(30).default(10),
});

export const optimizePostSchema = z.object({
  content: z.string().min(1).max(10000),
  platform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]),
  goal: z.enum(["engagement", "reach", "clicks", "conversions"]).default("engagement"),
});

export const sentimentAnalysisSchema = z.object({
  text: z.string().min(1).max(10000),
});

export const repurposeContentSchema = z.object({
  content: z.string().min(1).max(10000),
  sourcePlatform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]),
  targetPlatforms: z
    .array(z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]))
    .min(1)
    .max(5),
});

export const calendarSuggestionsSchema = z.object({
  platforms: z
    .array(z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]))
    .min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  topics: z.array(z.string().max(200)).max(10).default([]),
});

// ─── Media Validators ───────────────────────────────────────────────────────────

export const uploadMediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(["IMAGE", "VIDEO", "GIF", "DOCUMENT"]),
  filename: z.string().min(1).max(255),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().max(500).optional(),
});

// ─── Team Validators ────────────────────────────────────────────────────────────

export const updateTeamMemberSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "MEMBER", "VIEWER"]),
});

// ─── Analytics Validators ───────────────────────────────────────────────────────

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platform: z.enum(["TWITTER", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"]).optional(),
  campaignId: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── Dashboard Validators ───────────────────────────────────────────────────────

export const dashboardQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
});

// ─── Common ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const orgIdParamSchema = z.object({
  id: z.string().min(1, "Organization ID is required"),
});
