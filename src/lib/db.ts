import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ============================================================
// SOFT DELETE MIDDLEWARE
// ============================================================

prisma.$use(async (params, next) => {
  // Before any query, check if model has deletedAt
  const hasDeletedAt = (modelName: string) =>
    ["User", "Organization", "Post", "Campaign", "SocialAccount"].includes(
      modelName
    );

  if (params.action === "delete" && hasDeletedAt(params.model)) {
    params.action = "update";
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === "findMany" && hasDeletedAt(params.model)) {
    if (!params.args.where) {
      params.args.where = {};
    }
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }

  return next(params);
});

// ============================================================
// PAGINATION UTILITIES
// ============================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export function getPaginationArgs(options: PaginationOptions) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
    limit,
  };
}

export async function paginatedQuery<T>(
  model: { findMany: (args: any) => Promise<T[]>; count: (args: any) => Promise<number> },
  options: PaginationOptions,
  where?: any,
  include?: any,
  select?: any
): Promise<PaginatedResult<T>> {
  const { skip, take, page, limit } = getPaginationArgs(options);

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      skip,
      take,
      orderBy: options.orderBy
        ? { [options.orderBy]: options.order ?? "desc" }
        : { createdAt: "desc" },
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

// ============================================================
// BATCH OPERATIONS
// ============================================================

export async function batchCreate<T>(
  model: { createMany: (args: any) => Promise<Prisma.BatchPayload> },
  data: T[],
  batchSize = 100
): Promise<Prisma.BatchPayload> {
  let total = { count: 0 };

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const result = await model.createMany({
      data: batch as any,
      skipDuplicates: true,
    });
    total.count += result.count;
  }

  return total;
}

// ============================================================
// TRANSACTION HELPER
// ============================================================

export async function withTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as unknown as PrismaClient);
  });
}

// ============================================================
// DATABASE HEALTH CHECK
// ============================================================

export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  latency: number;
  timestamp: Date;
}> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: "healthy",
      latency,
      timestamp: new Date(),
    };
  } catch {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      timestamp: new Date(),
    };
  }
}

export default prisma;
