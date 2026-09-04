type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  orgId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }

  const parts = [
    `\x1b[90m${entry.timestamp}\x1b[0m`,
    getColoredLevel(entry.level),
    entry.message,
  ];

  if (entry.requestId) {
    parts.push(`\x1b[90m[${entry.requestId}]\x1b[0m`);
  }

  if (entry.userId) {
    parts.push(`\x1b[90m(user:${entry.userId})\x1b[0m`);
  }

  if (entry.orgId) {
    parts.push(`\x1b[90m(org:${entry.orgId})\x1b[0m`);
  }

  if (entry.duration !== undefined) {
    parts.push(`\x1b[90m${entry.duration}ms\x1b[0m`);
  }

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(`\x1b[36m${JSON.stringify(entry.context)}\x1b[0m`);
  }

  if (entry.error) {
    parts.push(`\x1b[31m${entry.error.name}: ${entry.error.message}\x1b[0m`);
    if (entry.error.stack && process.env.NODE_ENV !== "production") {
      parts.push(`\n\x1b[90m${entry.error.stack}\x1b[0m`);
    }
  }

  return parts.join(" ");
}

function getColoredLevel(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m", // green
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
  };

  return `${colors[level]}${level.toUpperCase().padEnd(5)}\x1b[0m`;
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  requestId?: string,
  userId?: string,
  orgId?: string,
  duration?: number,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (requestId) entry.requestId = requestId;
  if (userId) entry.userId = userId;
  if (orgId) entry.orgId = orgId;
  if (duration !== undefined) entry.duration = duration;

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }

  return entry;
}

function output(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const formatted = formatLogEntry(entry);

  switch (entry.level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

// ============================================================
// MAIN LOGGER
// ============================================================

export const logger = {
  debug(
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string,
    orgId?: string
  ) {
    output(createEntry("debug", message, context, requestId, userId, orgId));
  },

  info(
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string,
    orgId?: string
  ) {
    output(createEntry("info", message, context, requestId, userId, orgId));
  },

  warn(
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string,
    orgId?: string
  ) {
    output(createEntry("warn", message, context, requestId, userId, orgId));
  },

  error(
    message: string,
    error?: Error,
    context?: LogContext,
    requestId?: string,
    userId?: string,
    orgId?: string
  ) {
    output(
      createEntry("error", message, context, requestId, userId, orgId, undefined, error)
    );
  },
};

// ============================================================
// PERFORMANCE LOGGER
// ============================================================

export function createTimer(label: string): {
  stop: (context?: LogContext) => number;
} {
  const start = performance.now();

  return {
    stop: (context?: LogContext): number => {
      const duration = Math.round(performance.now() - start);
      logger.info(`Timer: ${label}`, { ...context, duration });
      return duration;
    },
  };
}

// ============================================================
// REQUEST LOGGER
// ============================================================

export function createRequestLogger(requestId: string) {
  return {
    debug: (message: string, context?: LogContext, userId?: string, orgId?: string) =>
      logger.debug(message, context, requestId, userId, orgId),

    info: (message: string, context?: LogContext, userId?: string, orgId?: string) =>
      logger.info(message, context, requestId, userId, orgId),

    warn: (message: string, context?: LogContext, userId?: string, orgId?: string) =>
      logger.warn(message, context, requestId, userId, orgId),

    error: (message: string, error?: Error, context?: LogContext, userId?: string, orgId?: string) =>
      logger.error(message, error, context, requestId, userId, orgId),

    timer: (label: string) => createTimer(label),
  };
}

// ============================================================
// STRUCTURED LOGGERS
// ============================================================

export const authLogger = {
  login: (email: string, provider: string, success: boolean, requestId?: string) =>
    logger.info(
      `Login attempt: ${success ? "success" : "failed"}`,
      { email, provider, success },
      requestId
    ),

  logout: (userId: string, requestId?: string) =>
    logger.info("User logged out", { userId }, requestId),

  signup: (email: string, provider: string, requestId?: string) =>
    logger.info("New user registered", { email, provider }, requestId),

  passwordReset: (email: string, requestId?: string) =>
    logger.info("Password reset requested", { email }, requestId),
};

export const postLogger = {
  created: (postId: string, authorId: string, orgId: string, requestId?: string) =>
    logger.info("Post created", { postId, authorId, orgId }, requestId),

  published: (postId: string, platform: string, requestId?: string) =>
    logger.info("Post published", { postId, platform }, requestId),

  scheduled: (postId: string, scheduledAt: Date, requestId?: string) =>
    logger.info("Post scheduled", { postId, scheduledAt }, requestId),

  failed: (postId: string, error: Error, requestId?: string) =>
    logger.error("Post publish failed", error, { postId }, requestId),
};

export const aiLogger = {
  generationStarted: (prompt: string, platform: string, requestId?: string) =>
    logger.info("AI generation started", { promptLength: prompt.length, platform }, requestId),

  generationCompleted: (id: string, tokensUsed: number, duration: number, requestId?: string) =>
    logger.info("AI generation completed", { id, tokensUsed, duration }, requestId),

  generationFailed: (error: Error, requestId?: string) =>
    logger.error("AI generation failed", error, undefined, requestId),
};

export const analyticsLogger = {
  syncStarted: (socialAccountId: string, platform: string, requestId?: string) =>
    logger.info("Analytics sync started", { socialAccountId, platform }, requestId),

  syncCompleted: (socialAccountId: string, snapshotsCount: number, requestId?: string) =>
    logger.info("Analytics sync completed", { socialAccountId, snapshotsCount }, requestId),

  syncFailed: (socialAccountId: string, error: Error, requestId?: string) =>
    logger.error("Analytics sync failed", error, { socialAccountId }, requestId),
};

export const billingLogger = {
  subscriptionCreated: (userId: string, plan: string, requestId?: string) =>
    logger.info("Subscription created", { userId, plan }, requestId),

  subscriptionUpdated: (userId: string, oldPlan: string, newPlan: string, requestId?: string) =>
    logger.info("Subscription updated", { userId, oldPlan, newPlan }, requestId),

  paymentFailed: (userId: string, error: Error, requestId?: string) =>
    logger.error("Payment failed", error, { userId }, requestId),

  invoiceGenerated: (userId: string, amount: number, requestId?: string) =>
    logger.info("Invoice generated", { userId, amount }, requestId),
};

// ============================================================
// METRICS LOGGER
// ============================================================

export const metricsLogger = {
  apiRequest: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestId?: string
  ) =>
    logger.info("API request", {
      method,
      path,
      statusCode,
      duration,
    }, requestId),

  apiError: (
    method: string,
    path: string,
    statusCode: number,
    error: Error,
    requestId?: string
  ) =>
    logger.error("API error", error, {
      method,
      path,
      statusCode,
    }, requestId),

  dbQuery: (
    operation: string,
    model: string,
    duration: number,
    requestId?: string
  ) =>
    logger.debug("Database query", {
      operation,
      model,
      duration,
    }, requestId),

  externalService: (
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    requestId?: string
  ) =>
    logger.info("External service call", {
      service,
      operation,
      duration,
      success,
    }, requestId),
};

export default logger;
