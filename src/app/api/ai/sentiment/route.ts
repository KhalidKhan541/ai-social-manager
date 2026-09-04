import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { sentimentAnalysisSchema, validateRequest } from "@/validators";
import { analyzeSentiment } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validateRequest(body, sentimentAnalysisSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { text } = validation.data;

    const result = await analyzeSentiment(text);

    return NextResponse.json({
      sentiment: result,
      textLength: text.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST_BATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { texts } = body as { texts?: string[] };

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 }
      );
    }

    if (texts.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 texts per batch" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      texts.map(async (text) => {
        try {
          const sentiment = await analyzeSentiment(text);
          return { text: text.slice(0, 100), sentiment };
        } catch {
          return {
            text: text.slice(0, 100),
            sentiment: {
              sentiment: "neutral" as const,
              score: 0,
              confidence: 0,
              emotions: {},
              keywords: [],
              summary: "Analysis failed",
            },
          };
        }
      })
    );

    // Summary statistics
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of results) {
      sentimentCounts[r.sentiment.sentiment]++;
    }

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        sentimentDistribution: sentimentCounts,
        averageScore:
          results.reduce((s, r) => s + r.sentiment.score, 0) / results.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
