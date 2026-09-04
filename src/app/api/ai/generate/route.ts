import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { generatePostSchema, validateRequest } from "@/validators";
import { generatePost } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, generatePostSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { topic, platform, tone, brandVoice, includeEmojis, maxLength, targetAudience } = validation.data;

    const result = await generatePost({
      topic,
      platform,
      tone,
      brandVoice,
      includeEmojis,
      maxLength,
      targetAudience,
    });

    // Store generated content
    const orgId = body.orgId;
    if (orgId) {
      const membership = await db.membership.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });

      if (membership) {
        await db.aIGeneratedContent.create({
          data: {
            type: "POST",
            prompt: `Generate ${platform} post about: ${topic}`,
            result: result.content,
            model: "gpt-4o",
            tokens: result.tokens,
            userId: session.user.id,
            orgId,
          },
        });
      }
    }

    return NextResponse.json({
      generated: {
        content: result.content,
        hashtags: result.hashtags,
        platform: result.platform,
        estimatedEngagement: result.estimatedEngagement,
        charCount: result.content.length,
      },
      tokensUsed: result.tokens,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
