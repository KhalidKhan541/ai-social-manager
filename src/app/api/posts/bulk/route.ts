import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { bulkPostSchema, validateRequest } from "@/validators";
import { enqueueJob } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, bulkPostSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { action, postIds, scheduledAt, accountId } = validation.data;

    // Verify all posts exist and belong to the same org
    const posts = await db.post.findMany({
      where: { id: { in: postIds } },
      include: {
        account: { select: { id: true, platform: true, isActive: true } },
      },
    });

    if (posts.length !== postIds.length) {
      return NextResponse.json(
        { error: "Some posts were not found" },
        { status: 404 }
      );
    }

    const orgIds = [...new Set(posts.map((p) => p.orgId))];
    if (orgIds.length > 1) {
      return NextResponse.json(
        { error: "All posts must belong to the same organization" },
        { status: 400 }
      );
    }

    const orgId = orgIds[0]!;

    // Verify user has access
    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership || ["VIEWER"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    let result;

    switch (action) {
      case "delete": {
        const deletablePosts = posts.filter(
          (p) => !["PUBLISHED", "PUBLISHING"].includes(p.status)
        );

        if (deletablePosts.length === 0) {
          return NextResponse.json(
            { error: "Cannot delete published posts. Archive them instead." },
            { status: 400 }
          );
        }

        const deletedIds = deletablePosts.map((p) => p.id);

        await db.$transaction(async (tx) => {
          await tx.postAnalytics.deleteMany({
            where: { postId: { in: deletedIds } },
          });
          await tx.calendarEvent.deleteMany({
            where: { postId: { in: deletedIds } },
          });
          await tx.post.deleteMany({
            where: { id: { in: deletedIds } },
          });

          await tx.activityLog.create({
            data: {
              action: "POSTS_BULK_DELETED",
              entity: "Post",
              entityId: deletedIds[0],
              details: { postIds: deletedIds, count: deletedIds.length },
              userId: session.user.id,
              orgId,
            },
          });
        });

        result = { deleted: deletedIds.length, skipped: postIds.length - deletedIds.length };
        break;
      }

      case "schedule": {
        if (!scheduledAt) {
          return NextResponse.json(
            { error: "scheduledAt is required for scheduling" },
            { status: 400 }
          );
        }

        const scheduleDate = new Date(scheduledAt);
        if (scheduleDate <= new Date()) {
          return NextResponse.json(
            { error: "Scheduled time must be in the future" },
            { status: 400 }
          );
        }

        const schedulablePosts = posts.filter(
          (p) => ["DRAFT", "SCHEDULED"].includes(p.status)
        );

        await db.$transaction(async (tx) => {
          for (const post of schedulablePosts) {
            await tx.post.update({
              where: { id: post.id },
              data: {
                status: "SCHEDULED",
                scheduledAt: scheduleDate,
                schedulerId: session.user.id,
                ...(accountId && { accountId }),
              },
            });

            await tx.calendarEvent.upsert({
              where: { postId: post.id },
              create: {
                title: `Scheduled: ${post.content.slice(0, 50)}`,
                description: post.content,
                startAt: scheduleDate,
                endAt: scheduleDate,
                userId: session.user.id,
                orgId,
                postId: post.id,
                color: "#3b82f6",
              },
              update: {
                startAt: scheduleDate,
                endAt: scheduleDate,
              },
            });

            await enqueueJob("publish-posts", "publish-post", {
              postId: post.id,
              scheduledAt: scheduleDate.toISOString(),
              accountId: accountId ?? post.accountId,
            });
          }

          await tx.activityLog.create({
            data: {
              action: "POSTS_BULK_SCHEDULED",
              entity: "Post",
              details: {
                postIds: schedulablePosts.map((p) => p.id),
                scheduledAt: scheduleDate.toISOString(),
                count: schedulablePosts.length,
              },
              userId: session.user.id,
              orgId,
            },
          });
        });

        result = {
          scheduled: schedulablePosts.length,
          skipped: postIds.length - schedulablePosts.length,
          scheduledAt: scheduleDate.toISOString(),
        };
        break;
      }

      case "publish": {
        const publishablePosts = posts.filter(
          (p) => p.status !== "PUBLISHING" && p.account?.isActive
        );

        // Queue for publishing
        for (const post of publishablePosts) {
          await enqueueJob("publish-posts", "publish-now", {
            postId: post.id,
            accountId: post.accountId,
            userId: session.user.id,
          });
        }

        await db.activityLog.create({
          data: {
            action: "POSTS_BULK_PUBLISHED",
            entity: "Post",
            details: {
              postIds: publishablePosts.map((p) => p.id),
              count: publishablePosts.length,
            },
            userId: session.user.id,
            orgId,
          },
        });

        result = {
          queued: publishablePosts.length,
          skipped: postIds.length - publishablePosts.length,
        };
        break;
      }

      case "archive": {
        await db.$transaction(async (tx) => {
          await tx.post.updateMany({
            where: { id: { in: postIds } },
            data: { status: "ARCHIVED" },
          });

          await tx.activityLog.create({
            data: {
              action: "POSTS_BULK_ARCHIVED",
              entity: "Post",
              details: { postIds, count: postIds.length },
              userId: session.user.id,
              orgId,
            },
          });
        });

        result = { archived: postIds.length };
        break;
      }

      case "duplicate": {
        const duplicates = await db.$transaction(async (tx) => {
          const newPosts = [];
          for (const post of posts) {
            const newPost = await tx.post.create({
              data: {
                content: `${post.content} (copy)`,
                mediaUrls: post.mediaUrls,
                hashtags: post.hashtags,
                mentions: post.mentions,
                status: "DRAFT",
                authorId: session.user.id,
                orgId: post.orgId,
                accountId: post.accountId,
                campaignId: post.campaignId,
              },
            });
            newPosts.push(newPost);
          }

          await tx.activityLog.create({
            data: {
              action: "POSTS_BULK_DUPLICATED",
              entity: "Post",
              details: {
                originalIds: postIds,
                newIds: newPosts.map((p) => p.id),
                count: newPosts.length,
              },
              userId: session.user.id,
              orgId,
            },
          });

          return newPosts;
        });

        result = {
          duplicated: duplicates.length,
          newPostIds: duplicates.map((p) => p.id),
        };
        break;
      }
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
