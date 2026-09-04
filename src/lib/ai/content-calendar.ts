import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";
import { type Platform } from "./post-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentTheme =
  | "educational"
  | "entertaining"
  | "promotional"
  | "inspirational"
  | "community"
  | "behind-the-scenes"
  | "user-generated"
  | "trending"
  | "seasonal"
  | "mixed";

export interface CalendarRequest {
  brandName: string;
  industry: string;
  platforms: Platform[];
  startDate: string;
  endDate: string;
  postsPerWeek?: number;
  themes?: ContentTheme[];
  targetAudience?: string;
  brandGoals?: string[];
  holidays?: string[];
  specialEvents?: string[];
}

export interface CalendarDay {
  date: string;
  dayOfWeek: string;
  posts: CalendarPost[];
}

export interface CalendarPost {
  id: string;
  scheduledTime: string;
  platform: Platform;
  theme: ContentTheme;
  topic: string;
  caption: string;
  hashtags: string[];
  bestTimeReason: string;
  contentMix: ContentMix;
  repurposeFrom?: string;
}

export interface ContentMix {
  educational: number;
  entertaining: number;
  promotional: number;
  inspirational: number;
  community: number;
}

export interface BestTimeAnalysis {
  platform: Platform;
  dayOfWeek: string;
  hour: number;
  score: number;
  reason: string;
}

export interface ContentThemePlan {
  theme: ContentTheme;
  description: string;
  percentage: number;
  postFrequency: string;
  examples: string[];
  bestDays: string[];
}

export interface HolidayContent {
  holiday: string;
  date: string;
  contentIdeas: HolidayContentIdea[];
}

export interface HolidayContentIdea {
  angle: string;
  caption: string;
  hashtags: string[];
  visual: string;
  platform: Platform;
}

export interface RepurposeSuggestion {
  originalContent: string;
  targetPlatform: Platform;
  newFormat: string;
  adaptedCaption: string;
  reasoning: string;
}

export interface BatchGenerationRequest {
  topics: string[];
  platform: Platform;
  theme: ContentTheme;
  tone?: string;
  brandVoice?: string;
  count: number;
}

export interface BatchGenerationResult {
  posts: { topic: string; content: string; hashtags: string[]; scheduledTime: string }[];
  totalTokens: number;
  generationTimeMs: number;
}

// ---------------------------------------------------------------------------
// Best posting times data
// ---------------------------------------------------------------------------

const BEST_TIMES: Record<Platform, Record<string, { hour: number; score: number }[]>> = {
  twitter: {
    Monday: [
      { hour: 8, score: 85 },
      { hour: 12, score: 90 },
      { hour: 17, score: 80 },
    ],
    Tuesday: [
      { hour: 9, score: 92 },
      { hour: 13, score: 88 },
      { hour: 18, score: 78 },
    ],
    Wednesday: [
      { hour: 9, score: 90 },
      { hour: 12, score: 95 },
      { hour: 17, score: 82 },
    ],
    Thursday: [
      { hour: 8, score: 88 },
      { hour: 13, score: 90 },
      { hour: 16, score: 85 },
    ],
    Friday: [
      { hour: 9, score: 85 },
      { hour: 12, score: 88 },
      { hour: 15, score: 80 },
    ],
    Saturday: [{ hour: 10, score: 70 }],
    Sunday: [{ hour: 18, score: 65 }],
  },
  linkedin: {
    Monday: [
      { hour: 7, score: 88 },
      { hour: 10, score: 92 },
      { hour: 17, score: 78 },
    ],
    Tuesday: [
      { hour: 8, score: 90 },
      { hour: 11, score: 95 },
      { hour: 17, score: 80 },
    ],
    Wednesday: [
      { hour: 8, score: 92 },
      { hour: 12, score: 88 },
      { hour: 17, score: 82 },
    ],
    Thursday: [
      { hour: 9, score: 90 },
      { hour: 11, score: 92 },
      { hour: 16, score: 85 },
    ],
    Friday: [
      { hour: 8, score: 85 },
      { hour: 11, score: 88 },
      { hour: 14, score: 80 },
    ],
    Saturday: [{ hour: 10, score: 50 }],
    Sunday: [{ hour: 19, score: 45 }],
  },
  instagram: {
    Monday: [
      { hour: 7, score: 82 },
      { hour: 12, score: 90 },
      { hour: 19, score: 88 },
    ],
    Tuesday: [
      { hour: 8, score: 85 },
      { hour: 13, score: 92 },
      { hour: 20, score: 90 },
    ],
    Wednesday: [
      { hour: 7, score: 80 },
      { hour: 12, score: 88 },
      { hour: 19, score: 92 },
    ],
    Thursday: [
      { hour: 8, score: 88 },
      { hour: 12, score: 90 },
      { hour: 19, score: 85 },
    ],
    Friday: [
      { hour: 8, score: 85 },
      { hour: 13, score: 88 },
      { hour: 18, score: 90 },
    ],
    Saturday: [
      { hour: 10, score: 88 },
      { hour: 14, score: 85 },
    ],
    Sunday: [
      { hour: 10, score: 82 },
      { hour: 17, score: 80 },
    ],
  },
  facebook: {
    Monday: [
      { hour: 9, score: 85 },
      { hour: 13, score: 88 },
      { hour: 16, score: 82 },
    ],
    Tuesday: [
      { hour: 8, score: 88 },
      { hour: 12, score: 90 },
      { hour: 15, score: 85 },
    ],
    Wednesday: [
      { hour: 9, score: 90 },
      { hour: 13, score: 88 },
      { hour: 16, score: 82 },
    ],
    Thursday: [
      { hour: 8, score: 85 },
      { hour: 12, score: 90 },
      { hour: 15, score: 88 },
    ],
    Friday: [
      { hour: 9, score: 82 },
      { hour: 13, score: 85 },
      { hour: 15, score: 80 },
    ],
    Saturday: [{ hour: 11, score: 75 }],
    Sunday: [{ hour: 13, score: 70 }],
  },
  tiktok: {
    Monday: [
      { hour: 7, score: 85 },
      { hour: 12, score: 90 },
      { hour: 19, score: 95 },
    ],
    Tuesday: [
      { hour: 8, score: 88 },
      { hour: 14, score: 92 },
      { hour: 20, score: 95 },
    ],
    Wednesday: [
      { hour: 7, score: 85 },
      { hour: 12, score: 90 },
      { hour: 19, score: 92 },
    ],
    Thursday: [
      { hour: 8, score: 88 },
      { hour: 14, score: 90 },
      { hour: 20, score: 95 },
    ],
    Friday: [
      { hour: 8, score: 90 },
      { hour: 14, score: 92 },
      { hour: 20, score: 95 },
    ],
    Saturday: [
      { hour: 10, score: 90 },
      { hour: 19, score: 92 },
    ],
    Sunday: [
      { hour: 10, score: 88 },
      { hour: 18, score: 90 },
    ],
  },
  threads: {
    Monday: [
      { hour: 8, score: 82 },
      { hour: 12, score: 88 },
      { hour: 18, score: 85 },
    ],
    Tuesday: [
      { hour: 9, score: 85 },
      { hour: 13, score: 90 },
      { hour: 19, score: 88 },
    ],
    Wednesday: [
      { hour: 8, score: 85 },
      { hour: 12, score: 88 },
      { hour: 18, score: 90 },
    ],
    Thursday: [
      { hour: 9, score: 88 },
      { hour: 13, score: 90 },
      { hour: 19, score: 85 },
    ],
    Friday: [
      { hour: 8, score: 82 },
      { hour: 12, score: 85 },
      { hour: 17, score: 88 },
    ],
    Saturday: [{ hour: 10, score: 78 }],
    Sunday: [{ hour: 17, score: 75 }],
  },
  pinterest: {
    Monday: [
      { hour: 8, score: 80 },
      { hour: 14, score: 85 },
    ],
    Tuesday: [
      { hour: 9, score: 85 },
      { hour: 15, score: 88 },
    ],
    Wednesday: [
      { hour: 8, score: 82 },
      { hour: 14, score: 90 },
    ],
    Thursday: [
      { hour: 9, score: 85 },
      { hour: 15, score: 88 },
    ],
    Friday: [
      { hour: 8, score: 80 },
      { hour: 13, score: 85 },
    ],
    Saturday: [{ hour: 11, score: 82 }],
    Sunday: [{ hour: 14, score: 80 }],
  },
  youtube: {
    Monday: [
      { hour: 9, score: 82 },
      { hour: 15, score: 85 },
    ],
    Tuesday: [
      { hour: 10, score: 85 },
      { hour: 16, score: 88 },
    ],
    Wednesday: [
      { hour: 9, score: 88 },
      { hour: 15, score: 90 },
    ],
    Thursday: [
      { hour: 10, score: 90 },
      { hour: 16, score: 88 },
    ],
    Friday: [
      { hour: 9, score: 85 },
      { hour: 14, score: 82 },
    ],
    Saturday: [
      { hour: 10, score: 88 },
      { hour: 15, score: 85 },
    ],
    Sunday: [
      { hour: 11, score: 82 },
      { hour: 16, score: 80 },
    ],
  },
};

const CONTENT_MIX_DEFAULTS: ContentMix = {
  educational: 30,
  entertaining: 20,
  promotional: 15,
  inspirational: 20,
  community: 15,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const CalendarRequestSchema = z.object({
  brandName: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  platforms: z.array(z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads", "pinterest", "youtube"])).min(1),
  startDate: z.string(),
  endDate: z.string(),
  postsPerWeek: z.number().min(1).max(30).default(7),
  themes: z.array(z.enum(["educational", "entertaining", "promotional", "inspirational", "community", "behind-the-scenes", "user-generated", "trending", "seasonal", "mixed"])).default(["mixed"]),
  targetAudience: z.string().optional(),
  brandGoals: z.array(z.string()).optional(),
  holidays: z.array(z.string()).optional(),
  specialEvents: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// ContentCalendar
// ---------------------------------------------------------------------------

export class ContentCalendar {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generateCalendar(request: CalendarRequest): Promise<CalendarDay[]> {
    const validated = CalendarRequestSchema.parse(request);
    const days = this.getDateRange(validated.startDate, validated.endDate);
    const postsPerDay = Math.max(1, Math.round(validated.postsPerWeek / 7));
    const calendar: CalendarDay[] = [];

    const themePlan = this.buildThemePlan(validated.themes, validated.postsPerWeek);

    for (const day of days) {
      const dayOfWeek = this.getDayOfWeek(day);
      const posts: CalendarPost[] = [];

      for (let p = 0; p < postsPerDay; p++) {
        const platform = validated.platforms[p % validated.platforms.length];
        const theme = this.selectTheme(themePlan, dayOfWeek);
        const bestTime = this.getBestTime(platform, dayOfWeek);

        posts.push({
          id: `post-${day}-${p}`,
          scheduledTime: bestTime,
          platform,
          theme,
          topic: "",
          caption: "",
          hashtags: [],
          bestTimeReason: `Optimized for ${dayOfWeek} ${bestTime} on ${platform}`,
          contentMix: CONTENT_MIX_DEFAULTS,
        });
      }

      calendar.push({
        date: day,
        dayOfWeek,
        posts,
      });
    }

    return calendar;
  }

  async analyzeBestTimes(platforms: Platform[]): Promise<BestTimeAnalysis[]> {
    const analysis: BestTimeAnalysis[] = [];

    for (const platform of platforms) {
      const times = BEST_TIMES[platform];
      for (const [day, slots] of Object.entries(times)) {
        for (const slot of slots) {
          analysis.push({
            platform,
            dayOfWeek: day,
            hour: slot.hour,
            score: slot.score,
            reason: this.getBestTimeReason(platform, day, slot.hour, slot.score),
          });
        }
      }
    }

    return analysis.sort((a, b) => b.score - a.score);
  }

  async generateThemePlan(
    brandName: string,
    industry: string,
    goals: string[]
  ): Promise<ContentThemePlan[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media content strategist. Create a comprehensive theme plan for ${brandName} in the ${industry} industry.

Return a JSON array of content themes. Each theme should have:
- theme: the content theme name
- description: what this theme entails
- percentage: percentage of content mix (must total 100)
- postFrequency: how often to post this theme (e.g., "3x per week")
- examples: array of 3 example post topics
- bestDays: array of best days for this theme

Consider the brand goals: ${goals.join(", ")}

Make the plan balanced and practical. Include 4-6 themes.`,
        },
        {
          role: "user",
          content: `Create a content theme plan for ${brandName} (${industry})`,
        },
      ],
      { temperature: 0.7, maxTokens: 3000 }
    );

    return this.parseThemePlan(result.content);
  }

  async getHolidayContentIdeas(
    holidays: string[],
    brandName: string,
    platforms: Platform[]
  ): Promise<HolidayContent[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a creative social media strategist. Generate content ideas for each holiday for ${brandName}.

For each holiday, provide:
- holiday: the holiday name
- date: the date
- contentIdeas: array of 2-3 content ideas, each with:
  - angle: the creative angle
  - caption: a sample caption
  - hashtags: relevant hashtags
  - visual: description of suggested visual
  - platform: which platform it's for

Make ideas creative, on-brand, and actionable. Mix different platforms.`,
        },
        {
          role: "user",
          content: `Generate holiday content ideas for: ${holidays.join(", ")}`,
        },
      ],
      { temperature: 0.8, maxTokens: 4000 }
    );

    return this.parseHolidayContent(result.content);
  }

  async suggestRepurposing(
    content: string,
    sourcePlatform: Platform,
    targetPlatforms: Platform[]
  ): Promise<RepurposeSuggestion[]> {
    const suggestions: RepurposeSuggestion[] = [];

    for (const target of targetPlatforms) {
      const result = await this.client.complete(
        [
          {
            role: "system",
            content: `You are a content repurposing expert. Adapt content from ${sourcePlatform} to ${target}.

Provide:
- adaptedCaption: the repurposed caption for the target platform
- reasoning: why this adaptation works
- newFormat: the content format for the target platform

Rules:
- Match the target platform's style and constraints
- Maintain the core message
- Optimize for the target audience
- Adjust tone and length as needed`,
          },
          {
            role: "user",
            content: `Repurpose this ${sourcePlatform} content for ${target}:\n\n"${content}"`,
          },
        ],
        { temperature: 0.7, maxTokens: 1500 }
      );

      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          suggestions.push({
            originalContent: content,
            targetPlatform: target,
            newFormat: String(parsed.newFormat ?? "Post"),
            adaptedCaption: String(parsed.adaptedCaption ?? ""),
            reasoning: String(parsed.reasoning ?? ""),
          });
        }
      } catch {
        suggestions.push({
          originalContent: content,
          targetPlatform: target,
          newFormat: "Adapted post",
          adaptedCaption: result.content,
          reasoning: "AI-generated adaptation",
        });
      }
    }

    return suggestions;
  }

  async batchGenerate(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    const posts: BatchGenerationResult["posts"] = [];

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media content writer. Generate ${request.count} posts for ${request.platform} about the given topics.

Theme: ${request.theme}
${request.tone ? `Tone: ${request.tone}` : ""}
${request.brandVoice ? `Brand voice: ${request.brandVoice}` : ""}

For each post, provide:
- topic: the post topic
- content: the full post content
- hashtags: relevant hashtags
- scheduledTime: optimal posting time

Return as JSON array. Make each post unique and engaging.`,
        },
        {
          role: "user",
          content: `Generate posts for these topics:\n${request.topics.join("\n")}`,
        },
      ],
      { temperature: 0.8, maxTokens: 8000 }
    );

    totalTokens = result.usage.totalTokens;

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        for (const item of parsed) {
          posts.push({
            topic: String(item.topic ?? ""),
            content: String(item.content ?? ""),
            hashtags: Array.isArray(item.hashtags) ? item.hashtags.map(String) : [],
            scheduledTime: String(item.scheduledTime ?? "09:00"),
          });
        }
      }
    } catch {
      // Fallback: split content into posts
      const sections = result.content.split(/\n\n+/).filter(Boolean);
      for (const section of sections) {
        posts.push({
          topic: request.topics[posts.length] ?? "General",
          content: section.trim(),
          hashtags: [],
          scheduledTime: "09:00",
        });
      }
    }

    return {
      posts,
      totalTokens,
      generationTimeMs: Date.now() - startTime,
    };
  }

  private getDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      dates.push(current.toISOString().split("T")[0]!);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private getDayOfWeek(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
    });
  }

  private getBestTime(platform: Platform, dayOfWeek: string): string {
    const times = BEST_TIMES[platform]?.[dayOfWeek];
    if (!times || times.length === 0) return "09:00";

    const best = times.reduce((a, b) => (a.score > b.score ? a : b));
    return `${String(best.hour).padStart(2, "0")}:00`;
  }

  private getBestTimeReason(platform: string, day: string, hour: number, score: number): string {
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    if (score >= 90) return `Peak engagement time on ${day} ${timeOfDay} for ${platform}`;
    if (score >= 80) return `High engagement window on ${day} ${timeOfDay}`;
    return `Moderate engagement on ${day} ${timeOfDay}`;
  }

  private buildThemePlan(themes: ContentTheme[], postsPerWeek: number): ContentThemePlan[] {
    if (themes.includes("mixed")) {
      return [
        { theme: "educational", description: "Educational content", percentage: 30, postFrequency: `${Math.ceil(postsPerWeek * 0.3)}x/week`, examples: [], bestDays: ["Tuesday", "Thursday"] },
        { theme: "entertaining", description: "Entertaining content", percentage: 20, postFrequency: `${Math.ceil(postsPerWeek * 0.2)}x/week`, examples: [], bestDays: ["Monday", "Friday"] },
        { theme: "promotional", description: "Promotional content", percentage: 15, postFrequency: `${Math.ceil(postsPerWeek * 0.15)}x/week`, examples: [], bestDays: ["Wednesday"] },
        { theme: "inspirational", description: "Inspirational content", percentage: 20, postFrequency: `${Math.ceil(postsPerWeek * 0.2)}x/week`, examples: [], bestDays: ["Monday", "Sunday"] },
        { theme: "community", description: "Community content", percentage: 15, postFrequency: `${Math.ceil(postsPerWeek * 0.15)}x/week`, examples: [], bestDays: ["Friday", "Saturday"] },
      ];
    }

    const perTheme = Math.floor(100 / themes.length);
    return themes.map((theme) => ({
      theme,
      description: `${theme} content`,
      percentage: perTheme,
      postFrequency: `${Math.ceil(postsPerWeek * (perTheme / 100))}x/week`,
      examples: [],
      bestDays: ["Monday", "Wednesday", "Friday"],
    }));
  }

  private selectTheme(plan: ContentThemePlan[], dayOfWeek: string): ContentTheme {
    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);
    return plan[dayIndex % plan.length]?.theme ?? "educational";
  }

  private parseThemePlan(content: string): ContentThemePlan[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed.map((item) => ({
        theme: (item.theme as ContentTheme) ?? "educational",
        description: String(item.description ?? ""),
        percentage: typeof item.percentage === "number" ? item.percentage : 20,
        postFrequency: String(item.postFrequency ?? "2x per week"),
        examples: Array.isArray(item.examples) ? item.examples.map(String) : [],
        bestDays: Array.isArray(item.bestDays) ? item.bestDays.map(String) : ["Monday", "Wednesday", "Friday"],
      }));
    } catch {
      return [];
    }
  }

  private parseHolidayContent(content: string): HolidayContent[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed.map((item) => ({
        holiday: String(item.holiday ?? ""),
        date: String(item.date ?? ""),
        contentIdeas: Array.isArray(item.contentIdeas)
          ? (item.contentIdeas as Array<Record<string, unknown>>).map((idea) => ({
              angle: String(idea.angle ?? ""),
              caption: String(idea.caption ?? ""),
              hashtags: Array.isArray(idea.hashtags) ? idea.hashtags.map(String) : [],
              visual: String(idea.visual ?? ""),
              platform: (idea.platform as Platform) ?? "instagram",
            }))
          : [],
      }));
    } catch {
      return [];
    }
  }
}

export const contentCalendar = new ContentCalendar();
