import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HashtagPlatform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "threads";

export interface HashtagRequest {
  topic: string;
  platform: HashtagPlatform;
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  count?: number;
  includeTrending?: boolean;
  includeBranded?: boolean;
  nicheOnly?: boolean;
  existingBrandedHashtags?: string[];
}

export interface HashtagSuggestion {
  tag: string;
  category: HashtagCategory;
  estimatedReach: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  relevance: number;
  trending: boolean;
  popularity?: number;
  description?: string;
}

export type HashtagCategory =
  | "trending"
  | "niche"
  | "branded"
  | "community"
  | "location"
  | "industry"
  | "campaign"
  | "general";

export interface HashtagBundle {
  id: string;
  name: string;
  description: string;
  hashtags: HashtagSuggestion[];
  platform: HashtagPlatform;
  useCase: string;
  totalEstimatedReach: string;
}

export interface HashtagPerformancePrediction {
  tag: string;
  predictedImpressions: { low: number; medium: number; high: number };
  predictedEngagementRate: number;
  optimalPostTimes: string[];
  audienceOverlap: number;
  shelfLife: string;
  seasonality?: string;
}

export interface TrendingHashtag {
  tag: string;
  postCount: number;
  growthRate: number;
  category: string;
  relatedTopics: string[];
  peakTime?: string;
}

export interface HashtagSet {
  primary: HashtagSuggestion[];
  secondary: HashtagSuggestion[];
  branded: HashtagSuggestion[];
  niche: HashtagSuggestion[];
  trending: HashtagSuggestion[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HashtagRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads"]),
  brandName: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  count: z.number().min(1).max(50).default(15),
  includeTrending: z.boolean().default(true),
  includeBranded: z.boolean().default(true),
  nicheOnly: z.boolean().default(false),
  existingBrandedHashtags: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Platform-specific hashtag limits
// ---------------------------------------------------------------------------

const PLATFORM_HASHTAG_LIMITS: Record<HashtagPlatform, { recommended: number; max: number; name: string }> = {
  twitter: { recommended: 2, max: 5, name: "Twitter/X" },
  linkedin: { recommended: 3, max: 5, name: "LinkedIn" },
  instagram: { recommended: 20, max: 30, name: "Instagram" },
  facebook: { recommended: 1, max: 3, name: "Facebook" },
  tiktok: { recommended: 4, max: 8, name: "TikTok" },
  threads: { recommended: 2, max: 5, name: "Threads" },
};

// ---------------------------------------------------------------------------
// HashtagGenerator
// ---------------------------------------------------------------------------

export class HashtagGenerator {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generate(request: HashtagRequest): Promise<HashtagSuggestion[]> {
    const validated = HashtagRequestSchema.parse(request);
    const limits = PLATFORM_HASHTAG_LIMITS[validated.platform];

    const systemPrompt = `You are an expert social media hashtag strategist. Generate relevant, effective hashtags for social media posts.

PLATFORM: ${limits.name}
- Recommended hashtag count: ${limits.recommended}
- Maximum hashtags: ${limits.max}

HASHTAG CATEGORIES:
- trending: Currently popular and gaining traction
- niche: Specific to the topic, lower competition
- branded: Related to the brand (if brand name provided)
- community: Community-driven, engagement-focused
- location: Geographic-specific (if applicable)
- industry: Industry-standard hashtags
- campaign: Campaign-specific
- general: Broad, widely-used hashtags

For each hashtag, provide:
1. The tag (without #)
2. Category
3. Estimated reach (high/medium/low)
4. Competition level (high/medium/low)
5. Relevance score (0-100)
6. Whether it's trending (true/false)
7. Brief description

GUIDELINES:
- Prioritize relevance over popularity
- Mix broad and niche hashtags
- Include a mix of high and low competition
- ${validated.includeTrending ? "Include trending hashtags when relevant" : "Do not include trending hashtags"}
- ${validated.includeBranded && validated.brandName ? `Suggest branded hashtags using "${validated.brandName}"` : "Do not include branded hashtags"}
- ${validated.nicheOnly ? "Focus only on niche, low-competition hashtags" : "Include a balanced mix"}
- No banned or shadowbanned hashtags
- All lowercase unless it's an acronym
- Must be relevant to the topic
${validated.industry ? `- Industry: ${validated.industry}` : ""}
${validated.targetAudience ? `- Target audience: ${validated.targetAudience}` : ""}
${validated.existingBrandedHashtags?.length ? `- Existing branded hashtags to include: ${validated.existingBrandedHashtags.join(", ")}` : ""}

Output as JSON array. Example:
[{"tag":"marketingtips","category":"niche","estimatedReach":"medium","competition":"low","relevance":85,"trending":false,"description":"Marketing tips and strategies"}]`;

    const result = await this.client.complete(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate ${validated.count} hashtags for a ${limits.name} post about: ${validated.topic}${validated.brandName ? ` (Brand: ${validated.brandName})` : ""}`,
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 3000,
      }
    );

    const hashtags = this.parseHashtags(result.content);
    return hashtags.slice(0, validated.count);
  }

  async findTrending(topic: string, platform: HashtagPlatform): Promise<TrendingHashtag[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media trend analyst. Find trending hashtags related to the given topic for ${platform}.

Output as JSON array. Each item should have:
- tag: The hashtag without #
- postCount: Estimated number of posts (number)
- growthRate: Growth rate as percentage (number)
- category: Category string
- relatedTopics: Array of related topic strings
- peakTime: When this hashtag peaks (optional string)

Focus on hashtags that are actively trending NOW. Include a mix of sizes. Provide realistic post counts.`,
        },
        { role: "user", content: `Find trending hashtags for: ${topic}` },
      ],
      { temperature: 0.6, maxTokens: 3000 }
    );

    return this.parseTrending(result.content);
  }

  async bundle(request: HashtagRequest, bundleCount: number = 3): Promise<HashtagBundle[]> {
    const hashtags = await this.generate({ ...request, count: 30 });
    const bundles: HashtagBundle[] = [];
    const perBundle = Math.ceil(hashtags.length / bundleCount);

    const bundleNames = [
      "High Reach Bundle",
      "Niche Engagement Bundle",
      "Brand Awareness Bundle",
      "Community Builder Bundle",
      "Trending Boost Bundle",
    ];

    const bundleDescriptions = [
      "Broad hashtags for maximum visibility and reach",
      "Targeted hashtags for engaged niche audiences",
      "Mix of branded and industry hashtags for recognition",
      "Hashtags that foster community engagement and discussion",
      "Current trending hashtags for timely visibility",
    ];

    const useCases = [
      "Use for product announcements and major updates",
      "Use for educational content and thought leadership",
      "Use for brand-building and awareness campaigns",
      "Use for community engagement and discussions",
      "Use for timely, news-related content",
    ];

    for (let i = 0; i < bundleCount; i++) {
      const start = i * perBundle;
      const bundleHashtags = hashtags.slice(start, start + perBundle);

      bundles.push({
        id: `bundle-${i + 1}`,
        name: bundleNames[i % bundleNames.length],
        description: bundleDescriptions[i % bundleDescriptions.length],
        hashtags: bundleHashtags,
        platform: request.platform,
        useCase: useCases[i % useCases.length],
        totalEstimatedReach: this.calculateTotalReach(bundleHashtags),
      });
    }

    return bundles;
  }

  async predictPerformance(
    hashtags: string[],
    platform: HashtagPlatform
  ): Promise<HashtagPerformancePrediction[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media analytics expert. Predict the performance of each hashtag for ${platform}.

For each hashtag, provide realistic performance predictions:
- predictedImpressions: { low, medium, high } (estimated impressions range)
- predictedEngagementRate: percentage (e.g., 2.5)
- optimalPostTimes: array of day/time strings
- audienceOverlap: 0-100 (how much audience overlap with other hashtags)
- shelfLife: how long the hashtag remains relevant (e.g., "24 hours", "1 week", "evergreen")
- seasonality: seasonal patterns if any (optional)

Be realistic based on the hashtag's likely popularity and competition.`,
        },
        {
          role: "user",
          content: `Predict performance for these hashtags on ${platform}:\n${hashtags.map((h) => `#${h}`).join(", ")}`,
        },
      ],
      { temperature: 0.5, maxTokens: 3000 }
    );

    return this.parsePredictions(result.content, hashtags);
  }

  async getOptimalHashtagSet(request: HashtagRequest): Promise<HashtagSet> {
    const allHashtags = await this.generate({ ...request, count: 40 });

    const trending = allHashtags.filter((h) => h.category === "trending" || h.trending);
    const branded = allHashtags.filter((h) => h.category === "branded");
    const niche = allHashtags.filter((h) => h.category === "niche");
    const community = allHashtags.filter((h) => h.category === "community");

    const limits = PLATFORM_HASHTAG_LIMITS[request.platform];
    const primary = allHashtags
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, Math.min(limits.recommended, allHashtags.length));
    const secondary = allHashtags
      .filter((h) => !primary.includes(h))
      .slice(0, Math.min(limits.max - primary.length, allHashtags.length));

    return {
      primary,
      secondary,
      branded,
      niche,
      trending,
    };
  }

  async generateForCampaign(
    campaignName: string,
    campaignGoal: string,
    platforms: HashtagPlatform[],
    brandName?: string
  ): Promise<Record<HashtagPlatform, HashtagBundle[]>> {
    const result: Record<HashtagPlatform, HashtagBundle[]> = {} as Record<HashtagPlatform, HashtagBundle[]>;

    for (const platform of platforms) {
      result[platform] = await this.bundle(
        {
          topic: `${campaignName} - ${campaignGoal}`,
          platform,
          brandName,
          includeBranded: !!brandName,
          count: 30,
        },
        3
      );
    }

    return result;
  }

  private parseHashtags(content: string): HashtagSuggestion[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed.map((item) => ({
        tag: String(item.tag ?? "").replace(/^#/, "").toLowerCase(),
        category: (item.category as HashtagCategory) ?? "general",
        estimatedReach: (item.estimatedReach as "high" | "medium" | "low") ?? "medium",
        competition: (item.competition as "high" | "medium" | "low") ?? "medium",
        relevance: typeof item.relevance === "number" ? item.relevance : 50,
        trending: typeof item.trending === "boolean" ? item.trending : false,
        popularity: typeof item.popularity === "number" ? item.popularity : undefined,
        description: typeof item.description === "string" ? item.description : undefined,
      }));
    } catch {
      return [];
    }
  }

  private parseTrending(content: string): TrendingHashtag[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed.map((item) => ({
        tag: String(item.tag ?? "").replace(/^#/, "").toLowerCase(),
        postCount: typeof item.postCount === "number" ? item.postCount : 0,
        growthRate: typeof item.growthRate === "number" ? item.growthRate : 0,
        category: String(item.category ?? "general"),
        relatedTopics: Array.isArray(item.relatedTopics)
          ? item.relatedTopics.map(String)
          : [],
        peakTime: typeof item.peakTime === "string" ? item.peakTime : undefined,
      }));
    } catch {
      return [];
    }
  }

  private parsePredictions(content: string, originalTags: string[]): HashtagPerformancePrediction[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed.map((item, idx) => ({
        tag: String(item.tag ?? originalTags[idx] ?? "").replace(/^#/, "").toLowerCase(),
        predictedImpressions: {
          low: typeof (item.predictedImpressions as Record<string, number>)?.low === "number"
            ? ((item.predictedImpressions as Record<string, number>).low)
            : 1000,
          medium: typeof (item.predictedImpressions as Record<string, number>)?.medium === "number"
            ? ((item.predictedImpressions as Record<string, number>).medium)
            : 5000,
          high: typeof (item.predictedImpressions as Record<string, number>)?.high === "number"
            ? ((item.predictedImpressions as Record<string, number>).high)
            : 20000,
        },
        predictedEngagementRate:
          typeof item.predictedEngagementRate === "number" ? item.predictedEngagementRate : 2.0,
        optimalPostTimes: Array.isArray(item.optimalPostTimes)
          ? item.optimalPostTimes.map(String)
          : ["Tuesday 9am", "Thursday 12pm"],
        audienceOverlap:
          typeof item.audienceOverlap === "number" ? item.audienceOverlap : 50,
        shelfLife: typeof item.shelfLife === "string" ? item.shelfLife : "1 week",
        seasonality: typeof item.seasonality === "string" ? item.seasonality : undefined,
      }));
    } catch {
      return originalTags.map((tag) => ({
        tag,
        predictedImpressions: { low: 1000, medium: 5000, high: 20000 },
        predictedEngagementRate: 2.0,
        optimalPostTimes: ["Tuesday 9am", "Thursday 12pm"],
        audienceOverlap: 50,
        shelfLife: "1 week",
      }));
    }
  }

  private calculateTotalReach(hashtags: HashtagSuggestion[]): string {
    const reachMap = { high: 3, medium: 2, low: 1 };
    const total = hashtags.reduce(
      (sum, h) => sum + (reachMap[h.estimatedReach] ?? 1),
      0
    );
    if (total >= 20) return "High";
    if (total >= 10) return "Medium";
    return "Low";
  }
}

export const hashtagGenerator = new HashtagGenerator();
