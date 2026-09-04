import { PlatformType, PostStatus, CampaignStatus, ID, Timestamp } from "./index";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  stack?: string;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: Timestamp;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    pagination: PaginationMeta;
  };
}

export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  error: ApiError;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
}

export interface RegisterResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: string;
  role: string;
  createdAt: Timestamp;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface CreatePostRequest {
  content: string;
  platforms: PlatformPostRequest[];
  media?: MediaRequest[];
  hashtags?: string[];
  mentions?: string[];
  scheduledAt?: Timestamp;
  campaignId?: ID;
  tags?: string[];
}

export interface PlatformPostRequest {
  platform: PlatformType;
  accountId: string;
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  settings?: Record<string, unknown>;
}

export interface MediaRequest {
  type: "image" | "video" | "gif";
  url?: string;
  fileId?: string;
  altText?: string;
}

export interface UpdatePostRequest {
  content?: string;
  platforms?: PlatformPostRequest[];
  media?: MediaRequest[];
  hashtags?: string[];
  mentions?: string[];
  scheduledAt?: Timestamp;
  status?: PostStatus;
}

export interface SchedulePostRequest {
  postId: string;
  scheduledAt: Timestamp;
  timezone?: string;
}

export interface BulkPostRequest {
  postIds: string[];
  action: "delete" | "schedule" | "duplicate" | "archive";
  payload?: Record<string, unknown>;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  objective: string;
  platforms: PlatformType[];
  startDate: Timestamp;
  endDate?: Timestamp;
  budget?: {
    total: number;
    daily?: number;
    currency?: string;
  };
  targeting?: Record<string, unknown>;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  platforms?: PlatformType[];
  startDate?: Timestamp;
  endDate?: Timestamp;
  budget?: {
    total?: number;
    daily?: number;
  };
}

export interface AnalyticsQueryRequest {
  platforms?: PlatformType[];
  metrics: string[];
  dateRange: {
    start: Timestamp;
    end: Timestamp;
  };
  granularity?: "hour" | "day" | "week" | "month";
  filters?: AnalyticsFilter[];
}

export interface AnalyticsFilter {
  field: string;
  operator: string;
  value: string | number | string[];
}

export interface ExportAnalyticsRequest {
  format: "csv" | "json" | "xlsx" | "pdf";
  dateRange: {
    start: Timestamp;
    end: Timestamp;
  };
  metrics?: string[];
  platforms?: PlatformType[];
}

export interface AIGenerateRequest {
  type: string;
  input: {
    prompt?: string;
    context?: string;
    platform?: PlatformType;
    tone?: string;
    maxLength?: number;
    keywords?: string[];
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AIImproveRequest {
  content: string;
  improvements: string[];
  platform?: PlatformType;
}

export interface ConnectPlatformRequest {
  platform: PlatformType;
  code: string;
  redirectUri: string;
}

export interface DisconnectPlatformRequest {
  platform: PlatformType;
  accountId: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface UploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  type: string;
  size: number;
}

export interface SearchRequest {
  query: string;
  type?: string;
  platforms?: PlatformType[];
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  filters?: Record<string, unknown>;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  suggestions?: string[];
}

export interface NotificationPreferences {
  email: {
    posts: boolean;
    analytics: boolean;
    billing: boolean;
    security: boolean;
    marketing: boolean;
  };
  push: {
    posts: boolean;
    mentions: boolean;
    comments: boolean;
    messages: boolean;
  };
  inApp: {
    all: boolean;
  };
}

export interface BillingSubscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAt?: Timestamp;
}

export interface InvoiceResponse {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  url: string;
  pdfUrl: string;
  createdAt: Timestamp;
}

export interface APIKeyResponse {
  id: string;
  name: string;
  prefix: string;
  createdAt: Timestamp;
  lastUsedAt?: Timestamp;
  expiresAt?: Timestamp;
}

export interface APIUsageResponse {
  requests: number;
  tokens: number;
  cost: number;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

export type WebSocketEvent =
  | "post:created"
  | "post:updated"
  | "post:published"
  | "post:failed"
  | "campaign:updated"
  | "inbox:message"
  | "analytics:updated"
  | "notification:new"
  | "platform:connected"
  | "platform:disconnected";

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  data: T;
  timestamp: Timestamp;
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>
): ErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      pagination,
    },
  };
}
