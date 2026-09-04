import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { repurposeContentSchema, validateRequest } from "@/validators";
import { repurposeContent } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, repurposeContentSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content, sourcePlatform, targetPlatforms } = validation.data;

    const results = await repurposeContent(
      content,
      sourcePlatform,
      targetPlatforms
    );

    // Store generated content
    const orgId = body.orgId;
    if (orgId) {
      const membership = await db.membership.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });

      if (membership) {
        await db.aIGeneratedContent.create({
          data: {
            type: "REPURPOSE",
            prompt: `Repurpose from ${sourcePlatform} to ${targetPlatforms.join(", ")}`,
            result: JSON.stringify(results),
            model: "gpt-4o",
            tokens: results.reduce((s, r) => s + r.tokens, 0),
            userId: session.user.id,
            orgId,
          },
        });
      }
    }

    return NextResponse.json({
      repurposed: results.map((r) => ({
        platform: r.platform,
        content: r.content,
        hashtags: r.hashtags,
        adaptedFor: r.adaptedFor,
        charCount: r.content.length,
      })),
      source: {
        platform: sourcePlatform,
        content,
        charCount: content.length,
      },
      totalTokensUsed: results.reduce((s, r) => s + r.tokens, 0),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
