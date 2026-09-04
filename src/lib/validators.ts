import { z } from "zod";

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================
// USER SCHEMAS
// ============================================================

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  firstName: z
    .string()
    .max(50, "First name must be less than 50 characters")
    .optional(),
  lastName: z
    .string()
    .max(50, "Last name must be less than 50 characters")
    .optional(),
  image: z.string().url("Invalid image URL").optional().nullable(),
});

export const updateEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string().min(1, "Password is required to change email"),
});

// ============================================================
// ORGANIZATION SCHEMAS
// ============================================================

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  website: z.string().url("Invalid URL").optional().nullable(),
  industry: z.string().max(100).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  website: z.string().url("Invalid URL").optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  logo: z.string().url("Invalid URL").optional().nullable(),
  billingEmail: z.string().email("Invalid email").optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"], {
    errorMap: () => ({ message: "Role must be ADMIN, EDITOR, or VIEWER" }),
  }),
  teamIds: z.array(z.string()).optional(),
});

// ============================================================
// SOCIAL ACCOUNT SCHEMAS
// ============================================================

export const connectSocialAccountSchema = z.object({
  platform: z.enum(
    ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "PINTEREST", "THREADS"],
    {
      errorMap: () => ({ message: "Invalid platform" }),
    }
  ),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  platformAccountId: z.string().min(1, "Platform account ID is required"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username must be less than 100 characters"),
  displayName: z.string().max(100).optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
  scopes: z.array(z.string()).optional(),
});

export const updateSocialAccountSchema = z.object({
  displayName: z.string().max(100).optional(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================================
// POST SCHEMAS
// ============================================================

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Post content is required")
    .max(5000, "Content must be less than 5000 characters"),
  contentType: z
    .enum(["POST", "STORY", "REEL", "THREAD", "CAROUSEL", "VIDEO", "POLL", "ARTICLE"], {
      errorMap: () => ({ message: "Invalid content type" }),
    })
    .default("POST"),
  socialAccountIds: z
    .array(z.string())
    .min(1, "Select at least one social account"),
  scheduledAt: z.string().datetime().optional(),
  media: z
    .array(
      z.object({
        url: z.string().url("Invalid media URL"),
        type: z.enum(["IMAGE", "VIDEO", "CAROUSEL", "STORY", "REEL", "TEXT", "LINK", "POLL", "THREAD"]),
        altText: z.string().max(500).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .max(10, "Maximum 10 media items allowed")
    .optional(),
  campaignId: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, "Post content is required")
    .max(5000, "Content must be less than 5000 characters")
    .optional(),
  contentType: z
    .enum(["POST", "STORY", "REEL", "THREAD", "CAROUSEL", "VIDEO", "POLL", "ARTICLE"])
    .optional(),
  status: z
    .enum(["DRAFT", "SCHEDULED", "QUEUED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED", "ARCHIVED"])
    .optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  media: z
    .array(
      z.object({
        url: z.string().url("Invalid media URL"),
        type: z.enum(["IMAGE", "VIDEO", "CAROUSEL", "STORY", "REEL", "TEXT", "LINK", "POLL", "THREAD"]),
        altText: z.string().max(500).optional(),
      })
    )
    .max(10)
    .optional(),
  campaignId: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const schedulePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  socialAccountIds: z
    .array(z.string())
    .min(1, "Select at least one social account"),
  scheduledAt: z.string().datetime("Invalid scheduled date"),
  timezone: z.string().default("UTC"),
});

export const bulkSchedulePostsSchema = z.object({
  posts: z.array(schedulePostSchema).max(50, "Maximum 50 posts per batch"),
});

// ============================================================
// CAMPAIGN SCHEMAS
// ============================================================

export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive("Budget must be positive").optional(),
  goals: z
    .object({
      targetFollowers: z.number().int().positive().optional(),
      targetEngagement: z.number().positive().optional(),
      targetImpressions: z.number().int().positive().optional(),
      targetReach: z.number().int().positive().optional(),
    })
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateCampaignSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .nullable(),
  status: z
    .enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  goals: z
    .object({
      targetFollowers: z.number().int().positive().optional(),
      targetEngagement: z.number().positive().optional(),
      targetImpressions: z.number().int().positive().optional(),
      targetReach: z.number().int().positive().optional(),
    })
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// ============================================================
// CONTENT CALENDAR SCHEMAS
// ============================================================

export const createCalendarSchema = z.object({
  name: z
    .string()
    .min(1, "Calendar name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
});

export const createCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime("Invalid start date"),
  endAt: z.string().datetime("Invalid end date"),
  allDay: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
  postId: z.string().optional().nullable(),
  recurrence: z.string().optional(),
});

// ============================================================
// AI SCHEMAS
// ============================================================

export const generateContentSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must be less than 2000 characters"),
  platform: z.enum(
    ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE"],
    {
      errorMap: () => ({ message: "Invalid platform" }),
    }
  ),
  contentType: z
    .enum(["POST", "STORY", "REEL", "THREAD", "CAROUSEL", "VIDEO", "POLL", "ARTICLE"])
    .default("POST"),
  tone: z
    .enum(["professional", "casual", "playful", "informative", "persuasive", "humorous"])
    .optional(),
  maxLength: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional(),
  includeHashtags: z.boolean().default(true),
  includeEmojis: z.boolean().default(true),
  brandVoice: z.string().max(500).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export const createAITemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must be less than 2000 characters"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters"),
  variables: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().default(false),
});

export const rateAIGenerationSchema = z.object({
  generationId: z.string().min(1, "Generation ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  feedback: z.string().max(1000).optional(),
});

// ============================================================
// ANALYTICS SCHEMAS
// ============================================================

export const getAnalyticsSchema = z.object({
  socialAccountId: z.string().optional(),
  platform: z
    .enum(["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE"])
    .optional(),
  period: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])
    .default("DAILY"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z
    .array(
      z.enum([
        "followers",
        "engagement",
        "impressions",
        "reach",
        "likes",
        "comments",
        "shares",
        "clicks",
        "saves",
        "videoViews",
      ])
    )
    .optional(),
});

export const generateReportSchema = z.object({
  title: z
    .string()
    .min(1, "Report title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000).optional(),
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  socialAccountIds: z.array(z.string()).optional(),
  includeCharts: z.boolean().default(true),
  format: z.enum(["json", "pdf", "csv"]).default("json"),
});

// ============================================================
// COMMENT SCHEMAS
// ============================================================

export const replyToCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  content: z
    .string()
    .min(1, "Reply content is required")
    .max(2000, "Reply must be less than 2000 characters"),
  useAI: z.boolean().default(false),
  aiTone: z
    .enum(["professional", "casual", "friendly", "apologetic", "thankful"])
    .optional(),
});

export const updateCommentStatusSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  status: z.enum(["PENDING", "REPLIED", "HIDDEN", "FLAGGED", "RESOLVED"]),
});

// ============================================================
// TEAM SCHEMAS
// ============================================================

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
  memberIds: z.array(z.string()).optional(),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});

// ============================================================
// BRAND SCHEMAS
// ============================================================

export const createBrandSchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  logo: z.string().url("Invalid logo URL").optional(),
  colors: z
    .object({
      primary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    })
    .optional(),
  fonts: z
    .object({
      heading: z.string().max(50).optional(),
      body: z.string().max(50).optional(),
    })
    .optional(),
  tone: z
    .enum(["professional", "casual", "playful", "luxurious", "minimalist"])
    .optional(),
  guidelines: z.string().max(5000).optional(),
});

export const updateBrandSchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url("Invalid logo URL").optional().nullable(),
  colors: z
    .object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    })
    .optional()
    .nullable(),
  tone: z
    .enum(["professional", "casual", "playful", "luxurious", "minimalist"])
    .optional()
    .nullable(),
  guidelines: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================================
// APPROVAL SCHEMAS
// ============================================================

export const createApprovalWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, "Workflow name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  rules: z.object({
    requireApprovalFor: z
      .array(z.enum(["ALL", "EXTERNAL", "CAMPAIGNS", "SCHEDULED"]))
      .min(1, "Select at least one rule"),
    approvers: z
      .array(z.string())
      .min(1, "Select at least one approver"),
    autoApproveAfter: z.number().int().min(0).optional(),
    notifyOnSubmission: z.boolean().default(true),
  }),
});

export const decideApprovalSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  comment: z.string().max(2000).optional(),
});

// ============================================================
// NOTIFICATION SCHEMAS
// ============================================================

export const updateNotificationPreferenceSchema = z.object({
  type: z.enum([
    "POST_PUBLISHED",
    "POST_SCHEDULED",
    "POST_FAILED",
    "COMMENT_RECEIVED",
    "MENTION_RECEIVED",
    "CAMPAIGN_UPDATE",
    "APPROVAL_REQUESTED",
    "APPROVAL_DECIDED",
    "TEAM_INVITE",
    "BILLING_UPDATE",
    "SYSTEM_ALERT",
    "AI_SUGGESTION",
    "ANALYTICS_INSIGHT",
  ]),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().default(false),
});

// ============================================================
// BILLING SCHEMAS
// ============================================================

export const createSubscriptionSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
});

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
  cancelAtPeriodEnd: z.boolean().optional(),
});

// ============================================================
// HASHTAG SCHEMAS
// ============================================================

export const searchHashtagsSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Query must be less than 100 characters"),
  platform: z
    .enum(["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK"])
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ============================================================
// COMMON SCHEMAS
// ============================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one item"),
  action: z.string().min(1, "Action is required"),
});

export const searchSchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(200, "Query must be less than 200 characters"),
  type: z
    .enum(["posts", "campaigns", "social-accounts", "users", "all"])
    .default("all"),
  limit: z.number().int().min(1).max(50).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// ============================================================
// EXPORT TYPES
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type ConnectSocialAccountInput = z.infer<typeof connectSocialAccountSchema>;
