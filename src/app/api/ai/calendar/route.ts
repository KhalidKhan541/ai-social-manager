import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { calendarSuggestionsSchema, validateRequest } from "@/validators";
import { generateCalendarSuggestions } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, calendarSuggestionsSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { platforms, startDate, endDate, topics } = validation.data;

    // Validate org access
    const orgId = body.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get existing posts for context
    const existingPosts = await db.post.findMany({
      where: {
        orgId,
        status: "PUBLISHED",
        publishedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { content: true, hashtags: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 10,
    });

    const existingTopics = existingPosts.map((p) => p.content.slice(0, 100));

    const suggestions = await generateCalendarSuggestions(
      orgId,
      platforms,
      startDate,
      endDate,
      topics.length > 0 ? topics : existingTopics
    );

    // Store generated content
    await db.aIGeneratedContent.create({
      data: {
        type: "CALENDAR",
        prompt: `Generate calendar from ${startDate} to ${endDate} for ${platforms.join(", ")}`,
        result: JSON.stringify(suggestions),
        model: "gpt-4o",
        userId: session.user.id,
        orgId,
      },
    });

    return NextResponse.json({
      suggestions,
      period: { startDate, endDate },
      platforms,
      totalSuggestions: suggestions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
