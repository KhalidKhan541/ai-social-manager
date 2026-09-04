import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageStyle =
  | "photorealistic"
  | "illustration"
  | "flat-design"
  | "3d-render"
  | "watercolor"
  | "pixel-art"
  | "minimalist"
  | "vintage"
  | "neon"
  | "abstract"
  | "corporate"
  | "social-media";

export type ImageMood =
  | "professional"
  | "playful"
  | "elegant"
  | "bold"
  | "calm"
  | "energetic"
  | "mysterious"
  | "warm"
  | "cool"
  | "nostalgic";

export interface ImagePromptRequest {
  topic: string;
  platform: string;
  style?: ImageStyle;
  mood?: ImageMood;
  brandColors?: string[];
  includeText?: boolean;
  textOverlay?: string;
  dimensions?: { width: number; height: number };
  negativePrompt?: string;
  additionalContext?: string;
}

export interface ImagePromptResult {
  prompt: string;
  negativePrompt: string;
  style: ImageStyle;
  mood: ImageMood;
  suggestedDimensions: { width: number; height: number };
  estimatedTokens: number;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  generatedAt: string;
  model: string;
  provider: string;
  generationTimeMs: number;
}

export interface StockPhotoResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  photographer: string;
  source: StockSource;
  tags: string[];
  width: number;
  height: number;
  color?: string;
  downloadUrl: string;
}

export type StockSource = "unsplash" | "pexels" | "pixabay" | "shutterstock" | "adobe";

export interface StockSearchRequest {
  query: string;
  source?: StockSource;
  count?: number;
  orientation?: "landscape" | "portrait" | "squarish";
  minWidth?: number;
  minHeight?: number;
  color?: string;
}

export interface ImageCaptionRequest {
  imageUrl?: string;
  imageDescription: string;
  platform: string;
  tone?: string;
  brandName?: string;
  includeEmojis?: boolean;
}

export interface ImageCaptionResult {
  caption: string;
  altText: string;
  hashtags: string[];
  accessibilityDescription: string;
}

export interface ImageStyleSuggestion {
  style: ImageStyle;
  description: string;
  bestFor: string[];
  examples: string[];
  colorPalette: string[];
}

export interface ImageBatchRequest {
  topics: string[];
  platform: string;
  style?: ImageStyle;
  mood?: ImageMood;
  brandColors?: string[];
}

export interface ImageBatchResult {
  prompts: ImagePromptResult[];
  totalTokens: number;
  generationTimeMs: number;
}

// ---------------------------------------------------------------------------
// Platform dimension presets
// ---------------------------------------------------------------------------

const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number; label: string }[]> = {
  instagram: [
    { width: 1080, height: 1080, label: "Square post" },
    { width: 1080, height: 1350, label: "Portrait post" },
    { width: 1080, height: 1920, label: "Story/Reel" },
    { width: 1080, height: 566, label: "Landscape post" },
  ],
  twitter: [
    { width: 1600, height: 900, label: "Tweet image" },
    { width: 1200, height: 675, label: "Landscape tweet" },
    { width: 1080, height: 1080, label: "Square tweet" },
  ],
  linkedin: [
    { width: 1200, height: 627, label: "Link preview" },
    { width: 1200, height: 1200, label: "Square post" },
    { width: 1080, height: 1920, label: "Story" },
  ],
  facebook: [
    { width: 1200, height: 630, label: "Link share" },
    { width: 1080, height: 1080, label: "Square post" },
    { width: 1200, height: 628, label: "Landscape post" },
  ],
  pinterest: [
    { width: 1000, height: 1500, label: "Standard pin" },
    { width: 1000, height: 1000, label: "Square pin" },
    { width: 1000, height: 2100, label: "Long pin" },
  ],
  tiktok: [
    { width: 1080, height: 1920, label: "Video cover" },
    { width: 1080, height: 1350, label: "Post image" },
  ],
  youtube: [
    { width: 1280, height: 720, label: "Thumbnail" },
    { width: 1280, height: 720, label: "Banner" },
  ],
  threads: [
    { width: 1080, height: 1080, label: "Square post" },
    { width: 1080, height: 1350, label: "Portrait post" },
  ],
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ImagePromptRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.string().min(1),
  style: z.enum(["photorealistic", "illustration", "flat-design", "3d-render", "watercolor", "pixel-art", "minimalist", "vintage", "neon", "abstract", "corporate", "social-media"]).default("social-media"),
  mood: z.enum(["professional", "playful", "elegant", "bold", "calm", "energetic", "mysterious", "warm", "cool", "nostalgic"]).default("professional"),
  brandColors: z.array(z.string()).optional(),
  includeText: z.boolean().default(false),
  textOverlay: z.string().optional(),
  dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  negativePrompt: z.string().optional(),
  additionalContext: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Style descriptions
// ---------------------------------------------------------------------------

const STYLE_DESCRIPTIONS: Record<ImageStyle, string> = {
  photorealistic: "High-quality photographic style with realistic lighting, textures, and details",
  illustration: "Hand-drawn or digital illustration style with artistic flair",
  "flat-design": "Clean, flat design with solid colors and simple shapes",
  "3d-render": "Three-dimensional rendered imagery with depth and lighting",
  watercolor: "Soft watercolor painting style with flowing colors and textures",
  "pixel-art": "Retro pixel art style with limited color palette",
  minimalist: "Minimalist design with lots of whitespace and simple elements",
  vintage: "Vintage or retro aesthetic with aged textures and warm tones",
  neon: "Neon-lit cyberpunk aesthetic with vibrant glowing colors",
  abstract: "Abstract artistic representation with geometric or organic shapes",
  corporate: "Professional corporate imagery with clean, business-appropriate aesthetics",
  "social-media": "Eye-catching social media optimized design with bold colors and clear focal point",
};

const MOOD_PALETTES: Record<ImageMood, string[]> = {
  professional: ["#1E3A5F", "#4A90D9", "#FFFFFF", "#F5F5F5", "#333333"],
  playful: ["#FF6B6B", "#FFE66D", "#4ECDC4", "#45B7D1", "#96CEB4"],
  elegant: ["#2C2C2C", "#D4AF37", "#F5F5F5", "#8B7355", "#C0C0C0"],
  bold: ["#FF0000", "#000000", "#FFFFFF", "#FFD700", "#FF4500"],
  calm: ["#87CEEB", "#98D8C8", "#F7DC6F", "#BB8FCE", "#AED6F1"],
  energetic: ["#FF6F00", "#FF1744", "#FFD600", "#00E676", "#2979FF"],
  mysterious: ["#1A1A2E", "#16213E", "#0F3460", "#533483", "#E94560"],
  warm: ["#FF8C00", "#FFD700", "#FF6347", "#FFA07A", "#FFB347"],
  cool: ["#00B4D8", "#0077B6", "#023E8A", "#48CAE4", "#90E0EF"],
  nostalgic: ["#DEB887", "#D2B48C", "#C4A484", "#A0522D", "#CD853F"],
};

// ---------------------------------------------------------------------------
// ImageGenerator
// ---------------------------------------------------------------------------

export class ImageGenerator {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generatePrompt(request: ImagePromptRequest): Promise<ImagePromptResult> {
    const validated = ImagePromptRequestSchema.parse(request);
    const startTime = Date.now();

    const dimensions = validated.dimensions ??
      PLATFORM_DIMENSIONS[validated.platform]?.[0] ?? { width: 1080, height: 1080 };

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are an expert AI image prompt engineer. Create detailed, effective prompts for AI image generation (DALL-E, Midjourney, Stable Diffusion).

Create a comprehensive image prompt that:
1. Is highly detailed and specific
2. Includes composition instructions
3. Specifies lighting and atmosphere
4. Includes relevant artistic style
5. Is optimized for the platform (${validated.platform})

STYLE: ${STYLE_DESCRIPTIONS[validated.style]}
MOOD: ${validated.mood}
${validated.brandColors?.length ? `BRAND COLORS: ${validated.brandColors.join(", ")}` : ""}
${validated.includeText ? `TEXT OVERLAY: "${validated.textOverlay ?? validated.topic}"` : "No text overlay"}

Also create a negative prompt to avoid unwanted elements.

Output as JSON:
{
  "prompt": "the main prompt",
  "negativePrompt": "elements to avoid"
}`,
        },
        {
          role: "user",
          content: `Create an image prompt for: ${validated.topic}\nPlatform: ${validated.platform}\nDimensions: ${dimensions.width}x${dimensions.height}${validated.additionalContext ? `\nContext: ${validated.additionalContext}` : ""}`,
        },
      ],
      { temperature: 0.8, maxTokens: 2000 }
    );

    let prompt = "";
    let negativePrompt = validated.negativePrompt ?? "blurry, low quality, distorted, watermark, text";

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        prompt = String(parsed.prompt ?? "");
        negativePrompt = String(parsed.negativePrompt ?? negativePrompt);
      }
    } catch {
      prompt = result.content.trim();
    }

    if (!prompt) {
      prompt = this.buildFallbackPrompt(validated, dimensions);
    }

    return {
      prompt,
      negativePrompt,
      style: validated.style,
      mood: validated.mood,
      suggestedDimensions: dimensions,
      estimatedTokens: result.usage.totalTokens,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: result.model,
        provider: result.provider,
        generationTimeMs: Date.now() - startTime,
      },
    };
  }

  async searchStockPhotos(request: StockSearchRequest): Promise<StockPhotoResult[]> {
    const source = request.source ?? "unsplash";
    const count = Math.min(request.count ?? 10, 30);

    const queries: StockSource[] = ["unsplash", "pexels", "pixabay"];
    if (!queries.includes(source)) {
      queries.push(source);
    }

    const results: StockPhotoResult[] = [];

    const searchQuery = `${request.query} ${request.orientation ?? ""}`.trim();

    if (source === "unsplash" || source === "pexels") {
      const endpoint = source === "unsplash"
        ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=${count}${request.orientation ? `&orientation=${request.orientation}` : ""}`
        : `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${count}${request.orientation ? `&orientation=${request.orientation}` : ""}`;

      try {
        const headers: Record<string, string> = {};
        if (source === "unsplash") {
          headers.Authorization = `Client-ID ${process.env.UNSPLASH_ACCESS_KEY ?? ""}`;
        } else {
          headers.Authorization = process.env.PEXELS_API_KEY ?? "";
        }

        const res = await fetch(endpoint, { headers });
        if (res.ok) {
          const data = (await res.json()) as UnsplashResponse | PexelsResponse;

          const photos = "results" in data ? data.results : data.photos;
          for (const photo of photos.slice(0, count)) {
            const urls = "urls" in photo ? photo.urls : photo.src;
            results.push({
              id: String(photo.id),
              url: urls.regular ?? urls.medium ?? "",
              thumbnailUrl: urls.thumb ?? urls.small ?? "",
              description: photo.alt_description ?? photo.alt ?? "",
              photographer: photo.user?.name ?? "Unknown",
              source,
              tags: [],
              width: photo.width ?? 0,
              height: photo.height ?? 0,
              color: photo.color ?? undefined,
              downloadUrl: urls.full ?? urls.original ?? "",
            });
          }
        }
      } catch {
        // API not configured or failed - return AI-generated suggestions instead
      }
    }

    if (results.length === 0) {
      return this.generateStockSuggestions(request);
    }

    return results;
  }

  async generateCaption(request: ImageCaptionRequest): Promise<ImageCaptionResult> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are an expert social media content writer. Create engaging captions and alt text for images.

Platform: ${request.platform}
${request.tone ? `Tone: ${request.tone}` : "Tone: professional"}
${request.brandName ? `Brand: ${request.brandName}` : ""}
${request.includeEmojis !== false ? "Include emojis naturally in the caption" : "Do not include emojis"}

Provide:
1. caption: Engaging social media caption
2. altText: Descriptive alt text for accessibility (125 chars max)
3. hashtags: Relevant hashtags
4. accessibilityDescription: Detailed description for screen readers

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create a caption for this image:\nDescription: ${request.imageDescription}${request.imageUrl ? `\nURL: ${request.imageUrl}` : ""}`,
        },
      ],
      { temperature: 0.7, maxTokens: 1500 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return {
          caption: String(parsed.caption ?? ""),
          altText: String(parsed.altText ?? request.imageDescription).slice(0, 125),
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
          accessibilityDescription: String(parsed.accessibilityDescription ?? request.imageDescription),
        };
      }
    } catch {
      // fallback
    }

    return {
      caption: result.content.trim(),
      altText: request.imageDescription.slice(0, 125),
      hashtags: [],
      accessibilityDescription: request.imageDescription,
    };
  }

  async suggestStyles(topic: string, platform: string): Promise<ImageStyleSuggestion[]> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a visual design expert. Suggest the best image styles for a social media post.

Return a JSON array of 4 style suggestions, each with:
- style: one of ${Object.keys(STYLE_DESCRIPTIONS).join(", ")}
- description: why this style works
- bestFor: array of scenarios this style is best for
- examples: array of 2 example use cases
- colorPalette: array of 5 hex colors that work well

Consider the platform (${platform}) and topic.`,
        },
        {
          role: "user",
          content: `Suggest image styles for a ${platform} post about: ${topic}`,
        },
      ],
      { temperature: 0.7, maxTokens: 2000 }
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        return parsed.map((item) => ({
          style: (item.style as ImageStyle) ?? "social-media",
          description: String(item.description ?? ""),
          bestFor: Array.isArray(item.bestFor) ? item.bestFor.map(String) : [],
          examples: Array.isArray(item.examples) ? item.examples.map(String) : [],
          colorPalette: Array.isArray(item.colorPalette) ? item.colorPalette.map(String) : MOOD_PALETTES.professional,
        }));
      }
    } catch {
      // fallback
    }

    return this.getDefaultStyles();
  }

  async batchGenerate(request: ImageBatchRequest): Promise<ImageBatchResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    const prompts: ImagePromptResult[] = [];

    for (const topic of request.topics) {
      const promptResult = await this.generatePrompt({
        topic,
        platform: request.platform,
        style: request.style,
        mood: request.mood,
        brandColors: request.brandColors,
      });
      totalTokens += promptResult.estimatedTokens;
      prompts.push(promptResult);
    }

    return {
      prompts,
      totalTokens,
      generationTimeMs: Date.now() - startTime,
    };
  }

  async generateAltText(imageDescription: string): Promise<string> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Generate a concise, descriptive alt text for an image. The alt text should:
- Be under 125 characters
- Describe the key visual elements
- Be useful for screen reader users
- Not start with "Image of" or "Photo of"
- Convey the mood and purpose

Return ONLY the alt text string, nothing else.`,
        },
        { role: "user", content: `Generate alt text for: ${imageDescription}` },
      ],
      { temperature: 0.5, maxTokens: 200 }
    );

    return result.content.trim().slice(0, 125);
  }

  private buildFallbackPrompt(
    request: ImagePromptRequest,
    dimensions: { width: number; height: number }
  ): string {
    const styleDesc = STYLE_DESCRIPTIONS[request.style];
    const moodColors = MOOD_PALETTES[request.mood].join(", ");

    let prompt = `${request.topic}, ${styleDesc}, ${request.mood} mood, `;
    prompt += `color palette: ${moodColors}, `;
    prompt += `optimized for ${request.platform}, `;
    prompt += `${dimensions.width}x${dimensions.height} aspect ratio, `;
    prompt += `high quality, professional, engaging`;

    if (request.brandColors?.length) {
      prompt += `, brand colors: ${request.brandColors.join(", ")}`;
    }
    if (request.includeText && request.textOverlay) {
      prompt += `, text overlay: "${request.textOverlay}"`;
    }

    return prompt;
  }

  private generateStockSuggestions(request: StockSearchRequest): StockPhotoResult[] {
    const suggestions: StockPhotoResult[] = [];
    const keywords = request.query.split(/\s+/).slice(0, 3);

    for (let i = 0; i < (request.count ?? 5); i++) {
      suggestions.push({
        id: `suggestion-${i + 1}`,
        url: `https://source.unsplash.com/featured/1080x1080/?${keywords.join(",")}`,
        thumbnailUrl: `https://source.unsplash.com/featured/200x200/?${keywords.join(",")}`,
        description: `${request.query} - Stock photo suggestion`,
        photographer: "Various",
        source: "unsplash",
        tags: keywords,
        width: request.minWidth ?? 1080,
        height: request.minHeight ?? 1080,
        downloadUrl: `https://source.unsplash.com/featured/${request.minWidth ?? 1080}x${request.minHeight ?? 1080}/?${keywords.join(",")}`,
      });
    }

    return suggestions;
  }

  private getDefaultStyles(): ImageStyleSuggestion[] {
    return [
      {
        style: "social-media",
        description: "Bold, eye-catching design optimized for social media feeds",
        bestFor: ["Product launches", "Announcements", "Promotions"],
        examples: ["Sale announcement", "New product reveal"],
        colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
      },
      {
        style: "photorealistic",
        description: "High-quality photographic style for authentic feel",
        bestFor: ["Behind-the-scenes", "Team content", "Testimonials"],
        examples: ["Office culture post", "Customer story"],
        colorPalette: ["#2C3E50", "#3498DB", "#ECF0F1", "#E74C3C", "#1ABC9C"],
      },
      {
        style: "minimalist",
        description: "Clean, simple design with lots of whitespace",
        bestFor: ["Quote posts", "Tips", "Announcements"],
        examples: ["Motivational quote", "Quick tip"],
        colorPalette: ["#FFFFFF", "#000000", "#F5F5F5", "#333333", "#FF0000"],
      },
      {
        style: "flat-design",
        description: "Modern flat design with solid colors and simple shapes",
        bestFor: ["Infographics", "How-to guides", "Data visualization"],
        examples: ["Industry stats", "Step-by-step guide"],
        colorPalette: ["#3498DB", "#E74C3C", "#2ECC71", "#F39C12", "#9B59B6"],
      },
    ];
  }
}

export const imageGenerator = new ImageGenerator();

// ---------------------------------------------------------------------------
// Internal API response types
// ---------------------------------------------------------------------------

interface UnsplashResponse {
  results: Array<{
    id: string;
    urls: { thumb: string; small: string; regular: string; full: string; original: string };
    alt_description: string | null;
    color: string | null;
    width: number;
    height: number;
    user: { name: string };
  }>;
}

interface PexelsResponse {
  photos: Array<{
    id: string;
    src: { thumb: string; small: string; medium: string; large: string; original: string };
    alt: string | null;
    width: number;
    height: number;
    photographer: string;
    user?: { name: string };
  }>;
}
