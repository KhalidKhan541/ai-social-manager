import { z } from "zod";

// ============================================================
// ENV SCHEMA
// ============================================================

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string")
    .startsWith("postgresql://", "DATABASE_URL must be a PostgreSQL connection string"),

  // NextAuth
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .optional()
    .default("http://localhost:3000"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // OAuth Providers
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),

  // Redis
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis URL").optional(),

  // AI
  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY must start with sk-").optional(),

  // Social Media API Keys
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_SECRET: z.string().optional(),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),

  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  // App Config
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string().url("APP_URL must be a valid URL").default("http://localhost:3000"),
  API_URL: z.string().url("API_URL must be a valid URL").default("http://localhost:3000/api"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_")
    .optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// ============================================================
// ENV VALIDATION
// ============================================================

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

function validateServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  try {
    _serverEnv = serverEnvSchema.parse(process.env);
    return _serverEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `  ${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("\n❌ Invalid environment variables:\n");
      console.error(missingVars);
      console.error("\n");
    }
    throw error;
  }
}

function validateClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;

  try {
    _clientEnv = clientEnvSchema.parse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
    return _clientEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `  ${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("\n❌ Invalid client environment variables:\n");
      console.error(missingVars);
      console.error("\n");
    }
    throw error;
  }
}

// ============================================================
// ENV ACCESSORS
// ============================================================

export function getServerEnv(): ServerEnv {
  return validateServerEnv();
}

export function getClientEnv(): ClientEnv {
  return validateClientEnv();
}

// Direct access helpers
export const env = {
  get database() {
    return getServerEnv().DATABASE_URL;
  },
  get nextAuthUrl() {
    return getServerEnv().NEXTAUTH_URL;
  },
  get nextAuthSecret() {
    return getServerEnv().NEXTAUTH_SECRET;
  },
  get stripe() {
    const serverEnv = getServerEnv();
    return {
      secretKey: serverEnv.STRIPE_SECRET_KEY,
      webhookSecret: serverEnv.STRIPE_WEBHOOK_SECRET,
    };
  },
  get redis() {
    return getServerEnv().REDIS_URL;
  },
  get openai() {
    return getServerEnv().OPENAI_API_KEY;
  },
  get appUrl() {
    return getServerEnv().APP_URL;
  },
  get apiUrl() {
    return getServerEnv().API_URL;
  },
  get isProduction() {
    return getServerEnv().NODE_ENV === "production";
  },
  get isDevelopment() {
    return getServerEnv().NODE_ENV === "development";
  },
  get isTest() {
    return getServerEnv().NODE_ENV === "test";
  },
  get logLevel() {
    return getServerEnv().LOG_LEVEL;
  },
};

// ============================================================
// OAUTH PROVIDER CONFIG
// ============================================================

export const oauthProviders = {
  github: {
    clientId: getServerEnv().GITHUB_CLIENT_ID,
    clientSecret: getServerEnv().GITHUB_CLIENT_SECRET,
  },
  google: {
    clientId: getServerEnv().GOOGLE_CLIENT_ID,
    clientSecret: getServerEnv().GOOGLE_CLIENT_SECRET,
  },
} as const;

// ============================================================
// SOCIAL MEDIA API CONFIG
// ============================================================

export const socialApiConfig = {
  twitter: {
    apiKey: getServerEnv().TWITTER_API_KEY,
    apiSecret: getServerEnv().TWITTER_API_SECRET,
    accessToken: getServerEnv().TWITTER_ACCESS_TOKEN,
    accessSecret: getServerEnv().TWITTER_ACCESS_SECRET,
  },
  linkedin: {
    clientId: getServerEnv().LINKEDIN_CLIENT_ID,
    clientSecret: getServerEnv().LINKEDIN_CLIENT_SECRET,
  },
  instagram: {
    clientId: getServerEnv().INSTAGRAM_CLIENT_ID,
    clientSecret: getServerEnv().INSTAGRAM_CLIENT_SECRET,
  },
  facebook: {
    appId: getServerEnv().FACEBOOK_APP_ID,
    appSecret: getServerEnv().FACEBOOK_APP_SECRET,
  },
  tiktok: {
    clientKey: getServerEnv().TIKTOK_CLIENT_KEY,
    clientSecret: getServerEnv().TIKTOK_CLIENT_SECRET,
  },
} as const;

// ============================================================
// APP CONFIGURATION
// ============================================================

export const appConfig = {
  name: "AI Social Manager",
  description: "AI-Powered Social Media Management Platform",
  version: "1.0.0",

  // Feature flags
  features: {
    aiGeneration: !!getServerEnv().OPENAI_API_KEY,
    realTimeUpdates: true,
    advancedAnalytics: true,
    teamCollaboration: true,
    approvalWorkflows: true,
  },

  // Limits
  limits: {
    maxUploadSize: 50 * 1024 * 1024, // 50MB
    maxPostLength: 5000,
    maxMediaPerPost: 10,
    maxBulkSchedule: 50,
    maxSearchResults: 50,
  },

  // Timeouts (in ms)
  timeouts: {
    apiRequest: 30000,
    aiGeneration: 60000,
    socialPublish: 30000,
    analyticsSync: 120000,
  },

  // Intervals
  intervals: {
    analyticsSync: 3600000, // 1 hour
    sessionCleanup: 86400000, // 24 hours
    heartbeat: 30000, // 30 seconds
  },
} as const;

// ============================================================
// VALIDATION HELPER
// ============================================================

export function validateEnv(): { valid: boolean; errors: string[] } {
  try {
    validateServerEnv();
    validateClientEnv();
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: [(error as Error).message],
    };
  }
}

export default env;
