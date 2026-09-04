import { z } from "zod";
import { type AIClient, type ChatMessage, type CompletionResult, getAIClient } from "./provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Platform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "threads"
  | "pinterest"
  | "youtube";

export type Tone =
  | "professional"
  | "casual"
  | "humorous"
  | "inspirational"
  | "educational"
  | "promotional"
  | "empathetic"
  | "authoritative";

export interface PostGenerationRequest {
  topic: string;
  platform: Platform;
  tone?: Tone;
  brandVoice?: BrandVoice;
  keywords?: string[];
  includeEmojis?: boolean;
  includeHashtags?: boolean;
  maxLength?: number;
  callToAction?: string;
  targetAudience?: string;
  additionalContext?: string;
}

export interface BrandVoice {
  name?: string;
  description: string;
  tone: string[];
  vocabulary: string[];
  avoidWords: string[];
  examples: string[];
  personality: string;
}

export interface GeneratedPost {
  content: string;
  platform: Platform;
  tone: Tone;
  hashtags: string[];
  emojis: string[];
  characterCount: number;
  wordCount: number;
  readabilityScore: number;
  engagementScore: number;
  metadata: PostMetadata;
}

export interface PostMetadata {
  generatedAt: string;
  model: string;
  provider: string;
  tokensUsed: number;
  generationTimeMs: number;
}

export interface ABVariant {
  id: string;
  label: string;
  post: GeneratedPost;
  hypothesis: string;
}

export interface GenerateVariationsRequest extends PostGenerationRequest {
  count: number;
  variationStrategy?: "tone" | "angle" | "length" | "hook" | "mixed";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PostRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads", "pinterest", "youtube"]),
  tone: z.enum(["professional", "casual", "humorous", "inspirational", "educational", "promotional", "empathetic", "authoritative"]).default("professional"),
  brandVoice: z
    .object({
      name: z.string().optional(),
      description: z.string(),
      tone: z.array(z.string()),
      vocabulary: z.array(z.string()),
      avoidWords: z.array(z.string()),
      examples: z.array(z.string()),
      personality: z.string(),
    })
    .optional(),
  keywords: z.array(z.string()).optional(),
  includeEmojis: z.boolean().default(true),
  includeHashtags: z.boolean().default(true),
  maxLength: z.number().optional(),
  callToAction: z.string().optional(),
  targetAudience: z.string().optional(),
  additionalContext: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Platform constraints
// ---------------------------------------------------------------------------

const PLATFORM_CONSTRAINTS: Record<Platform, { maxChars: number; maxHashtags: number; supportsThreads: boolean; supportsLongForm: boolean; name: string }> = {
  twitter: { maxChars: 280, maxHashtags: 5, supportsThreads: true, supportsLongForm: false, name: "Twitter/X" },
  linkedin: { maxChars: 3000, maxHashtags: 5, supportsThreads: false, supportsLongForm: true, name: "LinkedIn" },
  instagram: { maxChars: 2200, maxHashtags: 30, supportsThreads: false, supportsLongForm: false, name: "Instagram" },
  facebook: { maxChars: 63206, maxHashtags: 3, supportsThreads: false, supportsLongForm: true, name: "Facebook" },
  tiktok: { maxChars: 2200, maxHashtags: 10, supportsThreads: false, supportsLongForm: false, name: "TikTok" },
  threads: { maxChars: 500, maxHashtags: 5, supportsThreads: false, supportsLongForm: false, name: "Threads" },
  pinterest: { maxChars: 500, maxHashtags: 0, supportsThreads: false, supportsLongForm: false, name: "Pinterest" },
  youtube: { maxChars: 5000, maxHashtags: 15, supportsThreads: false, supportsLongForm: true, name: "YouTube" },
};

// ---------------------------------------------------------------------------
// Platform-specific prompt builders
// ---------------------------------------------------------------------------

function buildPlatformPrompt(platform: Platform): string {
  const constraints = PLATFORM_CONSTRAINTS[platform];

  const base: Record<Platform, string> = {
    twitter: `Write a ${constraints.name} post. Rules:
- Maximum ${constraints.maxChars} characters per tweet
- Create a thread (numbered tweets with 1/, 2/, 3/ etc.) if the content is long
- Use punchy, concise language
- Start with a compelling hook
- Use line breaks for readability
- End with a clear CTA or question`,
    linkedin: `Write a ${constraints.name} post. Rules:
- Professional, thought-leadership tone
- Start with a hook that stops the scroll (first 2 lines visible before "see more")
- Use short paragraphs (1-2 sentences each)
- Include line breaks between paragraphs
- Share insights, experiences, or actionable advice
- End with a discussion question or CTA`,
    instagram: `Write an ${constraints.name} caption. Rules:
- Compelling first line (shown in feed preview)
- Detailed caption below the fold
- Use line breaks for readability
- Mix of emojis and text
- Include a clear CTA (save, share, comment)
- Relevant hashtags at the end`,
    facebook: `Write a ${constraints.name} post. Rules:
- Conversational and engaging tone
- Ask questions to drive comments
- Use emojis naturally (not excessively)
- Keep paragraphs short
- Include a clear CTA (like, share, comment, click)`,
    tiktok: `Write a ${constraints.name} caption. Rules:
- Short, punchy text
- Hook viewers in the first 2 seconds (text overlay suggestion)
- Use trending phrases and language
- Include a CTA (follow, like, comment, duet)
- Reference the visual/video content`,
    threads: `Write a ${constraints.name} post. Rules:
- Maximum ${constraints.maxChars} characters
- Conversational, authentic tone
- Short and punchy
- Can be part of a thread (use "1/" etc.)
- Encourage replies and discussion`,
    pinterest: `Write a ${constraints.name} pin description. Rules:
- Keyword-rich description for SEO
- Clear value proposition
- Call-to-action for clicks
- Descriptive, not conversational`,
    youtube: `Write a ${constraints.name} video description. Rules:
- Front-load important info and keywords
- Include timestamps suggestion
- Link placeholders
- Subscribe CTA
- Hashtags for discovery`,
  };

  return base[platform];
}

function buildToneInstructions(tone: Tone): string {
  const tones: Record<Tone, string> = {
    professional: "Use formal, polished language. Be authoritative yet approachable. Avoid slang and colloquialisms.",
    casual: "Use relaxed, friendly language. Write like you're talking to a friend. Contractions are encouraged.",
    humorous: "Be witty and funny. Use clever wordplay, puns, or observational humor. Keep it tasteful.",
    inspirational: "Motivate and uplift the reader. Use powerful, evocative language. Share hope and possibility.",
    educational: "Be informative and clear. Break down complex topics. Use examples and analogies.",
    promotional: "Highlight benefits and value. Create urgency. Use persuasive language without being pushy.",
    empathetic: "Show understanding and compassion. Validate feelings. Be warm and supportive.",
    authoritative: "Speak with expertise and confidence. Use data and facts. Be definitive and clear.",
  };
  return tones[tone];
}

function buildBrandVoiceSection(brandVoice: BrandVoice | undefined): string {
  if (!brandVoice) return "";

  return `
BRAND VOICE:
- Name: ${brandVoice.name ?? "Not specified"}
- Description: ${brandVoice.description}
- Personality: ${brandVoice.personality}
- Tone characteristics: ${brandVoice.tone.join(", ")}
- Preferred vocabulary: ${brandVoice.vocabulary.join(", ")}
- Words to avoid: ${brandVoice.avoidWords.join(", ")}
- Example posts:
${brandVoice.examples.map((e) => `  "${e}"`).join("\n")}
`;
}

// ---------------------------------------------------------------------------
// Content cleaning and scoring
// ---------------------------------------------------------------------------

function countCharacters(text: string): number {
  return text.length;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractEmojis(text: string): string[] {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return text.match(emojiRegex) ?? [];
}

function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const complexWords = words.filter((w) => w.length > 6).length / Math.max(words.length, 1);

  const score = 100 - avgWordsPerSentence * 2 - complexWords * 30;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function estimateEngagementScore(post: GeneratedPost): number {
  let score = 50;

  if (post.emojis.length > 0 && post.emojis.length <= 5) score += 10;
  if (post.hashtags.length > 0) score += 5;
  if (post.wordCount >= 20 && post.wordCount <= 150) score += 10;
  if (post.content.includes("?")) score += 5;
  if (post.readabilityScore > 70) score += 10;
  if (post.characterCount < 200) score += 5;

  return Math.min(100, score);
}

function truncateToLimit(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

// ---------------------------------------------------------------------------
// PostGenerator
// ---------------------------------------------------------------------------

export class PostGenerator {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generate(request: PostGenerationRequest): Promise<GeneratedPost> {
    const validated = PostRequestSchema.parse(request);
    const startTime = Date.now();
    const constraints = PLATFORM_CONSTRAINTS[validated.platform];

    const maxLength = validated.maxLength ?? constraints.maxChars;

    const systemPrompt = `You are an expert social media content writer. You create engaging, platform-optimized social media posts that drive engagement and build community.

${buildPlatformPrompt(validated.platform)}

${buildToneInstructions(validated.tone)}

${buildBrandVoiceSection(validated.brandVoice)}

GUIDELINES:
- Write ONLY the post content, no quotes or wrappers
- Optimize for the specific platform
- Make the content engaging and shareable
- Use natural language, not robotic marketing speak
- Maximum ${maxLength} characters
${validated.includeEmojis ? "- Incorporate relevant emojis naturally throughout the post" : "- Do NOT use any emojis"}
${validated.includeHashtags ? "- Include relevant hashtags at the end of the post" : "- Do NOT include hashtags"}
${validated.targetAudience ? `- Target audience: ${validated.targetAudience}` : ""}
${validated.keywords?.length ? `- Must include these keywords naturally: ${validated.keywords.join(", ")}` : ""}
${validated.callToAction ? `- End with this CTA: ${validated.callToAction}` : ""}
${validated.additionalContext ? `Additional context: ${validated.additionalContext}` : ""}`;

    const userPrompt = `Write a ${constraints.name} post about: ${validated.topic}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await this.client.complete(messages, {
      temperature: 0.8,
      maxTokens: Math.min(maxLength * 3, 4096),
    });

    const content = this.cleanContent(result.content, validated);
    const truncated = truncateToLimit(content, maxLength);

    const post: GeneratedPost = {
      content: truncated,
      platform: validated.platform,
      tone: validated.tone,
      hashtags: this.extractHashtags(truncated),
      emojis: extractEmojis(truncated),
      characterCount: countCharacters(truncated),
      wordCount: countWords(truncated),
      readabilityScore: calculateReadabilityScore(truncated),
      engagementScore: 0,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: result.model,
        provider: result.provider,
        tokensUsed: result.usage.totalTokens,
        generationTimeMs: Date.now() - startTime,
      },
    };

    post.engagementScore = estimateEngagementScore(post);
    return post;
  }

  async generateThread(
    topic: string,
    brandVoice?: BrandVoice,
    tweetCount?: number
  ): Promise<GeneratedPost[]> {
    const targetTweets = tweetCount ?? 5;
    const startTime = Date.now();

    const systemPrompt = `You are an expert Twitter/X thread writer. Create a compelling thread about the given topic.

RULES:
- Create exactly ${targetTweets} tweets
- Number each tweet: "1/", "2/", etc.
- Each tweet must be under 280 characters
- First tweet must be a strong hook
- Last tweet must have a CTA (follow, retweet, bookmark)
- Each tweet should standalone but connect to the thread
- Use line breaks within tweets for readability
${brandVoice ? buildBrandVoiceSection(brandVoice) : ""}

Format: Output each tweet separated by a blank line. Start each tweet with its number (1/, 2/, etc.)`;

    const result = await this.client.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a thread about: ${topic}` },
      ],
      { temperature: 0.8, maxTokens: 4096 }
    );

    const tweets = this.parseThread(result.content);
    const posts: GeneratedPost[] = [];

    for (const tweet of tweets) {
      const post: GeneratedPost = {
        content: tweet,
        platform: "twitter",
        tone: "professional",
        hashtags: this.extractHashtags(tweet),
        emojis: extractEmojis(tweet),
        characterCount: countCharacters(tweet),
        wordCount: countWords(tweet),
        readabilityScore: calculateReadabilityScore(tweet),
        engagementScore: estimateEngagementScore({
          content: tweet,
          platform: "twitter",
          tone: "professional",
          hashtags: [],
          emojis: [],
          characterCount: 0,
          wordCount: 0,
          readabilityScore: 0,
          engagementScore: 0,
          metadata: { generatedAt: "", model: "", provider: "", tokensUsed: 0, generationTimeMs: 0 },
        }),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: result.model,
          provider: result.provider,
          tokensUsed: Math.round(result.usage.totalTokens / tweets.length),
          generationTimeMs: Math.round((Date.now() - startTime) / tweets.length),
        },
      };
      posts.push(post);
    }

    return posts;
  }

  async generateVariations(
    request: GenerateVariationsRequest
  ): Promise<GeneratedPost[]> {
    const variations: GeneratedPost[] = [];
    const count = Math.min(request.count, 10);

    const strategies: Record<string, string[]> = {
      tone: ["professional", "casual", "humorous", "inspirational", "educational", "promotional"],
      angle: [
        "approach from a personal experience angle",
        "approach from a data/statistics angle",
        "approach from a contrarian/contrasting angle",
        "approach from a storytelling angle",
        "approach from a how-to/tutorial angle",
        "approach from a question-based angle",
      ],
      length: [
        "Write a very short, punchy version (under 100 chars)",
        "Write a medium-length version (200-300 chars)",
        "Write a detailed version (400-600 chars)",
        "Write a long-form version (800-1000 chars)",
        "Write an ultra-short version (under 50 chars)",
        "Write a comprehensive version (1000+ chars)",
      ],
      hook: [
        "Start with a surprising statistic or fact",
        "Start with a provocative question",
        "Start with a bold claim or statement",
        "Start with a relatable scenario",
        "Start with a counterintuitive insight",
        "Start with an emotional appeal",
      ],
    };

    const strategy = request.variationStrategy ?? "mixed";
    const selectedTones: Tone[] = [];

    if (strategy === "tone" || strategy === "mixed") {
      const tonePool: Tone[] = ["professional", "casual", "humorous", "inspirational", "educational", "promotional"];
      selectedTones.push(...tonePool.slice(0, count));
    } else {
      selectedTones.push(...Array(count).fill(request.tone ?? "professional"));
    }

    for (let i = 0; i < count; i++) {
      const tone = selectedTones[i % selectedTones.length];
      const angleHint = strategy === "angle" || strategy === "mixed"
        ? strategies.angle[i % strategies.angle.length]
        : undefined;

      const post = await this.generate({
        ...request,
        tone,
        additionalContext: angleHint
          ? `${request.additionalContext ?? ""} ${angleHint}`.trim()
          : request.additionalContext,
      });
      variations.push(post);
    }

    return variations;
  }

  async generateABVariants(
    request: PostGenerationRequest,
    variantCount: number = 2
  ): Promise<ABVariant[]> {
    const variants: ABVariant[] = [];
    const count = Math.min(variantCount, 5);

    const variantConfigs: { label: string; strategy: string; hypothesis: string }[] = [
      { label: "Control", strategy: "standard", hypothesis: "Baseline version" },
      { label: "Emotional", strategy: "emotional hook", hypothesis: "Emotional appeal drives higher engagement" },
      { label: "Data-driven", strategy: "include specific numbers and data", hypothesis: "Specificity builds credibility" },
      { label: "Question-led", strategy: "open with a compelling question", hypothesis: "Questions spark curiosity and comments" },
      { label: "Story-based", strategy: "tell a micro-story or anecdote", hypothesis: "Stories are more memorable and shareable" },
    ];

    for (let i = 0; i < count; i++) {
      const config = variantConfigs[i];
      const post = await this.generate({
        ...request,
        additionalContext: `${request.additionalContext ?? ""} ${config.strategy}`.trim(),
      });

      variants.push({
        id: `variant-${i + 1}`,
        label: config.label,
        post,
        hypothesis: config.hypothesis,
      });
    }

    return variants;
  }

  private cleanContent(content: string, request: PostGenerationRequest): string {
    let cleaned = content.trim();

    cleaned = cleaned.replace(/^["']|["']$/g, "");
    cleaned = cleaned.replace(/^Post:\s*/i, "");
    cleaned = cleaned.replace(/^Caption:\s*/i, "");
    cleaned = cleaned.replace(/^Tweet:\s*/i, "");

    if (!request.includeEmojis) {
      const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
      cleaned = cleaned.replace(emojiRegex, "").replace(/\s{2,}/g, " ").trim();
    }

    if (!request.includeHashtags) {
      cleaned = cleaned.replace(/#[\w]+/g, "").replace(/\s{2,}/g, " ").trim();
    }

    return cleaned;
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#[\w\u0400-\u04FF]+/g);
    return matches?.map((h) => h.toLowerCase()) ?? [];
  }

  private parseThread(content: string): string[] {
    const lines = content.split("\n").filter(Boolean);
    const tweets: string[] = [];
    let current = "";

    for (const line of lines) {
      const threadMatch = line.match(/^(\d+)[\/\.\)]\s*(.*)/);
      if (threadMatch) {
        if (current) tweets.push(current.trim());
        current = threadMatch[2] ?? "";
      } else {
        current += " " + line;
      }
    }
    if (current.trim()) tweets.push(current.trim());

    return tweets.filter(Boolean);
  }
}

export const postGenerator = new PostGenerator();
