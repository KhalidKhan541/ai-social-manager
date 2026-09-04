import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const media = await db.media.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: media.orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ media });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingMedia = await db.media.findUnique({ where: { id } });
    if (!existingMedia) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingMedia.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { alt, filename } = body as { alt?: string; filename?: string };

    const media = await db.media.update({
      where: { id },
      data: {
        ...(alt !== undefined && { alt }),
        ...(filename !== undefined && { filename }),
      },
    });

    return NextResponse.json({ media });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existingMedia = await db.media.findUnique({ where: { id } });
    if (!existingMedia) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: existingMedia.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check if media is used in any posts
    const postsUsingMedia = await db.post.findFirst({
      where: {
        orgId: existingMedia.orgId,
        mediaUrls: { has: existingMedia.url },
      },
      select: { id: true },
    });

    if (postsUsingMedia) {
      return NextResponse.json(
        { error: "Cannot delete media that is used in a post. Remove it from the post first." },
        { status: 400 }
      );
    }

    await db.media.delete({ where: { id } });

    // TODO: Delete from storage provider (S3, Cloudflare R2, etc.)

    return NextResponse.json({ message: "Media deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
