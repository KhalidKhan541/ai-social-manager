import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import type { OrgRole } from "@prisma/client";

// ─── Session & Auth ─────────────────────────────────────────────────────────────

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new ApiError(401, "Authentication required");
  }
  return session as AuthSession;
}

export async function optionalAuth(): Promise<AuthSession | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

// ─── Organization Access ────────────────────────────────────────────────────────

export interface OrgMembership {
  orgId: string;
  role: OrgRole;
  userId: string;
}

export async function requireOrgAccess(
  userId: string,
  orgId: string
): Promise<OrgMembership> {
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });

  if (!membership) {
    throw new ApiError(403, "You do not have access to this organization");
  }

  return {
    orgId: membership.orgId,
    role: membership.role,
    userId: membership.userId,
  };
}

export async function requireOrgRole(
  userId: string,
  orgId: string,
  roles: OrgRole[]
): Promise<OrgMembership> {
  const membership = await requireOrgAccess(userId, orgId);

  if (!roles.includes(membership.role)) {
    throw new ApiError(403, `Required role: ${roles.join(" or ")}`);
  }

  return membership;
}

// ─── Error Handling ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    if (error.message.includes("not found") || error.message.includes("Not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes("validation") || error.message.includes("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message.includes("conflict") || error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────────

export async function applyRateLimit(
  identifier: string,
  limit: number = 60
): Promise<NextResponse | null> {
  const { allowed, remaining, resetAt } = await rateLimit(identifier, limit);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}

// ─── Pagination ─────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
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

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  return { page, limit };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────────

import { type ZodSchema } from "zod";

export function validateRequest<T>(
  data: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  return { success: false, error: errors.join("; ") };
}

// ─── Response Helpers ───────────────────────────────────────────────────────────

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function notFoundResponse(message: string = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

// ─── Search & Filter Helpers ────────────────────────────────────────────────────

export function buildSearchFilter(
  search: string | null,
  fields: string[]
): Record<string, unknown> | undefined {
  if (!search) return undefined;

  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    })),
  };
}

export function buildDateFilter(
  startDate?: string | null,
  endDate?: string | null
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) return undefined;

  const filter: Record<string, unknown> = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildSortOrder(
  sortBy: string,
  sortOrder: "asc" | "desc"
): Record<string, "asc" | "desc"> {
  const allowedFields = new Set([
    "createdAt",
    "updatedAt",
    "name",
    "email",
    "scheduledAt",
    "publishedAt",
    "followers",
    "engagement",
    "impressions",
  ]);

  const field = allowedFields.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}

// ─── Org Slug Resolution ────────────────────────────────────────────────────────

export async function resolveOrgId(slugOrId: string): Promise<string> {
  const org = await db.organization.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    select: { id: true },
  });

  if (!org) throw new ApiError(404, "Organization not found");
  return org.id;
}
