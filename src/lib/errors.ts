import { ZodError } from "zod";

// ============================================================
// BASE APPLICATION ERROR
// ============================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, string[]>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: Record<string, string[]>,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
    };
  }
}

// ============================================================
// VALIDATION ERROR
// ============================================================

export class ValidationError extends AppError {
  public readonly validationErrors: Record<string, string[]>;

  constructor(error: ZodError, requestId?: string) {
    const formattedErrors: Record<string, string[]> = {};

    error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(err.message);
    });

    super(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      true,
      formattedErrors,
      requestId
    );

    this.name = "ValidationError";
    this.validationErrors = formattedErrors;
  }
}

// ============================================================
// AUTHENTICATION ERRORS
// ============================================================

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication required",
    requestId?: string
  ) {
    super(message, 401, "AUTHENTICATION_ERROR", true, undefined, requestId);
    this.name = "AuthenticationError";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(requestId?: string) {
    super(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS",
      true,
      undefined,
      requestId
    );
    this.name = "InvalidCredentialsError";
  }
}

export class TokenExpiredError extends AppError {
  constructor(requestId?: string) {
    super(
      "Authentication token has expired",
      401,
      "TOKEN_EXPIRED",
      true,
      undefined,
      requestId
    );
    this.name = "TokenExpiredError";
  }
}

export class TokenInvalidError extends AppError {
  constructor(requestId?: string) {
    super(
      "Invalid authentication token",
      401,
      "TOKEN_INVALID",
      true,
      undefined,
      requestId
    );
    this.name = "TokenInvalidError";
  }
}

export class OAuthError extends AppError {
  constructor(provider: string, requestId?: string) {
    super(
      `Authentication with ${provider} failed`,
      401,
      "OAUTH_ERROR",
      true,
      undefined,
      requestId
    );
    this.name = "OAuthError";
  }
}

// ============================================================
// AUTHORIZATION ERRORS
// ============================================================

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Insufficient permissions",
    requestId?: string
  ) {
    super(message, 403, "AUTHORIZATION_ERROR", true, undefined, requestId);
    this.name = "AuthorizationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = "Access denied",
    requestId?: string
  ) {
    super(message, 403, "FORBIDDEN", true, undefined, requestId);
    this.name = "ForbiddenError";
  }
}

// ============================================================
// NOT FOUND ERRORS
// ============================================================

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, requestId?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, undefined, requestId);
    this.name = "NotFoundError";
  }
}

export class UserNotFoundError extends AppError {
  constructor(identifier: string, requestId?: string) {
    super(
      `User '${identifier}' not found`,
      404,
      "USER_NOT_FOUND",
      true,
      undefined,
      requestId
    );
    this.name = "UserNotFoundError";
  }
}

export class OrganizationNotFoundError extends AppError {
  constructor(slug: string, requestId?: string) {
    super(
      `Organization '${slug}' not found`,
      404,
      "ORG_NOT_FOUND",
      true,
      undefined,
      requestId
    );
    this.name = "OrganizationNotFoundError";
  }
}

export class PostNotFoundError extends AppError {
  constructor(id: string, requestId?: string) {
    super(
      `Post with id '${id}' not found`,
      404,
      "POST_NOT_FOUND",
      true,
      undefined,
      requestId
    );
    this.name = "PostNotFoundError";
  }
}

// ============================================================
// CONFLICT ERRORS
// ============================================================

export class ConflictError extends AppError {
  constructor(message: string, requestId?: string) {
    super(message, 409, "CONFLICT", true, undefined, requestId);
    this.name = "ConflictError";
  }
}

export class DuplicateEmailError extends AppError {
  constructor(email: string, requestId?: string) {
    super(
      `An account with email '${email}' already exists`,
      409,
      "DUPLICATE_EMAIL",
      true,
      undefined,
      requestId
    );
    this.name = "DuplicateEmailError";
  }
}

export class DuplicateSlugError extends AppError {
  constructor(slug: string, requestId?: string) {
    super(
      `An organization with slug '${slug}' already exists`,
      409,
      "DUPLICATE_SLUG",
      true,
      undefined,
      requestId
    );
    this.name = "DuplicateSlugError";
  }
}

export class SocialAccountAlreadyConnectedError extends AppError {
  constructor(platform: string, username: string, requestId?: string) {
    super(
      `Account @${username} on ${platform} is already connected`,
      409,
      "SOCIAL_ACCOUNT_CONNECTED",
      true,
      undefined,
      requestId
    );
    this.name = "SocialAccountAlreadyConnectedError";
  }
}

// ============================================================
// RATE LIMITING
// ============================================================

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    resource: string,
    retryAfter: number = 60,
    requestId?: string
  ) {
    super(
      `Rate limit exceeded for ${resource}. Retry after ${retryAfter} seconds`,
      429,
      "RATE_LIMIT_EXCEEDED",
      true,
      undefined,
      requestId
    );
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// ============================================================
// EXTERNAL SERVICE ERRORS
// ============================================================

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly serviceStatusCode?: number;

  constructor(
    service: string,
    message: string,
    serviceStatusCode?: number,
    requestId?: string
  ) {
    super(
      `${service} error: ${message}`,
      502,
      "EXTERNAL_SERVICE_ERROR",
      true,
      undefined,
      requestId
    );
    this.name = "ExternalServiceError";
    this.service = service;
    this.serviceStatusCode = serviceStatusCode;
  }
}

export class SocialPlatformError extends ExternalServiceError {
  public readonly platform: string;
  public readonly platformErrorCode?: string;

  constructor(
    platform: string,
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super(platform, message, statusCode, requestId);
    this.name = "SocialPlatformError";
    this.platform = platform;
    this.platformErrorCode = errorCode;
  }
}

export class TwitterError extends SocialPlatformError {
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super("Twitter", message, statusCode, errorCode, requestId);
    this.name = "TwitterError";
  }
}

export class LinkedInError extends SocialPlatformError {
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super("LinkedIn", message, statusCode, errorCode, requestId);
    this.name = "LinkedInError";
  }
}

export class InstagramError extends SocialPlatformError {
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super("Instagram", message, statusCode, errorCode, requestId);
    this.name = "InstagramError";
  }
}

export class FacebookError extends SocialPlatformError {
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super("Facebook", message, statusCode, errorCode, requestId);
    this.name = "FacebookError";
  }
}

export class TikTokError extends SocialPlatformError {
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string,
    requestId?: string
  ) {
    super("TikTok", message, statusCode, errorCode, requestId);
    this.name = "TikTokError";
  }
}

export class StripeError extends ExternalServiceError {
  public readonly stripeCode?: string;

  constructor(
    message: string,
    statusCode?: number,
    stripeCode?: string,
    requestId?: string
  ) {
    super("Stripe", message, statusCode, requestId);
    this.name = "StripeError";
    this.stripeCode = stripeCode;
  }
}

// ============================================================
// AI ERRORS
// ============================================================

export class AIGenerationError extends AppError {
  public readonly model?: string;
  public readonly tokensUsed?: number;

  constructor(
    message: string,
    model?: string,
    tokensUsed?: number,
    requestId?: string
  ) {
    super(message, 500, "AI_GENERATION_ERROR", true, undefined, requestId);
    this.name = "AIGenerationError";
    this.model = model;
    this.tokensUsed = tokensUsed;
  }
}

export class AITemplateNotFoundError extends AppError {
  constructor(id: string, requestId?: string) {
    super(
      `AI template with id '${id}' not found`,
      404,
      "AI_TEMPLATE_NOT_FOUND",
      true,
      undefined,
      requestId
    );
    this.name = "AITemplateNotFoundError";
  }
}

// ============================================================
// MEDIA ERRORS
// ============================================================

export class MediaUploadError extends AppError {
  constructor(
    message: string,
    public readonly fileName?: string,
    requestId?: string
  ) {
    super(message, 400, "MEDIA_UPLOAD_ERROR", true, undefined, requestId);
    this.name = "MediaUploadError";
  }
}

export class FileTooLargeError extends MediaUploadError {
  constructor(
    fileName: string,
    maxSize: number,
    requestId?: string
  ) {
    super(
      `File '${fileName}' exceeds maximum size of ${maxSize} bytes`,
      fileName,
      requestId
    );
    this.name = "FileTooLargeError";
  }
}

export class InvalidFileTypeError extends MediaUploadError {
  constructor(
    fileName: string,
    allowedTypes: string[],
    requestId?: string
  ) {
    super(
      `File '${fileName}' has invalid type. Allowed: ${allowedTypes.join(", ")}`,
      fileName,
      requestId
    );
    this.name = "InvalidFileTypeError";
  }
}

// ============================================================
// SUBSCRIPTION ERRORS
// ============================================================

export class SubscriptionError extends AppError {
  constructor(message: string, requestId?: string) {
    super(message, 400, "SUBSCRIPTION_ERROR", true, undefined, requestId);
    this.name = "SubscriptionError";
  }
}

export class PlanLimitExceededError extends SubscriptionError {
  constructor(
    resource: string,
    limit: number,
    requestId?: string
  ) {
    super(
      `Plan limit exceeded: ${resource} limit is ${limit}`,
      requestId
    );
    this.name = "PlanLimitExceededError";
  }
}

export class TrialExpiredError extends SubscriptionError {
  constructor(requestId?: string) {
    super("Your trial has expired. Please upgrade to continue.", requestId);
    this.name = "TrialExpiredError";
  }
}

// ============================================================
// SCHEDULING ERRORS
// ============================================================

export class SchedulingError extends AppError {
  constructor(message: string, requestId?: string) {
    super(message, 400, "SCHEDULING_ERROR", true, undefined, requestId);
    this.name = "SchedulingError";
  }
}

export class ScheduleInPastError extends SchedulingError {
  constructor(requestId?: string) {
    super("Cannot schedule a post in the past", requestId);
    this.name = "ScheduleInPastError";
  }
}

export class ScheduleConflictError extends SchedulingError {
  constructor(
    socialAccountId: string,
    conflictingTime: Date,
    requestId?: string
  ) {
    super(
      `Schedule conflict: another post is scheduled at ${conflictingTime.toISOString()}`,
      requestId
    );
    this.name = "ScheduleConflictError";
  }
}

// ============================================================
// DATABASE ERRORS
// ============================================================

export class DatabaseError extends AppError {
  constructor(
    message: string,
    public readonly query?: string,
    requestId?: string
  ) {
    super(message, 500, "DATABASE_ERROR", false, undefined, requestId);
    this.name = "DatabaseError";
  }
}

export class ConnectionError extends DatabaseError {
  constructor(requestId?: string) {
    super("Database connection failed", undefined, requestId);
    this.name = "ConnectionError";
  }
}

// ============================================================
// FILE SYSTEM ERRORS
// ============================================================

export class FileError extends AppError {
  constructor(
    message: string,
    public readonly filePath?: string,
    requestId?: string
  ) {
    super(message, 500, "FILE_ERROR", true, undefined, requestId);
    this.name = "FileError";
  }
}

export class FileNotFoundError extends FileError {
  constructor(filePath: string, requestId?: string) {
    super(`File not found: ${filePath}`, filePath, requestId);
    this.name = "FileNotFoundError";
  }
}

// ============================================================
// ERROR HANDLER
// ============================================================

export function handleApiError(
  error: unknown,
  requestId?: string
): AppError {
  // If it's already an AppError, return as-is
  if (error instanceof AppError) {
    if (requestId) {
      error.requestId = requestId;
    }
    return error;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return new ValidationError(error, requestId);
  }

  // Handle Prisma errors
  if (
    error instanceof Error &&
    error.name === "PrismaClientKnownRequestError"
  ) {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        const target = prismaError.meta?.target;
        if (target?.includes("email")) {
          return new DuplicateEmailError(
            prismaError.meta?.email ?? "unknown",
            requestId
          );
        }
        if (target?.includes("slug")) {
          return new DuplicateSlugError(
            prismaError.meta?.slug ?? "unknown",
            requestId
            );
        }
        return new ConflictError(
          "A record with this information already exists",
          requestId
        );

      case "P2025":
        return new NotFoundError("Resource", undefined, requestId);

      case "P2003":
        return new ValidationError(
          new ZodError([
            {
              code: "custom",
              message: "Referenced record does not exist",
              path: [],
            },
          ]),
          requestId
        );

      default:
        return new DatabaseError(
          `Database error: ${prismaError.code}`,
          requestId
        );
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === "production") {
      return new AppError(
        "An unexpected error occurred",
        500,
        "INTERNAL_ERROR",
        false,
        undefined,
        requestId
      );
    }

    return new AppError(
      error.message,
      500,
      "INTERNAL_ERROR",
      false,
      undefined,
      requestId
    );
  }

  // Unknown error type
  return new AppError(
    "An unexpected error occurred",
    500,
    "INTERNAL_ERROR",
    false,
    undefined,
    requestId
  );
}

// ============================================================
// ERROR RESPONSE HELPER
// ============================================================

export function createErrorResponse(
  error: AppError,
  statusCode?: number
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    statusCode: number;
    timestamp: string;
    requestId?: string;
  };
} {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: statusCode ?? error.statusCode,
      timestamp: error.timestamp.toISOString(),
      requestId: error.requestId,
    },
  };
}
