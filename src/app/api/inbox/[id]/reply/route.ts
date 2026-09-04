import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { replyToInboxSchema, validateRequest } from "@/validators";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const parentItem = await db.inboxItem.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!parentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: parentItem.orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!parentItem.account.isActive) {
      return NextResponse.json(
        { error: "Social account is disconnected. Reconnect to reply." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(body, replyToInboxSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content } = validation.data;

    // Create reply in database
    const reply = await db.$transaction(async (tx) => {
      const newReply = await tx.inboxItem.create({
        data: {
          type: parentItem.type,
          platformItemId: `reply_${Date.now()}`,
          content,
          authorName: session.user.name ?? "User",
          authorAvatar: session.user.image,
          authorUsername: session.user.email,
          status: "REPLIED",
          sentiment: null,
          isReplied: true,
          orgId: parentItem.orgId,
          accountId: parentItem.accountId,
          parentId: id,
        },
      });

      // Mark parent as replied
      await tx.inboxItem.update({
        where: { id },
        data: { isReplied: true, status: "REPLIED" },
      });

      await tx.activityLog.create({
        data: {
          action: "INBOX_REPLIED",
          entity: "InboxItem",
          entityId: id,
          details: {
            replyId: newReply.id,
            platform: parentItem.account.platform,
            content: content.slice(0, 100),
          },
          userId: session.user.id,
          orgId: parentItem.orgId,
        },
      });

      return newReply;
    });

    // TODO: Actually send reply via platform API
    // This would use the platform-specific integration to post the reply
    // For now, we store it locally and mark as sent

    return NextResponse.json(
      {
        message: "Reply sent",
        reply: {
          id: reply.id,
          content: reply.content,
          authorName: reply.authorName,
          createdAt: reply.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
