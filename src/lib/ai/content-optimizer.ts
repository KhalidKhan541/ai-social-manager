import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";
import { type Platform } from "./post-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizationRequest {
  content: string;
  platform: Platform;
  goal?: OptimizationGoal;
  targetAudience?: string;
  brandVoice?: string;
  includeMetrics?: boolean;
}

export type OptimizationGoal =
  | "engagement"
  | "reach"
  | "clicks"
  | "conversions"
  | "brand-awareness"
  | "community-building"
  | "thought-leadership";

export interface OptimizationResult {
  originalScore: number;
  optimizedContent: string;
  optimizedScore: number;
  improvements: OptimizationImprovement[];
  metrics: ContentMetrics;
  suggestions: string[];
  abVariants: ABVariant[];
}

export interface OptimizationImprovement {
  category: string;
  original: string;
  optimized: string;
  reason: string;
  impact: "high" | "medium" | "low";
}

export interface ContentMetrics {
  readabilityScore: number;
  engagementScore: number;
  clarityScore: number;
  toneConsistency: number;
  ctaStrength: number;
  emotionalAppeal: number;
  seoScore: number;
  overallScore: number;
}

export interface ABVariant {
  label: string;
  content: string;
  score: number;
  hypothesis: string;
}

export interface PerformancePrediction {
  estimatedImpressions: { low: number; medium: number; high: number };
  estimatedEngagement: { low: number; medium: number; high: number };
  estimatedClicks: { low: number; medium: number; high: number };
  engagementRate: number;
  bestPostingTime: string;
  audienceMatch: number;
  confidenceLevel: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  score: number;
  description: string;
}

export interface TimeOptimizationRequest {
  content: string;
  platform: Platform;
  targetTimezone?: string;
  audienceLocation?: string;
}

export interface TimeOptimizationResult {
  recommendedTimes: RecommendedTime[];
  avoidTimes: string[];
  reasoning: string;
}

export interface RecommendedTime {
  day: string;
  time: string;
  score: number;
  reason: string;
}

export interface LengthOptimizationRequest {
  content: string;
  platform: Platform;
  goal?: OptimizationGoal;
}

export interface LengthOptimizationResult {
  currentLength: number;
  optimalLength: { min: number; max: number };
  suggestions: LengthSuggestion[];
  trimmedVersion?: string;
  expandedVersion?: string;
}

export interface LengthSuggestion {
  type: "trim" | "expand" | "restructure";
  description: string;
  impact: "high" | "medium" | "low";
}

export interface CTASuggestion {
  cta: string;
  type: "direct" | "soft" | "question" | "urgency" | "value";
  placement: "beginning" | "middle" | "end";
  effectiveness: number;
  reasoning: string;
}

export interface ReadabilityResult {
  score: number;
  grade: string;
  readingTime: string;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  complexWords: number;
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const OptimizationRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads", "pinterest", "youtube"]),
  goal: z.enum(["engagement", "reach", "clicks", "conversions", "brand-awareness", "community-building", "thought-leadership"]).default("engagement"),
  targetAudience: z.string().optional(),
  brandVoice: z.string().optional(),
  includeMetrics: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// ContentOptimizer
// ---------------------------------------------------------------------------

export class ContentOptimizer {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async optimize(request: OptimizationRequest): Promise<OptimizationResult> {
    const validated = OptimizationRequestSchema.parse(request);
    const startTime = Date.now();

    const originalMetrics = this.calculateLocalMetrics(validated.content);

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are an expert social media content optimizer. Optimize the given post for ${validated.platform} with the goal of ${validated.goal}.

Provide:
1. optimizedContent: the fully optimized version of the post
2. improvements: array of specific improvements made, each with:
   - category: what was improved
   - original: original text
   - optimized: new text
   - reason: why this change was made
   - impact: high/medium/low
3. suggestions: 3-5 additional suggestions
4. abVariants: 2 alternative versions with labels and hypotheses

Rules:
- Maintain the core message
- Match the platform's best practices
- ${validated.targetAudience ? `Target audience: ${validated.targetAudience}` : ""}
- ${validated.brandVoice ? `Brand voice: ${validated.brandVoice}` : ""}
- Optimize for ${validated.goal}
- Make changes that are measurable and specific

Output as JSON.`,
        },
        {
          role: "user",
          content: `Optimize this ${validated.platform} post:\n\n"${validated.content}"`,
        },
      ],
      { temperature: 0.5, maxTokens: 3000 }
    );

    const parsed = this.parseOptimizationResult(result.content);
    const optimizedMetrics = this.calculateLocalMetrics(parsed.optimizedContent);

    return {
      originalScore: originalMetrics.overallScore,
      optimizedContent: parsed.optimizedContent,
      optimizedScore: optimizedMetrics.overallScore,
      improvements: parsed.improvements,
      metrics: optimizedMetrics,
      suggestions: parsed.suggestions,
      abVariants: parsed.abVariants,
    };
  }

  async predictPerformance(
    content: string,
    platform: Platform,
    targetAudience?: string
  ): Promise<PerformancePrediction> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media analytics expert. Predict the performance of this ${platform} post.

Analyze and predict:
1. estimatedImpressions: { low, medium, high } range
2. estimatedEngagement: { low, medium, high } likes/comments/shares
3. estimatedClicks: { low, medium, high } link clicks
4. engagementRate: predicted percentage
5. bestPostingTime: optimal posting time
6. audienceMatch: 0-100 score for audience alignment
7. confidenceLevel: 0-100 confidence in predictions
8. factors: array of factors affecting performance, each with:
   - factor: the factor name
   - impact: positive/negative/neutral
   - score: 0-100
   - description: explanation

Consider platform-specific algorithms, content quality, and current trends.

Output as JSON.`,
        },
        {
          role: "user",
          content: `Predict performance for this ${platform} post:\n\n"${content}"${targetAudience ? `\n\nTarget audience: ${targetAudience}` : ""}`,
        },
      ],
      { temperature: 0.4, maxTokens: 2500 }
    );

    return this.parsePerformancePrediction(result.content);
  }

  async optimizeTime(request: TimeOptimizationRequest): Promise<TimeOptimizationResult> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media scheduling expert. Recommend the best posting times for this ${request.platform} post.

${request.targetTimezone ? `Timezone: ${request.targetTimezone}` : ""}
${request.audienceLocation ? `Audience location: ${request.audienceLocation}` : ""}

Provide:
1. recommendedTimes: array of { day, time, score, reason }
2. avoidTimes: array of times to avoid
3. reasoning: overall scheduling strategy explanation

Consider:
- Platform-specific peak hours
- Audience behavior patterns
- Content type and engagement patterns
- Competition levels at different times
- Day-of-week variations

Output as JSON.`,
        },
        {
          role: "user",
          content: `Recommend posting times for:\n\n"${request.content.slice(0, 200)}..."`,
        },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );

    return this.parseTimeOptimization(result.content);
  }

  async optimizeLength(request: LengthOptimizationRequest): Promise<LengthOptimizationResult> {
    const wordCount = request.content.split(/\s+/).length;
    const charCount = request.content.length;

    const optimalRanges: Record<Platform, { min: number; max: number }> = {
      twitter: { min: 40, max: 200 },
      linkedin: { min: 100, max: 300 },
      instagram: { min: 50, max: 250 },
      facebook: { min: 40, max: 200 },
      tiktok: { min: 20, max: 100 },
      threads: { min: 20, max: 150 },
      pinterest: { min: 30, max: 100 },
      youtube: { min: 100, max: 500 },
    };

    const optimal = optimalRanges[request.platform] ?? { min: 50, max: 200 };
    const suggestions: LengthSuggestion[] = [];

    if (wordCount > optimal.max) {
      suggestions.push({
        type: "trim",
        description: `Content is ${wordCount - optimal.max} words over optimal. Consider trimming.`,
        impact: "high",
      });
    } else if (wordCount < optimal.min) {
      suggestions.push({
        type: "expand",
        description: `Content is ${optimal.min - wordCount} words under optimal. Consider adding detail.`,
        impact: "medium",
      });
    } else {
      suggestions.push({
        type: "restructure",
        description: "Content length is within optimal range. Consider restructuring for better readability.",
        impact: "low",
      });
    }

    let trimmedVersion: string | undefined;
    let expandedVersion: string | undefined;

    if (wordCount > optimal.max) {
      trimmedVersion = await this.trimContent(request.content, optimal.max);
    }
    if (wordCount < optimal.min) {
      expandedVersion = await this.expandContent(request.content, optimal.min);
    }

    return {
      currentLength: charCount,
      optimalLength: optimal,
      suggestions,
      trimmedVersion,
      expandedVersion,
    };
  }

  async suggestCTAs(
    content: string,
    platform: Platform,
    goal?: OptimizationGoal
  ): Promise<CTASuggestion[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a conversion optimization expert. Suggest effective CTAs for this ${platform} post.
Goal: ${goal ?? "engagement"}

Suggest 5 different CTAs, each with:
- cta: the call-to-action text
- type: direct/soft/question/urgency/value
- placement: beginning/middle/end
- effectiveness: 0-100 score
- reasoning: why this CTA works

Output as JSON array.`,
        },
        {
          role: "user",
          content: `Suggest CTAs for:\n\n"${content.slice(0, 300)}..."`,
        },
      ],
      { temperature: 0.6, maxTokens: 2000 }
    );

    return this.parseCTASuggestions(result.content);
  }

  async scoreReadability(content: string): Promise<ReadabilityResult> {
    const words = content.split(/\s+/).filter(Boolean);
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    const syllables = words.reduce((sum, w) => sum + this.countSyllables(w), 0);

    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / Math.max(words.length, 1);

    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const score = Math.max(0, Math.min(100, Math.round(fleschScore)));

    let grade = "Easy";
    if (score < 30) grade = "Very Difficult";
    else if (score < 50) grade = "Difficult";
    else if (score < 60) grade = "Fairly Difficult";
    else if (score < 70) grade = "Standard";
    else if (score < 80) grade = "Fairly Easy";

    const readingTimeMinutes = Math.ceil(words.length / 200);
    const complexWords = words.filter((w) => this.countSyllables(w) > 3).length;

    const suggestions: string[] = [];
    if (avgWordsPerSentence > 20) suggestions.push("Shorten sentences for better readability");
    if (complexWords > words.length * 0.2) suggestions.push("Replace complex words with simpler alternatives");
    if (sentences.length < 3) suggestions.push("Add more sentence variety");
    if (words.length < 10) suggestions.push("Add more detail to make the content more valuable");

    return {
      score,
      grade,
      readingTime: `${readingTimeMinutes} min read`,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
      complexWords,
      suggestions,
    };
  }

  async batchOptimize(
    requests: OptimizationRequest[]
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    for (const req of requests.slice(0, 10)) {
      results.push(await this.optimize(req));
    }
    return results;
  }

  private calculateLocalMetrics(content: string): ContentMetrics {
    const words = content.split(/\s+/).filter(Boolean);
    const sentences = content.split(/[.!?]+/).filter(Boolean);

    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const readability = Math.max(0, Math.min(100, 100 - avgWordsPerSentence * 2));

    const hasQuestion = content.includes("?");
    const hasExclamation = content.includes("!");
    const hasEmoji = /[\p{Emoji_Presentation}]/u.test(content);
    const hasHashtag = /#[\w]+/.test(content);
    const hasMention = /@\w+/.test(content);
    const hasLink = /https?:\/\//.test(content);

    let engagement = 50;
    if (hasQuestion) engagement += 10;
    if (hasEmoji) engagement += 5;
    if (hasHashtag) engagement += 5;
    if (words.length >= 10 && words.length <= 200) engagement += 10;
    if (hasExclamation) engagement += 5;

    const clarity = Math.max(0, Math.min(100, 100 - Math.abs(avgWordsPerSentence - 15) * 3));

    const toneConsistency = 70 + (hasEmoji ? 10 : 0) + (hasHashtag ? 5 : 0);

    const ctaStrength = hasQuestion ? 80 : hasExclamation ? 60 : hasLink ? 70 : 40;

    const emotionalAppeal = hasEmoji ? 60 : hasExclamation ? 50 : hasQuestion ? 55 : 40;

    const seoScore = (hasHashtag ? 30 : 0) + (hasLink ? 20 : 0) + Math.min(words.length, 50);

    const overall = Math.round(
      (readability + engagement + clarity + toneConsistency + ctaStrength + emotionalAppeal + seoScore) / 7
    );

    return {
      readabilityScore: readability,
      engagementScore: engagement,
      clarityScore: clarity,
      toneConsistency,
      ctaStrength,
      emotionalAppeal,
      seoScore,
      overallScore: overall,
    };
  }

  private countSyllables(word: string): number {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length <= 3) return 1;

    let count = 0;
    const vowels = "aeiouy";
    let prevVowel = false;

    for (const char of clean) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }

    if (clean.endsWith("e")) count--;
    return Math.max(1, count);
  }

  private async trimContent(content: string, maxWords: number): Promise<string> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Shorten this social media post to under ${maxWords} words while keeping the core message and impact. Return ONLY the shortened text.`,
        },
        { role: "user", content },
      ],
      { temperature: 0.5, maxTokens: 1000 }
    );
    return result.content.trim();
  }

  private async expandContent(content: string, minWords: number): Promise<string> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Expand this social media post to at least ${minWords} words by adding relevant detail, examples, or context. Keep the original message. Return ONLY the expanded text.`,
        },
        { role: "user", content },
      ],
      { temperature: 0.5, maxTokens: 1500 }
    );
    return result.content.trim();
  }

  private parseOptimizationResult(content: string): {
    optimizedContent: string;
    improvements: OptimizationImprovement[];
    suggestions: string[];
    abVariants: ABVariant[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          optimizedContent: String(parsed.optimizedContent ?? content),
          improvements: Array.isArray(parsed.improvements)
            ? (parsed.improvements as Array<Record<string, unknown>>).map((i) => ({
                category: String(i.category ?? ""),
                original: String(i.original ?? ""),
                optimized: String(i.optimized ?? ""),
                reason: String(i.reason ?? ""),
                impact: (i.impact as "high" | "medium" | "low") ?? "medium",
              }))
            : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
          abVariants: Array.isArray(parsed.abVariants)
            ? (parsed.abVariants as Array<Record<string, unknown>>).map((v) => ({
                label: String(v.label ?? ""),
                content: String(v.content ?? ""),
                score: typeof v.score === "number" ? v.score : 50,
                hypothesis: String(v.hypothesis ?? ""),
              }))
            : [],
        };
      }
    } catch {
      // fallback
    }

    return {
      optimizedContent: content,
      improvements: [],
      suggestions: [],
      abVariants: [],
    };
  }

  private parsePerformancePrediction(content: string): PerformancePrediction {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const imp = parsed.estimatedImpressions as Record<string, number> | undefined;
        const eng = parsed.estimatedEngagement as Record<string, number> | undefined;
        const clk = parsed.estimatedClicks as Record<string, number> | undefined;

        return {
          estimatedImpressions: { low: imp?.low ?? 100, medium: imp?.medium ?? 500, high: imp?.high ?? 2000 },
          estimatedEngagement: { low: eng?.low ?? 5, medium: eng?.medium ?? 25, high: eng?.high ?? 100 },
          estimatedClicks: { low: clk?.low ?? 2, medium: clk?.medium ?? 10, high: clk?.high ?? 50 },
          engagementRate: typeof parsed.engagementRate === "number" ? parsed.engagementRate : 2.5,
          bestPostingTime: String(parsed.bestPostingTime ?? "Tuesday 9am"),
          audienceMatch: typeof parsed.audienceMatch === "number" ? parsed.audienceMatch : 70,
          confidenceLevel: typeof parsed.confidenceLevel === "number" ? parsed.confidenceLevel : 60,
          factors: Array.isArray(parsed.factors)
            ? (parsed.factors as Array<Record<string, unknown>>).map((f) => ({
                factor: String(f.factor ?? ""),
                impact: (f.impact as "positive" | "negative" | "neutral") ?? "neutral",
                score: typeof f.score === "number" ? f.score : 50,
                description: String(f.description ?? ""),
              }))
            : [],
        };
      }
    } catch {
      // fallback
    }

    return {
      estimatedImpressions: { low: 100, medium: 500, high: 2000 },
      estimatedEngagement: { low: 5, medium: 25, high: 100 },
      estimatedClicks: { low: 2, medium: 10, high: 50 },
      engagementRate: 2.5,
      bestPostingTime: "Tuesday 9am",
      audienceMatch: 70,
      confidenceLevel: 60,
      factors: [],
    };
  }

  private parseTimeOptimization(content: string): TimeOptimizationResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          recommendedTimes: Array.isArray(parsed.recommendedTimes)
            ? (parsed.recommendedTimes as Array<Record<string, unknown>>).map((t) => ({
                day: String(t.day ?? ""),
                time: String(t.time ?? ""),
                score: typeof t.score === "number" ? t.score : 70,
                reason: String(t.reason ?? ""),
              }))
            : [],
          avoidTimes: Array.isArray(parsed.avoidTimes) ? parsed.avoidTimes.map(String) : [],
          reasoning: String(parsed.reasoning ?? ""),
        };
      }
    } catch {
      // fallback
    }

    return {
      recommendedTimes: [
        { day: "Tuesday", time: "9:00 AM", score: 90, reason: "Peak engagement" },
        { day: "Thursday", time: "12:00 PM", score: 85, reason: "High visibility" },
      ],
      avoidTimes: ["Sunday 3:00 AM", "Saturday 2:00 AM"],
      reasoning: "Focus on weekday business hours for best engagement.",
    };
  }

  private parseCTASuggestions(content: string): CTASuggestion[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        return parsed.map((item) => ({
          cta: String(item.cta ?? ""),
          type: (item.type as CTASuggestion["type"]) ?? "direct",
          placement: (item.placement as CTASuggestion["placement"]) ?? "end",
          effectiveness: typeof item.effectiveness === "number" ? item.effectiveness : 50,
          reasoning: String(item.reasoning ?? ""),
        }));
      }
    } catch {
      // fallback
    }

    return [
      { cta: "What do you think? Let us know in the comments!", type: "question", placement: "end", effectiveness: 75, reasoning: "Encourages engagement through questions" },
      { cta: "Share this with someone who needs to hear this!", type: "soft", placement: "end", effectiveness: 70, reasoning: "Encourages sharing" },
    ];
  }
}

export const contentOptimizer = new ContentOptimizer();
