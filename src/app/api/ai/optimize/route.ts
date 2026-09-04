import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { optimizePostSchema, validateRequest } from "@/validators";
import { optimizePost } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, optimizePostSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content, platform, goal } = validation.data;

    const result = await optimizePost(content, platform, goal);

    // Store generated content
    const orgId = body.orgId;
    if (orgId) {
      const membership = await db.membership.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });

      if (membership) {
        await db.aIGeneratedContent.create({
          data: {
            type: "OPTIMIZE",
            prompt: `Optimize post for ${goal} on ${platform}`,
            result: JSON.stringify({
              original: content,
              optimized: result.optimizedContent,
              suggestions: result.suggestions,
              score: result.score,
            }),
            model: "gpt-4o",
            tokens: result.tokens,
            userId: session.user.id,
            orgId,
          },
        });
      }
    }

    return NextResponse.json({
      optimization: {
        originalContent: result.originalContent,
        optimizedContent: result.optimizedContent,
        suggestions: result.suggestions,
        score: result.score,
        improvements: result.improvements,
        charCountBefore: content.length,
        charCountAfter: result.optimizedContent.length,
      },
      tokensUsed: result.tokens,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
