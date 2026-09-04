export * from "./post";
export * from "./platform";
export * from "./analytics";
export * from "./campaign";
export * from "./ai";
export * from "./api";

export type ID = string;

export type Timestamp = string;

export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: string;
}

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
  isLeaf?: boolean;
}

export type Theme = "light" | "dark" | "system";

export type Language = "en" | "es" | "fr" | "de" | "pt" | "ja" | "zh";

export type Timezone =
  | "UTC"
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "Europe/London"
  | "Europe/Paris"
  | "Europe/Berlin"
  | "Asia/Tokyo"
  | "Asia/Shanghai"
  | "Australia/Sydney";

export type SortOrder = "asc" | "desc";

export type Status = "active" | "inactive" | "pending" | "archived";

export type Visibility = "public" | "private" | "team";

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Timestamp;
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  timezone: Timezone;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
}

export type PlatformType =
  | "twitter"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "pinterest"
  | "youtube";

export type MediaType = "image" | "video" | "gif" | "carousel";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type ContentType =
  | "text"
  | "image"
  | "video"
  | "carousel"
  | "story"
  | "reel";

export type MetricType =
  | "impressions"
  | "reach"
  | "engagement"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "clicks"
  | "followers";

export type AnalyticsPeriod =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export type ExportFormat = "csv" | "json" | "pdf" | "xlsx";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface Environment {
  NODE_ENV: "development" | "production" | "test";
  NEXT_PUBLIC_APP_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
}
