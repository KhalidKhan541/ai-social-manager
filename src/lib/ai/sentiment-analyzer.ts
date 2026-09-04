import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SentimentLabel = "positive" | "negative" | "neutral" | "mixed";
export type UrgencyLevel = "critical" | "high" | "medium" | "low";
export type TrendDirection = "rising" | "falling" | "stable" | "emerging";

export interface SentimentAnalysisRequest {
  text: string;
  context?: string;
  brandName?: string;
  language?: string;
}

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
  confidence: number;
  emotions: EmotionScore[];
  aspects: AspectSentiment[];
  keyPhrases: string[];
  summary: string;
}

export interface EmotionScore {
  emotion: string;
  score: number;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentLabel;
  score: number;
  mentions: number;
}

export interface BrandMentionAnalysis {
  mentions: BrandMention[];
  overallSentiment: SentimentLabel;
  averageScore: number;
  totalMentions: number;
  sentimentTrend: TrendDirection;
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  recommendations: string[];
}

export interface BrandMention {
  text: string;
  source: string;
  sentiment: SentimentLabel;
  score: number;
  emotions: EmotionScore[];
  influence: number;
  url?: string;
  timestamp?: string;
}

export interface TrendDetectionResult {
  trends: Trend[];
  emergingTopics: EmergingTopic[];
  sentimentByTrend: Record<string, SentimentLabel>;
  recommendations: string[];
}

export interface Trend {
  name: string;
  direction: TrendDirection;
  volume: number;
  growth: number;
  sentiment: SentimentLabel;
  relatedKeywords: string[];
  description: string;
  firstSeen: string;
  peakTime?: string;
}

export interface EmergingTopic {
  topic: string;
  confidence: number;
  earlySignals: string[];
  predictedImpact: "high" | "medium" | "low";
  suggestedAction: string;
}

export interface CrisisAlert {
  level: UrgencyLevel;
  title: string;
  description: string;
  sentiment: SentimentLabel;
  score: number;
  affectedTopics: string[];
  sampleComments: string[];
  recommendedActions: string[];
  detectedAt: string;
  estimatedReach: number;
}

export interface CompetitorAnalysis {
  competitor: string;
  averageSentiment: SentimentLabel;
  sentimentScore: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  topTopics: string[];
  engagementLevel: string;
  comparisonToBrand: string;
}

export interface BatchSentimentRequest {
  texts: string[];
  context?: string;
  brandName?: string;
}

export interface BatchSentimentResult {
  results: SentimentResult[];
  overallSentiment: SentimentLabel;
  averageScore: number;
  distribution: { positive: number; negative: number; neutral: number; mixed: number };
  summary: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SentimentRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  context: z.string().optional(),
  brandName: z.string().optional(),
  language: z.string().default("en"),
});

// ---------------------------------------------------------------------------
// SentimentAnalyzer
// ---------------------------------------------------------------------------

export class SentimentAnalyzer {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async analyze(request: SentimentAnalysisRequest): Promise<SentimentResult> {
    const validated = SentimentRequestSchema.parse(request);
    const startTime = Date.now();

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are an expert sentiment analysis AI. Analyze the sentiment, emotions, and aspects of the given text.

Provide a comprehensive analysis:
1. Overall sentiment (positive/negative/neutral/mixed)
2. Sentiment score (-1 to 1)
3. Confidence level (0 to 1)
4. Emotions detected (joy, anger, sadness, fear, surprise, disgust, trust, anticipation - each scored 0-1)
5. Aspect-based sentiments (key topics/aspects mentioned and their individual sentiments)
6. Key phrases that indicate sentiment
7. Brief summary of the analysis

${validated.brandName ? `This analysis is for brand "${validated.brandName}". Consider brand-specific context.` : ""}
${validated.context ? `Context: ${validated.context}` : ""}

Output as JSON:
{
  "label": "positive|negative|neutral|mixed",
  "score": 0.0,
  "confidence": 0.0,
  "emotions": [{"emotion": "joy", "score": 0.8}],
  "aspects": [{"aspect": "customer service", "sentiment": "positive", "score": 0.7, "mentions": 2}],
  "keyPhrases": ["great experience", "highly recommend"],
  "summary": "Overall positive sentiment..."
}`,
        },
        {
          role: "user",
          content: `Analyze the sentiment of this text:\n\n"${validated.text}"`,
        },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    );

    return this.parseSentimentResult(result.content, startTime);
  }

  async analyzeBatch(request: BatchSentimentRequest): Promise<BatchSentimentResult> {
    const texts = request.texts.slice(0, 50);
    const results: SentimentResult[] = [];

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are an expert sentiment analysis AI. Analyze each text in the batch.

For each text, provide:
- label: positive/negative/neutral/mixed
- score: -1 to 1
- confidence: 0 to 1
- emotions: top 3 emotions with scores
- keyPhrases: 2-3 key phrases

${request.brandName ? `Brand: ${request.brandName}` : ""}

Output as JSON array. Each item should match the input order.

Example:
[
  {"label":"positive","score":0.8,"confidence":0.9,"emotions":[{"emotion":"joy","score":0.7}],"keyPhrases":["great product"]},
  {"label":"negative","score":-0.6,"confidence":0.8,"emotions":[{"emotion":"anger","score":0.5}],"keyPhrases":["slow delivery"]}
]`,
        },
        {
          role: "user",
          content: `Analyze sentiment for these ${texts.length} texts:\n${texts.map((t, i) => `${i + 1}. "${t.slice(0, 200)}"`).join("\n")}`,
        },
      ],
      { temperature: 0.3, maxTokens: 4000 }
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        for (const item of parsed) {
          results.push({
            label: (item.label as SentimentLabel) ?? "neutral",
            score: typeof item.score === "number" ? item.score : 0,
            confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
            emotions: Array.isArray(item.emotions)
              ? (item.emotions as Array<Record<string, unknown>>).map((e) => ({
                  emotion: String(e.emotion ?? ""),
                  score: typeof e.score === "number" ? e.score : 0,
                }))
              : [],
            aspects: [],
            keyPhrases: Array.isArray(item.keyPhrases) ? item.keyPhrases.map(String) : [],
            summary: "",
          });
        }
      }
    } catch {
      for (const text of texts) {
        const single = await this.analyze({ text: text.slice(0, 1000) });
        results.push(single);
      }
    }

    const distribution = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    let totalScore = 0;
    for (const r of results) {
      distribution[r.label]++;
      totalScore += r.score;
    }

    const overallScore = results.length > 0 ? totalScore / results.length : 0;
    const overallSentiment: SentimentLabel =
      overallScore > 0.2 ? "positive" : overallScore < -0.2 ? "negative" : "neutral";

    return {
      results,
      overallSentiment,
      averageScore: overallScore,
      distribution,
      summary: `Analyzed ${results.length} texts. Overall sentiment: ${overallSentiment} (score: ${overallScore.toFixed(2)}). Distribution: ${distribution.positive} positive, ${distribution.negative} negative, ${distribution.neutral} neutral, ${distribution.mixed} mixed.`,
    };
  }

  async analyzeBrandMentions(
    mentions: string[],
    brandName: string,
    context?: string
  ): Promise<BrandMentionAnalysis> {
    const batchResult = await this.analyzeBatch({
      texts: mentions,
      brandName,
      context,
    });

    const brandMentions: BrandMention[] = batchResult.results.map((r, i) => ({
      text: mentions[i] ?? "",
      source: "social_media",
      sentiment: r.label,
      score: r.score,
      emotions: r.emotions,
      influence: r.confidence,
    }));

    const positiveThemes = new Set<string>();
    const negativeThemes = new Set<string>();
    for (const r of batchResult.results) {
      for (const phrase of r.keyPhrases) {
        if (r.score > 0.2) positiveThemes.add(phrase);
        else if (r.score < -0.2) negativeThemes.add(phrase);
      }
    }

    const trendAnalysis = await this.client.complete(
      [
        {
          role: "system",
          content: `Based on these brand mentions for "${brandName}", provide:
1. sentimentTrend: rising/falling/stable/emerging
2. recommendations: 3-5 actionable recommendations

Output as JSON:
{"sentimentTrend":"rising","recommendations":["..."]}`,
        },
        {
          role: "user",
          content: `Brand mentions analysis:\nOverall sentiment: ${batchResult.overallSentiment}\nAverage score: ${batchResult.averageScore.toFixed(2)}\nTop positive themes: ${[...positiveThemes].join(", ")}\nTop negative themes: ${[...negativeThemes].join(", ")}`,
        },
      ],
      { temperature: 0.5, maxTokens: 1000 }
    );

    let sentimentTrend: TrendDirection = "stable";
    let recommendations: string[] = [];

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        sentimentTrend = (parsed.sentimentTrend as TrendDirection) ?? "stable";
        recommendations = Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(String)
          : [];
      }
    } catch {
      // use defaults
    }

    return {
      mentions: brandMentions,
      overallSentiment: batchResult.overallSentiment,
      averageScore: batchResult.averageScore,
      totalMentions: mentions.length,
      sentimentTrend,
      topPositiveThemes: [...positiveThemes].slice(0, 10),
      topNegativeThemes: [...negativeThemes].slice(0, 10),
      recommendations,
    };
  }

  async detectTrends(
    texts: string[],
    context?: string
  ): Promise<TrendDetectionResult> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a trend detection expert. Analyze these texts to identify trends and emerging topics.

Identify:
1. Trends: patterns that are clearly established (rising/falling/stable)
2. Emerging topics: new subjects gaining early traction

For each trend:
- name: trend name
- direction: rising/falling/stable/emerging
- volume: estimated relative volume (1-100)
- growth: growth rate percentage
- sentiment: overall sentiment toward this trend
- relatedKeywords: related terms
- description: brief description
- firstSeen: when this trend likely started
- peakTime: when engagement peaks (optional)

For emerging topics:
- topic: topic name
- confidence: confidence score 0-1
- earlySignals: evidence of emergence
- predictedImpact: high/medium/low
- suggestedAction: recommended brand action

Also provide:
- sentimentByTrend: mapping of trend name to overall sentiment
- recommendations: 3-5 strategic recommendations

Output as JSON.`,
        },
        {
          role: "user",
          content: `Analyze trends in these ${texts.length} texts:\n${context ? `Context: ${context}\n` : ""}${texts.slice(0, 30).map((t, i) => `${i + 1}. ${t.slice(0, 150)}`).join("\n")}`,
        },
      ],
      { temperature: 0.5, maxTokens: 4000 }
    );

    return this.parseTrendResult(result.content);
  }

  async detectCrisis(
    recentTexts: string[],
    brandName: string,
    baselineSentiment?: number
  ): Promise<CrisisAlert | null> {
    const batchResult = await this.analyzeBatch({
      texts: recentTexts,
      brandName,
    });

    const negativeCount = batchResult.distribution.negative;
    const negativeRatio = recentTexts.length > 0 ? negativeCount / recentTexts.length : 0;
    const avgScore = batchResult.averageScore;
    const baseline = baselineSentiment ?? 0.1;

    if (negativeRatio < 0.3 && avgScore > baseline - 0.3) {
      return null;
    }

    let level: UrgencyLevel = "low";
    if (negativeRatio > 0.7 || avgScore < -0.6) level = "critical";
    else if (negativeRatio > 0.5 || avgScore < -0.4) level = "high";
    else if (negativeRatio > 0.3 || avgScore < -0.2) level = "medium";

    const negativeTexts = recentTexts.filter((_, i) => {
      const result = batchResult.results[i];
      return result && (result.label === "negative" || result.score < -0.2);
    });

    const affectedTopics = new Set<string>();
    for (const r of batchResult.results) {
      if (r.label === "negative" || r.score < -0.2) {
        for (const phrase of r.keyPhrases) {
          affectedTopics.add(phrase);
        }
      }
    }

    const alertResult = await this.client.complete(
      [
        {
          role: "system",
          content: `A potential crisis has been detected for brand "${brandName}". Generate a crisis alert with:
1. title: concise alert title
2. description: what's happening
3. recommendedActions: 3-5 immediate actions

Output as JSON:
{"title":"...","description":"...","recommendedActions":["..."]}`,
        },
        {
          role: "user",
          content: `Crisis indicators:
- Negative ratio: ${(negativeRatio * 100).toFixed(1)}%
- Average sentiment: ${avgScore.toFixed(2)}
- Urgency: ${level}
- Sample negative comments: ${negativeTexts.slice(0, 5).map((t) => `"${t.slice(0, 100)}"`).join(", ")}
- Affected topics: ${[...affectedTopics].join(", ")}`,
        },
      ],
      { temperature: 0.4, maxTokens: 1500 }
    );

    let title = `${brandName} Sentiment Crisis Detected`;
    let description = `Significant negative sentiment detected with ${level} urgency.`;
    let recommendedActions = [
      "Monitor social channels closely",
      "Prepare official response",
      "Engage with affected customers",
    ];

    try {
      const jsonMatch = alertResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        title = String(parsed.title ?? title);
        description = String(parsed.description ?? description);
        recommendedActions = Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions.map(String)
          : recommendedActions;
      }
    } catch {
      // use defaults
    }

    return {
      level,
      title,
      description,
      sentiment: batchResult.overallSentiment,
      score: avgScore,
      affectedTopics: [...affectedTopics].slice(0, 10),
      sampleComments: negativeTexts.slice(0, 5),
      recommendedActions,
      detectedAt: new Date().toISOString(),
      estimatedReach: recentTexts.length * 100,
    };
  }

  async analyzeCompetitor(
    competitorName: string,
    mentions: string[],
    brandName: string
  ): Promise<CompetitorAnalysis> {
    const batchResult = await this.analyzeBatch({
      texts: mentions,
      brandName: competitorName,
    });

    const topics = new Set<string>();
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const r of batchResult.results) {
      for (const phrase of r.keyPhrases) {
        topics.add(phrase);
      }
      if (r.score > 0.3) strengths.push(...r.keyPhrases);
      if (r.score < -0.3) weaknesses.push(...r.keyPhrases);
    }

    const analysisResult = await this.client.complete(
      [
        {
          role: "system",
          content: `Analyze competitor "${competitorName}" vs brand "${brandName}" based on this data.

Provide:
1. opportunities: 3-5 opportunities the brand can exploit
2. threats: 3-5 threats from this competitor
3. engagementLevel: low/medium/high/viral
4. comparisonToBrand: brief comparison summary

Output as JSON.`,
        },
        {
          role: "user",
          content: `Competitor: ${competitorName}
Sentiment: ${batchResult.overallSentiment} (score: ${batchResult.averageScore.toFixed(2)})
Top topics: ${[...topics].slice(0, 10).join(", ")}
Strengths: ${strengths.slice(0, 5).join(", ")}
Weaknesses: ${weaknesses.slice(0, 5).join(", ")}`,
        },
      ],
      { temperature: 0.5, maxTokens: 1500 }
    );

    let opportunities: string[] = [];
    let threats: string[] = [];
    let engagementLevel = "medium";
    let comparisonToBrand = "";

    try {
      const jsonMatch = analysisResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.map(String) : [];
        threats = Array.isArray(parsed.threats) ? parsed.threats.map(String) : [];
        engagementLevel = String(parsed.engagementLevel ?? "medium");
        comparisonToBrand = String(parsed.comparisonToBrand ?? "");
      }
    } catch {
      // use defaults
    }

    return {
      competitor: competitorName,
      averageSentiment: batchResult.overallSentiment,
      sentimentScore: batchResult.averageScore,
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
      opportunities,
      threats,
      topTopics: [...topics].slice(0, 10),
      engagementLevel,
      comparisonToBrand,
    };
  }

  private parseSentimentResult(content: string, startTime: number): SentimentResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          label: (parsed.label as SentimentLabel) ?? "neutral",
          score: typeof parsed.score === "number" ? parsed.score : 0,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
          emotions: Array.isArray(parsed.emotions)
            ? (parsed.emotions as Array<Record<string, unknown>>).map((e) => ({
                emotion: String(e.emotion ?? ""),
                score: typeof e.score === "number" ? e.score : 0,
              }))
            : [],
          aspects: Array.isArray(parsed.aspects)
            ? (parsed.aspects as Array<Record<string, unknown>>).map((a) => ({
                aspect: String(a.aspect ?? ""),
                sentiment: (a.sentiment as SentimentLabel) ?? "neutral",
                score: typeof a.score === "number" ? a.score : 0,
                mentions: typeof a.mentions === "number" ? a.mentions : 1,
              }))
            : [],
          keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases.map(String) : [],
          summary: String(parsed.summary ?? ""),
        };
      }
    } catch {
      // fallback
    }

    const lowerContent = content.toLowerCase();
    let label: SentimentLabel = "neutral";
    if (lowerContent.includes("positive")) label = "positive";
    else if (lowerContent.includes("negative")) label = "negative";
    else if (lowerContent.includes("mixed")) label = "mixed";

    return {
      label,
      score: label === "positive" ? 0.5 : label === "negative" ? -0.5 : 0,
      confidence: 0.5,
      emotions: [],
      aspects: [],
      keyPhrases: [],
      summary: content.slice(0, 500),
    };
  }

  private parseTrendResult(content: string): TrendDetectionResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          trends: Array.isArray(parsed.trends)
            ? (parsed.trends as Array<Record<string, unknown>>).map((t) => ({
                name: String(t.name ?? ""),
                direction: (t.direction as TrendDirection) ?? "stable",
                volume: typeof t.volume === "number" ? t.volume : 50,
                growth: typeof t.growth === "number" ? t.growth : 0,
                sentiment: (t.sentiment as SentimentLabel) ?? "neutral",
                relatedKeywords: Array.isArray(t.relatedKeywords) ? t.relatedKeywords.map(String) : [],
                description: String(t.description ?? ""),
                firstSeen: String(t.firstSeen ?? new Date().toISOString()),
                peakTime: typeof t.peakTime === "string" ? t.peakTime : undefined,
              }))
            : [],
          emergingTopics: Array.isArray(parsed.emergingTopics)
            ? (parsed.emergingTopics as Array<Record<string, unknown>>).map((t) => ({
                topic: String(t.topic ?? ""),
                confidence: typeof t.confidence === "number" ? t.confidence : 0.5,
                earlySignals: Array.isArray(t.earlySignals) ? t.earlySignals.map(String) : [],
                predictedImpact: (t.predictedImpact as "high" | "medium" | "low") ?? "medium",
                suggestedAction: String(t.suggestedAction ?? ""),
              }))
            : [],
          sentimentByTrend: (parsed.sentimentByTrend as Record<string, SentimentLabel>) ?? {},
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
        };
      }
    } catch {
      // fallback
    }

    return {
      trends: [],
      emergingTopics: [],
      sentimentByTrend: {},
      recommendations: [],
    };
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
