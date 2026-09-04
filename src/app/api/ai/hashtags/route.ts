import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { generateHashtagsSchema, validateRequest } from "@/validators";
import { generateHashtags } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, generateHashtagsSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { topic, platform, count } = validation.data;

    const hashtags = await generateHashtags(topic, platform, count);

    // Store generated content
    const orgId = body.orgId;
    if (orgId) {
      const membership = await db.membership.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });

      if (membership) {
        await db.aIGeneratedContent.create({
          data: {
            type: "HASHTAGS",
            prompt: `Generate ${count} hashtags for ${platform}: ${topic}`,
            result: JSON.stringify(hashtags),
            model: "gpt-4o",
            userId: session.user.id,
            orgId,
          },
        });
      }
    }

    return NextResponse.json({
      hashtags,
      topic,
      platform,
      count: hashtags.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
