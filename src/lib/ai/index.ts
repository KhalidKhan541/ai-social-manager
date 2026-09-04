// ---------------------------------------------------------------------------
// AI Content Generation - Barrel Exports
// ---------------------------------------------------------------------------

// Provider
export {
  AIClient,
  AIProviderError,
  getAIClient,
  resetClientForTesting,
  type AIProviderName,
  type AIProviderConfig,
  type ChatMessage,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
  type TokenUsage,
} from "./provider";

// Post Generator
export {
  PostGenerator,
  postGenerator,
  type Platform,
  type Tone,
  type PostGenerationRequest,
  type BrandVoice,
  type GeneratedPost,
  type PostMetadata,
  type ABVariant,
  type GenerateVariationsRequest,
} from "./post-generator";

// Hashtag Generator
export {
  HashtagGenerator,
  hashtagGenerator,
  type HashtagPlatform,
  type HashtagRequest,
  type HashtagSuggestion,
  type HashtagCategory,
  type HashtagBundle,
  type HashtagPerformancePrediction,
  type TrendingHashtag,
  type HashtagSet,
} from "./hashtag-generator";

// Content Calendar
export {
  ContentCalendar,
  contentCalendar,
  type ContentTheme,
  type CalendarRequest,
  type CalendarDay,
  type CalendarPost,
  type ContentMix,
  type BestTimeAnalysis,
  type ContentThemePlan,
  type HolidayContent,
  type HolidayContentIdea,
  type RepurposeSuggestion,
  type BatchGenerationRequest,
  type BatchGenerationResult,
} from "./content-calendar";

// Image Generator
export {
  ImageGenerator,
  imageGenerator,
  type ImageStyle,
  type ImageMood,
  type ImagePromptRequest,
  type ImagePromptResult,
  type StockPhotoResult,
  type StockSource,
  type StockSearchRequest,
  type ImageCaptionRequest,
  type ImageCaptionResult,
  type ImageStyleSuggestion,
  type ImageBatchRequest,
  type ImageBatchResult,
} from "./image-generator";

// Sentiment Analyzer
export {
  SentimentAnalyzer,
  sentimentAnalyzer,
  type SentimentLabel,
  type UrgencyLevel,
  type TrendDirection,
  type SentimentAnalysisRequest,
  type SentimentResult,
  type EmotionScore,
  type AspectSentiment,
  type BrandMentionAnalysis,
  type BrandMention,
  type TrendDetectionResult,
  type Trend,
  type EmergingTopic,
  type CrisisAlert,
  type CompetitorAnalysis,
  type BatchSentimentRequest,
  type BatchSentimentResult,
} from "./sentiment-analyzer";

// Content Optimizer
export {
  ContentOptimizer,
  contentOptimizer,
  type OptimizationGoal,
  type OptimizationRequest,
  type OptimizationResult,
  type OptimizationImprovement,
  type ContentMetrics,
  type PerformancePrediction,
  type PredictionFactor,
  type TimeOptimizationRequest,
  type TimeOptimizationResult,
  type RecommendedTime,
  type LengthOptimizationRequest,
  type LengthOptimizationResult,
  type LengthSuggestion,
  type CTASuggestion,
  type ReadabilityResult,
} from "./content-optimizer";

// Content Repurposer
export {
  ContentRepurposer,
  contentRepurposer,
  type SourceFormat,
  type TargetFormat,
  type RepurposeRequest,
  type RepurposeResult,
  type RepurposeOutput,
  type ContentTransformation,
  type BatchRepurposeRequest,
  type BatchRepurposeResult,
} from "./repurpose";

// Content Templates
export {
  ContentTemplates,
  contentTemplates,
  type TemplateCategory,
  type EngagementType,
  type ContentTemplate,
  type TemplateStructure,
  type TemplateVariable,
  type TemplateExample,
  type GenerateFromTemplateRequest,
  type TemplateGenerationResult,
  type IndustryTemplateSet,
  type CampaignTemplateSet,
  type CampaignTimelineEntry,
  type HolidayTemplateSet,
  type ProductLaunchTemplateSet,
  type LaunchPhase,
} from "./templates";
