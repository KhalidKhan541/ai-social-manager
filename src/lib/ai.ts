import { db } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import type {
  Platform,
  SocialAccount,
} from "@prisma/client";

// ─── OpenAI wrapper ─────────────────────────────────────────────────────────────

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionChoice {
  message: { content: string };
  finish_reason: string;
}

interface ChatCompletion {
  choices: ChatCompletionChoice[];
  usage?: { total_tokens: number };
}

async function chatCompletion(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<{ content: string; tokens: number }> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${JSON.stringify(error)}`
    );
  }

  const data: ChatCompletion = await response.json();
  return {
    content: data.choices[0]?.message?.content ?? "",
    tokens: data.usage?.total_tokens ?? 0,
  };
}

// ─── Platform context ───────────────────────────────────────────────────────────

const PLATFORM_CONTEXT: Record<Platform, string> = {
  TWITTER: "Twitter/X posts are concise (max 280 chars). Use hashtags, threads for longer content. Engagement is driven by timing, retweets, and replies.",
  INSTAGRAM: "Instagram prioritizes visual content. Use 5-30 hashtags, engaging captions, and Reels for reach. Stories drive engagement.",
  LINKEDIN: "LinkedIn is professional. Long-form posts perform well. Use industry hashtags, thought leadership, and storytelling.",
  FACEBOOK: "Facebook favors native content, videos, and groups. Longer posts with images perform better than text-only.",
  TIKTOK: "TikTok is short-form video. Trending sounds and hashtags drive discovery. Authentic, unpolished content performs best.",
  YOUTUBE: "YouTube is long-form video. SEO-optimized titles, descriptions, and thumbnails are crucial. Shorts drive discovery.",
  PINTEREST: "Pinterest is visual discovery. Vertical pins, detailed descriptions, and boards drive traffic.",
  THREADS: "Threads is casual, text-first. Short, conversational posts with personality drive engagement.",
  MASTODON: "Mastodon is decentralized. Long-form posts, community hashtags, and genuine interaction drive engagement.",
  BLUESKY: "Bluesky is text-first with algorithmic feeds. Authentic, interesting posts drive engagement.",
};

// ─── Content Generation ─────────────────────────────────────────────────────────

export interface GeneratePostOptions {
  topic: string;
  platform: Platform;
  tone?: string;
  brandVoice?: string;
  includeEmojis?: boolean;
  maxLength?: number;
  targetAudience?: string;
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  platform: Platform;
  estimatedEngagement: number;
  tokens: number;
}

export async function generatePost(options: GeneratePostOptions): Promise<GeneratedPost> {
  const context = PLATFORM_CONTEXT[options.platform];

  const systemPrompt = `You are an expert social media content creator specializing in ${options.platform} posts.
Platform context: ${context}
Brand voice: ${options.brandVoice ?? "professional, engaging, authentic"}
Tone: ${options.tone ?? "friendly and professional"}

Rules:
- Create compelling, authentic content
- Include relevant emojis: ${options.includeEmojis !== false ? "yes" : "no"}
- Stay within platform character limits
- Focus on engagement and value
- Return JSON: { "content": "...", "hashtags": ["..."], "estimatedEngagement": 0-100 }`;

  const userPrompt = `Create a ${options.platform} post about: ${options.topic}
${options.targetAudience ? `Target audience: ${options.targetAudience}` : ""}
${options.maxLength ? `Max length: ${options.maxLength} characters` : ""}`;

  const result = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.8 });

  try {
    const parsed = JSON.parse(result.content);
    return {
      content: parsed.content,
      hashtags: parsed.hashtags ?? [],
      platform: options.platform,
      estimatedEngagement: parsed.estimatedEngagement ?? 50,
      tokens: result.tokens,
    };
  } catch {
    return {
      content: result.content,
      hashtags: extractHashtags(result.content),
      platform: options.platform,
      estimatedEngagement: 50,
      tokens: result.tokens,
    };
  }
}

// ─── Hashtag Generation ─────────────────────────────────────────────────────────

export interface HashtagSuggestion {
  tag: string;
  popularity: number;
  relevance: number;
  competition: "low" | "medium" | "high";
}

export async function generateHashtags(
  topic: string,
  platform: Platform,
  count: number = 10
): Promise<HashtagSuggestion[]> {
  const cacheKey = `hashtags:${platform}:${topic.toLowerCase().slice(0, 50)}:${count}`;
  const cached = await cacheGet<HashtagSuggestion[]>(cacheKey);
  if (cached) return cached;

  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are a social media hashtag expert for ${PLATFORM_CONTEXT[platform]}.
Return JSON array of ${count} hashtags with popularity (0-100), relevance (0-100), and competition level.
[{"tag": "...", "popularity": 0-100, "relevance": 0-100, "competition": "low|medium|high"}]`,
      },
      {
        role: "user",
        content: `Generate ${count} hashtags for: ${topic} on ${platform}`,
      },
    ],
    { temperature: 0.6, maxTokens: 1024 }
  );

  try {
    const hashtags = JSON.parse(result.content);
    await cacheSet(cacheKey, hashtags, 86400);
    return hashtags;
  } catch {
    return [];
  }
}

// ─── Content Optimization ───────────────────────────────────────────────────────

export interface OptimizationResult {
  originalContent: string;
  optimizedContent: string;
  suggestions: string[];
  score: number;
  improvements: { area: string; before: string; after: string }[];
  tokens: number;
}

export async function optimizePost(
  content: string,
  platform: Platform,
  goal: string = "engagement"
): Promise<OptimizationResult> {
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are a social media optimization expert. Analyze and optimize posts for ${goal} on ${platform}.
Return JSON:
{
  "optimizedContent": "...",
  "suggestions": ["..."],
  "score": 0-100,
  "improvements": [{"area": "...", "before": "...", "after": "..."}]
}`,
      },
      {
        role: "user",
        content: `Optimize this post:\n\n"${content}"`,
      },
    ],
    { temperature: 0.5 }
  );

  try {
    const parsed = JSON.parse(result.content);
    return {
      originalContent: content,
      optimizedContent: parsed.optimizedContent,
      suggestions: parsed.suggestions ?? [],
      score: parsed.score ?? 70,
      improvements: parsed.improvements ?? [],
      tokens: result.tokens,
    };
  } catch {
    return {
      originalContent: content,
      optimizedContent: content,
      suggestions: ["Unable to parse optimization result"],
      score: 50,
      improvements: [],
      tokens: result.tokens,
    };
  }
}

// ─── Sentiment Analysis ─────────────────────────────────────────────────────────

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
  emotions: Record<string, number>;
  keywords: string[];
  summary: string;
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are a sentiment analysis expert. Analyze the sentiment and emotions of social media text.
Return JSON:
{
  "sentiment": "positive|neutral|negative",
  "score": -1 to 1,
  "confidence": 0 to 1,
  "emotions": {"joy": 0-1, "sadness": 0-1, "anger": 0-1, "surprise": 0-1, "fear": 0-1, "disgust": 0-1},
  "keywords": ["..."],
  "summary": "brief summary"
}`,
      },
      {
        role: "user",
        content: `Analyze the sentiment of: "${text}"`,
      },
    ],
    { temperature: 0.3 }
  );

  try {
    return JSON.parse(result.content);
  } catch {
    return {
      sentiment: "neutral",
      score: 0,
      confidence: 0.5,
      emotions: { joy: 0.5, sadness: 0, anger: 0, surprise: 0, fear: 0, disgust: 0 },
      keywords: [],
      summary: "Unable to analyze sentiment",
    };
  }
}

// ─── Content Repurposing ────────────────────────────────────────────────────────

export interface RepurposeResult {
  original: string;
  platform: Platform;
  content: string;
  hashtags: string[];
  adaptedFor: string;
  tokens: number;
}

export async function repurposeContent(
  content: string,
  sourcePlatform: Platform,
  targetPlatforms: Platform[]
): Promise<RepurposeResult[]> {
  const results: RepurposeResult[] = [];

  for (const target of targetPlatforms) {
    const result = await chatCompletion(
      [
        {
          role: "system",
          content: `You are a content repurposing expert. Adapt content from ${sourcePlatform} to ${target}.
Platform context: ${PLATFORM_CONTEXT[target]}
Return JSON: { "content": "...", "hashtags": ["..."], "adaptedFor": "brief explanation" }`,
        },
        {
          role: "user",
          content: `Repurpose this ${sourcePlatform} post for ${target}:\n\n"${content}"`,
        },
      ],
      { temperature: 0.7 }
    );

    try {
      const parsed = JSON.parse(result.content);
      results.push({
        original: content,
        platform: target,
        content: parsed.content,
        hashtags: parsed.hashtags ?? [],
        adaptedFor: parsed.adaptedFor ?? "",
        tokens: result.tokens,
      });
    } catch {
      results.push({
        original: content,
        platform: target,
        content,
        hashtags: [],
        adaptedFor: "Direct copy (parsing failed)",
        tokens: result.tokens,
      });
    }
  }

  return results;
}

// ─── Calendar Suggestions ───────────────────────────────────────────────────────

export interface CalendarSuggestion {
  date: string;
  time: string;
  platform: Platform;
  topic: string;
  contentType: string;
  reason: string;
  estimatedEngagement: number;
}

export async function generateCalendarSuggestions(
  orgId: string,
  platforms: Platform[],
  startDate: string,
  endDate: string,
  topics: string[]
): Promise<CalendarSuggestion[]> {
  const cacheKey = `ai:calendar:${orgId}:${startDate}:${endDate}`;
  const cached = await cacheGet<CalendarSuggestion[]>(cacheKey);
  if (cached) return cached;

  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are a social media scheduling expert. Generate optimal posting calendar.
Platforms: ${platforms.join(", ")}
Return JSON array:
[{
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "platform": "PLATFORM",
  "topic": "...",
  "contentType": "post|story|reel|video|carousel",
  "reason": "...",
  "estimatedEngagement": 0-100
}]`,
      },
      {
        role: "user",
        content: `Generate a content calendar from ${startDate} to ${endDate}.
Topics: ${topics.join(", ") || "General industry content"}
Consider optimal posting times and platform best practices.`,
      },
    ],
    { temperature: 0.7, maxTokens: 4096 }
  );

  try {
    const suggestions = JSON.parse(result.content);
    await cacheSet(cacheKey, suggestions, 3600);
    return suggestions;
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\w\u0400-\u04FF]+/g);
  return matches?.map((tag) => tag.slice(1)) ?? [];
}
