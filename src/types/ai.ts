import { BaseEntity, PlatformType, ID, Timestamp } from "./index";

export interface AIRequest extends BaseEntity {
  userId: string;
  type: AIRequestType;
  input: AIRequestInput;
  output?: AIRequestOutput;
  status: AIRequestStatus;
  model: AIModel;
  tokensUsed: number;
  cost: number;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type AIRequestType =
  | "content_generation"
  | "content_improvement"
  | "hashtag_generation"
  | "image_generation"
  | "sentiment_analysis"
  | "translation"
  | "summarization"
  | "content_optimization"
  | "audience_analysis"
  | "trend_analysis";

export interface AIRequestInput {
  prompt?: string;
  context?: string;
  platform?: PlatformType;
  contentType?: string;
  targetAudience?: string;
  tone?: AITone;
  language?: string;
  maxLength?: number;
  keywords?: string[];
  examples?: string[];
  imageDescription?: string;
  style?: string;
}

export interface AIRequestOutput {
  content?: string;
  hashtags?: string[];
  suggestions?: string[];
  sentiment?: AISentiment;
  translation?: string;
  summary?: string;
  image?: AIImageOutput;
  confidence: number;
  alternatives?: string[];
}

export type AIRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  version: string;
  capabilities: AICapability[];
  maxTokens: number;
  costPerToken: number;
}

export type AIProvider = "openai" | "anthropic" | "google" | "mistral";

export type AICapability =
  | "text_generation"
  | "text_analysis"
  | "image_generation"
  | "image_analysis"
  | "translation"
  | "sentiment_analysis";

export type AITone =
  | "professional"
  | "casual"
  | "friendly"
  | "formal"
  | "humorous"
  | "inspirational"
  | "educational"
  | "promotional"
  | "neutral";

export interface AISentiment {
  label: "positive" | "negative" | "neutral";
  score: number;
  confidence: number;
}

export interface AIImageOutput {
  url: string;
  revisedPrompt?: string;
}

export interface AIGenerationRequest {
  type: AIRequestType;
  input: AIRequestInput;
  options?: AIGenerationOptions;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface AIGenerationResponse {
  id: string;
  output: AIRequestOutput;
  tokensUsed: number;
  cost: number;
  duration: number;
  model: string;
}

export interface AIPromptTemplate extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  type: AIRequestType;
  template: string;
  variables: AIPromptVariable[];
  category?: string;
  isPublic: boolean;
  usageCount: number;
  rating?: number;
  tags: string[];
}

export interface AIPromptVariable {
  name: string;
  type: "text" | "number" | "select" | "textarea";
  description?: string;
  defaultValue?: string;
  options?: string[];
  required: boolean;
  maxLength?: number;
}

export interface AIContentSuggestion {
  id: string;
  type: "content" | "hashtag" | "image" | "schedule";
  content: string;
  confidence: number;
  reason?: string;
  platform?: PlatformType;
  metadata?: Record<string, unknown>;
}

export interface AIBatchRequest extends BaseEntity {
  userId: string;
  requests: AIRequest[];
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  totalTokens: number;
  totalCost: number;
  completedCount: number;
  failedCount: number;
}

export interface AITokenUsage extends BaseEntity {
  userId: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  totalTokens: number;
  totalCost: number;
  byType: Record<AIRequestType, AITokenUsageDetail>;
  byModel: Record<string, AITokenUsageDetail>;
  dailyBreakdown: AIDailyUsage[];
}

export interface AITokenUsageDetail {
  tokens: number;
  cost: number;
  requests: number;
}

export interface AIDailyUsage {
  date: Timestamp;
  tokens: number;
  cost: number;
  requests: number;
}

export interface AIUsageLimit {
  userId: string;
  plan: string;
  monthlyLimit: number;
  used: number;
  remaining: number;
  resetDate: Timestamp;
}

export interface AIContentAnalysis {
  readability: {
    score: number;
    level: string;
    suggestions: string[];
  };
  seo: {
    score: number;
    keywords: string[];
    suggestions: string[];
  };
  engagement: {
    score: number;
    factors: string[];
    suggestions: string[];
  };
  sentiment: AISentiment;
  tone: AITone;
  wordCount: number;
  readingTime: number;
}

export interface AICompetitorAnalysis {
  competitorId: string;
  name: string;
  platform: PlatformType;
  contentStrategy: {
    postFrequency: number;
    avgEngagement: number;
    topContent: string[];
    hashtags: string[];
  };
  audience: {
    size: number;
    growth: number;
    demographics: Record<string, number>;
  };
  recommendations: string[];
}

export interface AITrendAnalysis {
  topic: string;
  volume: number;
  trend: "rising" | "stable" | "declining";
  sentiment: AISentiment;
  relatedTopics: string[];
  bestTimeToPost: {
    dayOfWeek: number;
    hour: number;
  };
  suggestedContent: string[];
}

export interface AIScheduleRecommendation {
  platform: PlatformType;
  dayOfWeek: number;
  hour: number;
  expectedEngagement: number;
  confidence: number;
  reason: string;
}

export interface AIContentOptimization {
  originalContent: string;
  optimizedContent: string;
  changes: AIContentChange[];
  expectedImprovement: {
    engagement: number;
    reach: number;
  };
}

export interface AIContentChange {
  type: "addition" | "deletion" | "modification";
  original: string;
  suggested: string;
  reason: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    version: "4.0",
    capabilities: ["text_generation", "text_analysis", "translation", "sentiment_analysis"],
    maxTokens: 8192,
    costPerToken: 0.00003,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    version: "4.0-turbo",
    capabilities: ["text_generation", "text_analysis", "translation", "sentiment_analysis"],
    maxTokens: 128000,
    costPerToken: 0.00001,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    version: "3.5-turbo",
    capabilities: ["text_generation", "text_analysis", "translation", "sentiment_analysis"],
    maxTokens: 16385,
    costPerToken: 0.0000015,
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "anthropic",
    version: "3.0-opus",
    capabilities: ["text_generation", "text_analysis", "translation", "sentiment_analysis"],
    maxTokens: 200000,
    costPerToken: 0.000015,
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    version: "3.0-sonnet",
    capabilities: ["text_generation", "text_analysis", "translation", "sentiment_analysis"],
    maxTokens: 200000,
    costPerToken: 0.000003,
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    version: "3.0",
    capabilities: ["image_generation"],
    maxTokens: 4000,
    costPerToken: 0,
  },
];

export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}

export function getModelsByCapability(capability: AICapability): AIModel[] {
  return AI_MODELS.filter((m) => m.capabilities.includes(capability));
}

export function estimateTokenCost(model: AIModel, tokens: number): number {
  return tokens * model.costPerToken;
}

export function estimateContentTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
