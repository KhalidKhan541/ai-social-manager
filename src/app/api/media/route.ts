import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const { page, limit } = parsePagination(searchParams);
    const type = searchParams.get("type");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      orgId,
      ...(type && { type: type as "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" }),
    };

    const [media, total] = await Promise.all([
      db.media.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.media.count({ where }),
    ]);

    // Get storage stats
    const storageStats = await db.media.aggregate({
      where: { orgId },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    return NextResponse.json({
      media,
      storage: {
        totalFiles: storageStats._count.id,
        totalSizeBytes: storageStats._sum.fileSize ?? 0,
        totalSizeMB: Math.round(((storageStats._sum.fileSize ?? 0) / (1024 * 1024)) * 100) / 100,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orgId, files } = body as {
      orgId?: string;
      files?: {
        url: string;
        type: string;
        filename: string;
        fileSize: number;
        mimeType: string;
        width?: number;
        height?: number;
        alt?: string;
      }[];
    };

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check storage limits based on plan
    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: { subscriptions: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    const plan = org?.subscriptions[0]?.plan ?? "FREE";
    const storageLimitMB =
      plan === "FREE" ? 100 : plan === "STARTER" ? 1000 : plan === "PRO" ? 5000 : -1;

    if (storageLimitMB > 0) {
      const currentStorage = await db.media.aggregate({
        where: { orgId },
        _sum: { fileSize: true },
      });

      const currentMB = (currentStorage._sum.fileSize ?? 0) / (1024 * 1024);
      const newFilesMB = files.reduce((s, f) => s + f.fileSize, 0) / (1024 * 1024);

      if (currentMB + newFilesMB > storageLimitMB) {
        return NextResponse.json(
          {
            error: `Storage limit exceeded. Current: ${Math.round(currentMB)}MB / ${storageLimitMB}MB. Upgrade your plan for more storage.`,
          },
          { status: 400 }
        );
      }
    }

    // Max file size: 50MB for images, 500MB for videos
    const oversized = files.find((f) => {
      if (f.type === "VIDEO") return f.fileSize > 500 * 1024 * 1024;
      return f.fileSize > 50 * 1024 * 1024;
    });

    if (oversized) {
      return NextResponse.json(
        { error: `File "${oversized.filename}" exceeds the maximum size limit` },
        { status: 400 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      const mediaItems = [];
      for (const file of files) {
        const item = await tx.media.create({
          data: {
            url: file.url,
            type: file.type as "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT",
            filename: file.filename,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            width: file.width,
            height: file.height,
            alt: file.alt,
            userId: session.user.id,
            orgId,
          },
        });
        mediaItems.push(item);
      }

      await tx.activityLog.create({
        data: {
          action: "MEDIA_UPLOADED",
          entity: "Media",
          entityId: mediaItems[0]?.id ?? "",
          details: { count: mediaItems.length, filenames: files.map((f) => f.filename) },
          userId: session.user.id,
          orgId,
        },
      });

      return mediaItems;
    });

    return NextResponse.json(
      { message: `${created.length} file(s) uploaded`, media: created },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
