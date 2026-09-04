import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";
import { type Platform } from "./post-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceFormat =
  | "blog-post"
  | "tweet-thread"
  | "linkedin-article"
  | "video"
  | "podcast"
  | "long-form"
  | "infographic"
  | "whitepaper"
  | "case-study"
  | "email-newsletter";

export type TargetFormat =
  | "tweet"
  | "tweet-thread"
  | "linkedin-post"
  | "linkedin-article"
  | "instagram-caption"
  | "instagram-carousel"
  | "facebook-post"
  | "tiktok-caption"
  | "threads-post"
  | "youtube-description"
  | "pinterest-pin"
  | "blog-snippet"
  | "email-teaser"
  | "quote-card"
  | "infographic-content"
  | "podcast-show-notes";

export interface RepurposeRequest {
  content: string;
  sourceFormat: SourceFormat;
  targetPlatforms: Platform[];
  targetFormats?: TargetFormat[];
  brandVoice?: string;
  tone?: string;
  maxLength?: number;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  additionalContext?: string;
}

export interface RepurposeResult {
  sourceFormat: SourceFormat;
  outputs: RepurposeOutput[];
  totalTokens: number;
  generationTimeMs: number;
}

export interface RepurposeOutput {
  id: string;
  platform: Platform;
  format: TargetFormat;
  content: string;
  hashtags: string[];
  emojis: string[];
  characterCount: number;
  wordCount: number;
  adaptedFrom: string;
  notes: string;
}

export interface ContentTransformation {
  inputFormat: SourceFormat;
  outputFormat: TargetFormat;
  platform: Platform;
  description: string;
  tips: string[];
}

export interface BatchRepurposeRequest {
  contents: RepurposeRequest[];
  maxConcurrent?: number;
}

export interface BatchRepurposeResult {
  results: RepurposeResult[];
  totalTokens: number;
  totalGenerationTimeMs: number;
}

// ---------------------------------------------------------------------------
// Platform format mappings
// ---------------------------------------------------------------------------

const PLATFORM_FORMAT_MAP: Record<Platform, TargetFormat[]> = {
  twitter: ["tweet", "tweet-thread"],
  linkedin: ["linkedin-post", "linkedin-article"],
  instagram: ["instagram-caption", "instagram-carousel"],
  facebook: ["facebook-post"],
  tiktok: ["tiktok-caption"],
  threads: ["threads-post"],
  pinterest: ["pinterest-pin"],
  youtube: ["youtube-description"],
};

const FORMAT_MAX_LENGTHS: Record<TargetFormat, number> = {
  tweet: 280,
  "tweet-thread": 280,
  "linkedin-post": 3000,
  "linkedin-article": 5000,
  "instagram-caption": 2200,
  "instagram-carousel": 2200,
  "facebook-post": 2000,
  "tiktok-caption": 2200,
  "threads-post": 500,
  "youtube-description": 5000,
  "pinterest-pin": 500,
  "blog-snippet": 1000,
  "email-teaser": 500,
  "quote-card": 280,
  "infographic-content": 1500,
  "podcast-show-notes": 2000,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const RepurposeRequestSchema = z.object({
  content: z.string().min(10).max(50000),
  sourceFormat: z.enum([
    "blog-post", "tweet-thread", "linkedin-article", "video", "podcast",
    "long-form", "infographic", "whitepaper", "case-study", "email-newsletter",
  ]),
  targetPlatforms: z.array(z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads", "pinterest", "youtube"])).min(1),
  targetFormats: z.array(z.enum([
    "tweet", "tweet-thread", "linkedin-post", "linkedin-article", "instagram-caption",
    "instagram-carousel", "facebook-post", "tiktok-caption", "threads-post",
    "youtube-description", "pinterest-pin", "blog-snippet", "email-teaser",
    "quote-card", "infographic-content", "podcast-show-notes",
  ])).optional(),
  brandVoice: z.string().optional(),
  tone: z.string().optional(),
  maxLength: z.number().optional(),
  includeHashtags: z.boolean().default(true),
  includeEmojis: z.boolean().default(true),
  additionalContext: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Format-specific instructions
// ---------------------------------------------------------------------------

const FORMAT_INSTRUCTIONS: Record<TargetFormat, string> = {
  tweet: `Write a single, punchy tweet. Maximum 280 characters. Start with a hook. Make every character count.`,
  "tweet-thread": `Create a Twitter thread (3-7 tweets). Number each tweet (1/, 2/, etc.). Each tweet must be under 280 characters. First tweet hooks, last tweet has CTA.`,
  "linkedin-post": `Write a LinkedIn post. Start with a hook (first 2 lines). Use short paragraphs (1-2 sentences). Include line breaks. Professional but approachable.`,
  "linkedin-article": `Write a LinkedIn article. Use a compelling headline. Include an introduction, body sections, and conclusion. Professional thought-leadership tone.`,
  "instagram-caption": `Write an Instagram caption. Compelling first line (shown in preview). Detailed caption below. Use line breaks. Include CTA.`,
  "instagram-carousel": `Write Instagram carousel slides. Create 5-10 slide titles with brief descriptions. Each slide should be self-contained but flow together.`,
  "facebook-post": `Write a Facebook post. Conversational tone. Ask questions to drive comments. Include CTA (like, share, comment).`,
  "tiktok-caption": `Write a TikTok caption. Short, punchy. Hook in first line. Use trending language. Include CTA.`,
  "threads-post": `Write a Threads post. Maximum 500 characters. Conversational, authentic. Encourage replies.`,
  "youtube-description": `Write a YouTube video description. Front-load important info. Include timestamps suggestion, links, and subscribe CTA. Hashtags at the end.`,
  "pinterest-pin": `Write a Pinterest pin description. Keyword-rich for SEO. Clear value proposition. CTA for clicks.`,
  "blog-snippet": `Write a blog excerpt/snippet. 2-3 paragraphs summarizing key points. Include a hook to read more.`,
  "email-teaser": `Write an email teaser. 2-3 sentences that entice opens. Create curiosity or urgency. Include CTA.`,
  "quote-card": `Create a quote card text. A single impactful quote (under 280 characters). Attribution included.`,
  "infographic-content": `Create infographic content. Break down into 5-8 key points with brief descriptions. Clear, scannable format.`,
  "podcast-show-notes": `Write podcast show notes. Include episode summary, key topics, timestamps, and guest info if applicable.`,
};

// ---------------------------------------------------------------------------
// ContentRepurposer
// ---------------------------------------------------------------------------

export class ContentRepurposer {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async repurpose(request: RepurposeRequest): Promise<RepurposeResult> {
    const validated = RepurposeRequestSchema.parse(request);
    const startTime = Date.now();
    let totalTokens = 0;

    const outputs: RepurposeOutput[] = [];

    for (const platform of validated.targetPlatforms) {
      const formats = validated.targetFormats ?? PLATFORM_FORMAT_MAP[platform] ?? ["tweet"];

      for (const format of formats) {
        const output = await this.transformContent({
          content: validated.content,
          sourceFormat: validated.sourceFormat,
          targetFormat: format,
          platform,
          brandVoice: validated.brandVoice,
          tone: validated.tone,
          maxLength: validated.maxLength ?? FORMAT_MAX_LENGTHS[format],
          includeHashtags: validated.includeHashtags,
          includeEmojis: validated.includeEmojis,
          additionalContext: validated.additionalContext,
        });

        totalTokens += output.tokensUsed;
        outputs.push(output.result);
      }
    }

    return {
      sourceFormat: validated.sourceFormat,
      outputs,
      totalTokens,
      generationTimeMs: Date.now() - startTime,
    };
  }

  async blogToSocialPosts(
    blogContent: string,
    platforms: Platform[],
    brandVoice?: string
  ): Promise<RepurposeResult> {
    return this.repurpose({
      content: blogContent,
      sourceFormat: "blog-post",
      targetPlatforms: platforms,
      brandVoice,
      includeHashtags: true,
      includeEmojis: true,
    });
  }

  async threadToArticle(
    threadContent: string,
    brandVoice?: string
  ): Promise<RepurposeResult> {
    return this.repurpose({
      content: threadContent,
      sourceFormat: "tweet-thread",
      targetPlatforms: ["linkedin"],
      targetFormats: ["linkedin-article"],
      brandVoice,
    });
  }

  async videoToCaptions(
    videoDescription: string,
    platforms: Platform[],
    brandVoice?: string
  ): Promise<RepurposeResult> {
    return this.repurpose({
      content: videoDescription,
      sourceFormat: "video",
      targetPlatforms: platforms,
      brandVoice,
      includeHashtags: true,
    });
  }

  async podcastToSocial(
    podcastContent: string,
    platforms: Platform[],
    brandVoice?: string
  ): Promise<RepurposeResult> {
    return this.repurpose({
      content: podcastContent,
      sourceFormat: "podcast",
      targetPlatforms: platforms,
      brandVoice,
      includeHashtags: true,
    });
  }

  async longFormToShortForm(
    longContent: string,
    platforms: Platform[],
    brandVoice?: string
  ): Promise<RepurposeResult> {
    return this.repurpose({
      content: longContent,
      sourceFormat: "long-form",
      targetPlatforms: platforms,
      brandVoice,
      includeHashtags: true,
      includeEmojis: true,
    });
  }

  async batchRepurpose(request: BatchRepurposeRequest): Promise<BatchRepurposeResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    const results: RepurposeResult[] = [];

    for (const req of request.contents.slice(0, 20)) {
      const result = await this.repurpose(req);
      totalTokens += result.totalTokens;
      results.push(result);
    }

    return {
      results,
      totalTokens,
      totalGenerationTimeMs: Date.now() - startTime,
    };
  }

  async getTransformationGuide(
    sourceFormat: SourceFormat,
    targetFormat: TargetFormat
  ): Promise<ContentTransformation> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a content strategy expert. Provide a transformation guide for converting content from ${sourceFormat} to ${targetFormat}.

Return JSON with:
- description: brief description of the transformation approach
- tips: array of 3-5 practical tips

Output as JSON.`,
        },
        {
          role: "user",
          content: `How do I transform ${sourceFormat} content into ${targetFormat} format?`,
        },
      ],
      { temperature: 0.5, maxTokens: 1000 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          inputFormat: sourceFormat,
          outputFormat: targetFormat,
          platform: this.guessPlatformFromFormat(targetFormat),
          description: String(parsed.description ?? ""),
          tips: Array.isArray(parsed.tips) ? parsed.tips.map(String) : [],
        };
      }
    } catch {
      // fallback
    }

    return {
      inputFormat: sourceFormat,
      outputFormat: targetFormat,
      platform: this.guessPlatformFromFormat(targetFormat),
      description: `Transform ${sourceFormat} content into ${targetFormat} format.`,
      tips: [
        "Keep the core message intact",
        "Adapt tone for the target platform",
        "Optimize length for the format",
      ],
    };
  }

  async extractKeyPoints(content: string, count: number = 5): Promise<string[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Extract the ${count} most important key points from this content. Return as a JSON array of strings. Each point should be concise and self-contained.`,
        },
        { role: "user", content: content.slice(0, 5000) },
      ],
      { temperature: 0.3, maxTokens: 1000 }
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as string[];
      }
    } catch {
      // fallback
    }

    return result.content
      .split("\n")
      .filter((line) => line.trim().length > 10)
      .slice(0, count)
      .map((line) => line.replace(/^[-*\d.]+\s*/, "").trim());
  }

  async generateHooks(
    content: string,
    platform: Platform,
    count: number = 5
  ): Promise<string[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Generate ${count} compelling hooks/opening lines for a ${platform} post based on this content.

Hooks should be:
- Platform-appropriate (tweet hooks vs LinkedIn hooks)
- Attention-grabbing
- Concise
- Different from each other

Return as JSON array of strings.`,
        },
        { role: "user", content: content.slice(0, 3000) },
      ],
      { temperature: 0.8, maxTokens: 1000 }
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as string[];
      }
    } catch {
      // fallback
    }

    return result.content
      .split("\n")
      .filter((line) => line.trim().length > 5)
      .slice(0, count)
      .map((line) => line.replace(/^[-*\d."]+\s*/, "").trim());
  }

  private async transformContent(params: {
    content: string;
    sourceFormat: SourceFormat;
    targetFormat: TargetFormat;
    platform: Platform;
    brandVoice?: string;
    tone?: string;
    maxLength: number;
    includeHashtags: boolean;
    includeEmojis: boolean;
    additionalContext?: string;
  }): Promise<{ result: RepurposeOutput; tokensUsed: number }> {
    const instruction = FORMAT_INSTRUCTIONS[params.targetFormat];

    const systemPrompt = `You are an expert content repurposer. Transform content from ${params.sourceFormat} to ${params.targetFormat}.

FORMAT INSTRUCTIONS:
${instruction}

PLATFORM: ${params.platform}
MAX LENGTH: ${params.maxLength} characters
${params.brandVoice ? `BRAND VOICE: ${params.brandVoice}` : ""}
${params.tone ? `TONE: ${params.tone}` : ""}
${params.includeHashtags ? "Include relevant hashtags at the end" : "Do NOT include hashtags"}
${params.includeEmojis ? "Use emojis naturally" : "Do NOT use emojis"}
${params.additionalContext ? `ADDITIONAL CONTEXT: ${params.additionalContext}` : ""}

RULES:
- Maintain the core message and value
- Adapt tone and style for the platform
- Make it native to the target format
- Remove source-format-specific elements (e.g., thread numbers for single posts)
- Keep within ${params.maxLength} characters

Output ONLY the repurposed content. No quotes, no wrappers, no explanations.`;

    const result = await this.client.complete(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Transform this ${params.sourceFormat} content into a ${params.targetFormat}:\n\n${params.content.slice(0, 8000)}`,
        },
      ],
      { temperature: 0.7, maxTokens: Math.min(params.maxLength * 2, 4096) }
    );

    let content = result.content.trim();
    content = content.replace(/^["']|["']$/g, "");

    if (content.length > params.maxLength) {
      const truncated = content.slice(0, params.maxLength - 3);
      const lastSpace = truncated.lastIndexOf(" ");
      content = (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
    }

    const hashtags = params.includeHashtags
      ? (content.match(/#[\w\u0400-\u04FF]+/g) ?? []).map((h) => h.toLowerCase())
      : [];
    const emojis = params.includeEmojis
      ? (content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) ?? [])
      : [];

    return {
      result: {
        id: `repurpose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform: params.platform,
        format: params.targetFormat,
        content,
        hashtags,
        emojis,
        characterCount: content.length,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        adaptedFrom: params.sourceFormat,
        notes: `Adapted from ${params.sourceFormat} to ${params.targetFormat} for ${params.platform}`,
      },
      tokensUsed: result.usage.totalTokens,
    };
  }

  private guessPlatformFromFormat(format: TargetFormat): Platform {
    if (format.includes("tweet")) return "twitter";
    if (format.includes("linkedin")) return "linkedin";
    if (format.includes("instagram")) return "instagram";
    if (format.includes("facebook")) return "facebook";
    if (format.includes("tiktok")) return "tiktok";
    if (format.includes("threads")) return "threads";
    if (format.includes("pinterest")) return "pinterest";
    if (format.includes("youtube")) return "youtube";
    return "twitter";
  }
}

export const contentRepurposer = new ContentRepurposer();
