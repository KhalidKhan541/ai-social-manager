import { z } from "zod";
import { type AIClient, type ChatMessage, getAIClient } from "./provider";
import { type Platform, type Tone } from "./post-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateCategory =
  | "industry"
  | "campaign"
  | "holiday"
  | "product-launch"
  | "engagement"
  | "educational"
  | "promotional"
  | "community"
  | "seasonal"
  | "custom";

export type EngagementType =
  | "poll"
  | "question"
  | "cta"
  | "contest"
  | "giveaway"
  | "behind-the-scenes"
  | "user-spotlight"
  | "testimonial"
  | "before-after"
  | "how-to";

export interface ContentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  platforms: Platform[];
  tone: Tone;
  structure: TemplateStructure;
  variables: TemplateVariable[];
  examples: TemplateExample[];
  tags: string[];
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStructure {
  hook: string;
  body: string[];
  cta: string;
  hashtags?: string;
  format: string;
  maxLength?: number;
}

export interface TemplateVariable {
  name: string;
  type: "text" | "number" | "boolean" | "select" | "date";
  label: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export interface TemplateExample {
  variables: Record<string, string>;
  output: string;
  platform: Platform;
}

export interface GenerateFromTemplateRequest {
  templateId: string;
  variables: Record<string, string>;
  platform?: Platform;
  additionalInstructions?: string;
}

export interface TemplateGenerationResult {
  content: string;
  hashtags: string[];
  emojis: string[];
  metadata: {
    templateId: string;
    platform: Platform;
    generatedAt: string;
    tokensUsed: number;
  };
}

export interface IndustryTemplateSet {
  industry: string;
  templates: ContentTemplate[];
  recommendedMix: { category: TemplateCategory; percentage: number }[];
}

export interface CampaignTemplateSet {
  campaignType: string;
  templates: ContentTemplate[];
  timeline: CampaignTimelineEntry[];
}

export interface CampaignTimelineEntry {
  day: number;
  phase: string;
  templateId: string;
  platform: Platform;
  objective: string;
}

export interface HolidayTemplateSet {
  holiday: string;
  date: string;
  templates: ContentTemplate[];
  contentCalendar: { date: string; templateId: string; platform: Platform }[];
}

export interface ProductLaunchTemplateSet {
  product: string;
  phases: LaunchPhase[];
}

export interface LaunchPhase {
  name: string;
  days: string;
  templates: ContentTemplate[];
  objectives: string[];
}

// ---------------------------------------------------------------------------
// Pre-built templates
// ---------------------------------------------------------------------------

const BUILTIN_TEMPLATES: ContentTemplate[] = [
  {
    id: "engagement-poll",
    name: "Engagement Poll",
    category: "engagement",
    description: "Create an interactive poll to drive engagement",
    platforms: ["twitter", "linkedin", "instagram"],
    tone: "casual",
    structure: {
      hook: "{{question}}",
      body: ["Pick one below!", "Drop your answer in the comments!"],
      cta: "Vote now!",
      format: "poll",
    },
    variables: [
      { name: "question", type: "text", label: "Poll Question", description: "The main question", required: true, placeholder: "What's your biggest challenge with..." },
      { name: "option1", type: "text", label: "Option 1", description: "First poll option", required: true },
      { name: "option2", type: "text", label: "Option 2", description: "Second poll option", required: true },
      { name: "option3", type: "text", label: "Option 3", description: "Third poll option", required: false },
    ],
    examples: [
      {
        variables: { question: "What's your biggest marketing challenge?", option1: "Content creation", option2: "Lead generation", option3: "Analytics" },
        output: "What's your biggest marketing challenge?\n\nPick one below!\n\nA) Content creation\nB) Lead generation\nC) Analytics\n\nVote now!",
        platform: "twitter",
      },
    ],
    tags: ["engagement", "poll", "interactive"],
    usageCount: 0,
    rating: 4.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "engagement-question",
    name: "Engagement Question",
    category: "engagement",
    description: "Ask a thought-provoking question to spark discussion",
    platforms: ["twitter", "linkedin", "instagram", "facebook", "threads"],
    tone: "casual",
    structure: {
      hook: "{{question}}",
      body: ["Here's my take: {{yourAnswer}}", "But I'd love to hear from you!"],
      cta: "{{ctaText}}",
      format: "discussion",
    },
    variables: [
      { name: "question", type: "text", label: "Question", description: "The engaging question", required: true },
      { name: "yourAnswer", type: "text", label: "Your Answer", description: "Your perspective", required: false },
      { name: "ctaText", type: "text", label: "CTA", description: "Call to action", required: false, defaultValue: "What do you think? Share below!" },
    ],
    examples: [
      {
        variables: { question: "What's one tool you can't live without?", yourAnswer: "Notion for project management", ctaText: "Drop yours below!" },
        output: "What's one tool you can't live without?\n\nHere's my take: Notion for project management\nBut I'd love to hear from you!\n\nDrop yours below!",
        platform: "linkedin",
      },
    ],
    tags: ["engagement", "question", "discussion"],
    usageCount: 0,
    rating: 4.3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edu-tip",
    name: "Educational Tip",
    category: "educational",
    description: "Share a valuable tip or insight",
    platforms: ["linkedin", "twitter", "instagram", "facebook"],
    tone: "educational",
    structure: {
      hook: "{{tip}}",
      body: ["Here's why this matters: {{explanation}}", "Pro tip: {{proTip}}"],
      cta: "Save this for later!",
      format: "tip",
    },
    variables: [
      { name: "tip", type: "text", label: "The Tip", description: "Main educational tip", required: true },
      { name: "explanation", type: "text", label: "Explanation", description: "Why it matters", required: true },
      { name: "proTip", type: "text", label: "Pro Tip", description: "Advanced insight", required: false },
    ],
    examples: [
      {
        variables: { tip: "Always A/B test your email subject lines", explanation: "A 5% improvement in open rates can mean thousands more readers", proTip: "Try using numbers and questions" },
        output: "Always A/B test your email subject lines\n\nHere's why this matters: A 5% improvement in open rates can mean thousands more readers\n\nPro tip: Try using numbers and questions\n\nSave this for later!",
        platform: "linkedin",
      },
    ],
    tags: ["educational", "tips", "value"],
    usageCount: 0,
    rating: 4.7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "promo-announcement",
    name: "Promotional Announcement",
    category: "promotional",
    description: "Announce a product, feature, or offer",
    platforms: ["twitter", "linkedin", "instagram", "facebook"],
    tone: "promotional",
    structure: {
      hook: "{{announcement}}",
      body: ["{{details}}", "{{benefits}}"],
      cta: "{{ctaText}}",
      hashtags: "{{hashtags}}",
      format: "announcement",
    },
    variables: [
      { name: "announcement", type: "text", label: "Announcement", description: "What you're announcing", required: true },
      { name: "details", type: "text", label: "Details", description: "Key details", required: true },
      { name: "benefits", type: "text", label: "Benefits", description: "Key benefits", required: false },
      { name: "ctaText", type: "text", label: "CTA", description: "Call to action", required: true },
      { name: "hashtags", type: "text", label: "Hashtags", description: "Relevant hashtags", required: false },
    ],
    examples: [
      {
        variables: { announcement: "Introducing our new AI-powered analytics dashboard!", details: "Real-time insights, custom reports, and AI-driven recommendations.", benefits: "Save 10 hours per week on reporting.", ctaText: "Try it free for 14 days!", hashtags: "#analytics #AI #productivity" },
        output: "Introducing our new AI-powered analytics dashboard!\n\nReal-time insights, custom reports, and AI-driven recommendations.\n\nSave 10 hours per week on reporting.\n\nTry it free for 14 days!\n\n#analytics #AI #productivity",
        platform: "linkedin",
      },
    ],
    tags: ["promotional", "announcement", "product"],
    usageCount: 0,
    rating: 4.4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bts-content",
    name: "Behind the Scenes",
    category: "community",
    description: "Share behind-the-scenes content to build connection",
    platforms: ["instagram", "linkedin", "facebook", "tiktok"],
    tone: "casual",
    structure: {
      hook: "{{btsHook}}",
      body: ["Here's what really goes into {{process}}:", "{{insight}}"],
      cta: "What would you like to see next?",
      format: "story",
    },
    variables: [
      { name: "btsHook", type: "text", label: "Hook", description: "Opening hook", required: true },
      { name: "process", type: "text", label: "Process", description: "What you're showing BTS of", required: true },
      { name: "insight", type: "text", label: "Insight", description: "Key insight or lesson", required: true },
    ],
    examples: [
      {
        variables: { btsHook: "Ever wonder how we create our content?", process: "a viral social media post", insight: "It takes 3 hours of research, 1 hour of writing, and 30 minutes of editing for a single post." },
        output: "Ever wonder how we create our content?\n\nHere's what really goes into a viral social media post:\n\nIt takes 3 hours of research, 1 hour of writing, and 30 minutes of editing for a single post.\n\nWhat would you like to see next?",
        platform: "instagram",
      },
    ],
    tags: ["community", "behind-the-scenes", "authentic"],
    usageCount: 0,
    rating: 4.6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "testimonial-share",
    name: "Testimonial Share",
    category: "promotional",
    description: "Share customer testimonials or success stories",
    platforms: ["linkedin", "instagram", "facebook", "twitter"],
    tone: "inspirational",
    structure: {
      hook: "{{customerQuote}}",
      body: ["— {{customerName}}, {{customerTitle}}", "{{context}}", "{{result}}"],
      cta: "Ready to achieve similar results? {{ctaText}}",
      format: "testimonial",
    },
    variables: [
      { name: "customerQuote", type: "text", label: "Customer Quote", description: "The testimonial quote", required: true },
      { name: "customerName", type: "text", label: "Customer Name", description: "Customer's name", required: true },
      { name: "customerTitle", type: "text", label: "Customer Title", description: "Customer's title/company", required: false },
      { name: "context", type: "text", label: "Context", description: "Context of the testimonial", required: false },
      { name: "result", type: "text", label: "Result", description: "Results achieved", required: false },
      { name: "ctaText", type: "text", label: "CTA", description: "Call to action", required: false, defaultValue: "Learn more at our website" },
    ],
    examples: [
      {
        variables: { customerQuote: "This tool increased our team's productivity by 40%", customerName: "Sarah Chen", customerTitle: "VP of Marketing, TechCo", context: "After switching from manual reporting", result: "3 months, 40% productivity increase, $50K saved", ctaText: "Book a demo" },
        output: '"This tool increased our team\'s productivity by 40%"\n\n— Sarah Chen, VP of Marketing, TechCo\n\nAfter switching from manual reporting\n\n3 months, 40% productivity increase, $50K saved\n\nReady to achieve similar results? Book a demo',
        platform: "linkedin",
      },
    ],
    tags: ["testimonial", "social-proof", "case-study"],
    usageCount: 0,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "how-to-guide",
    name: "How-To Guide",
    category: "educational",
    description: "Step-by-step guide or tutorial",
    platforms: ["linkedin", "instagram", "twitter", "facebook"],
    tone: "educational",
    structure: {
      hook: "How to {{topic}}:",
      body: ["Step 1: {{step1}}", "Step 2: {{step2}}", "Step 3: {{step3}}"],
      cta: "Save this for later and try it out!",
      format: "list",
    },
    variables: [
      { name: "topic", type: "text", label: "Topic", description: "What the how-to is about", required: true },
      { name: "step1", type: "text", label: "Step 1", description: "First step", required: true },
      { name: "step2", type: "text", label: "Step 2", description: "Second step", required: true },
      { name: "step3", type: "text", label: "Step 3", description: "Third step", required: true },
    ],
    examples: [
      {
        variables: { topic: "write better social media captions", step1: "Hook them in the first line", step2: "Add value or tell a story", step3: "End with a clear CTA" },
        output: "How to write better social media captions:\n\nStep 1: Hook them in the first line\nStep 2: Add value or tell a story\nStep 3: End with a clear CTA\n\nSave this for later and try it out!",
        platform: "linkedin",
      },
    ],
    tags: ["educational", "how-to", "tutorial"],
    usageCount: 0,
    rating: 4.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const GenerateFromTemplateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.string()),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok", "threads", "pinterest", "youtube"]).optional(),
  additionalInstructions: z.string().optional(),
});

// ---------------------------------------------------------------------------
// ContentTemplates
// ---------------------------------------------------------------------------

export class ContentTemplates {
  private client: AIClient;
  private customTemplates: Map<string, ContentTemplate> = new Map();

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
    for (const template of BUILTIN_TEMPLATES) {
      this.customTemplates.set(template.id, template);
    }
  }

  getTemplate(id: string): ContentTemplate | undefined {
    return this.customTemplates.get(id);
  }

  listTemplates(category?: TemplateCategory, platform?: Platform): ContentTemplate[] {
    let templates = [...this.customTemplates.values()];
    if (category) templates = templates.filter((t) => t.category === category);
    if (platform) templates = templates.filter((t) => t.platforms.includes(platform));
    return templates;
  }

  async generateFromTemplate(request: GenerateFromTemplateRequest): Promise<TemplateGenerationResult> {
    const validated = GenerateFromTemplateSchema.parse(request);
    const template = this.customTemplates.get(validated.templateId);

    if (!template) {
      throw new Error(`Template "${validated.templateId}" not found`);
    }

    const platform = validated.platform ?? template.platforms[0]!;
    let content = this.fillTemplate(template.structure, validated.variables);

    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media content writer. Take this template-based content and make it engaging, natural, and platform-optimized for ${platform}.

Original template output:
"${content}"

Improve it by:
1. Making it sound natural (not templated)
2. Optimizing for ${platform}
3. Adding personality and flair
4. Keeping the core message
5. Ensuring it flows well

${template.tone ? `Tone: ${template.tone}` : ""}
${validated.additionalInstructions ? `Additional instructions: ${validated.additionalInstructions}` : ""}

Output ONLY the improved content. No quotes or wrappers.`,
        },
        { role: "user", content: `Improve this template content:\n\n${content}` },
      ],
      { temperature: 0.7, maxTokens: 2000 }
    );

    const improvedContent = result.content.trim().replace(/^["']|["']$/g, "");

    const hashtags = (improvedContent.match(/#[\w\u0400-\u04FF]+/g) ?? []).map((h) => h.toLowerCase());
    const emojis = (improvedContent.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) ?? []);

    template.usageCount++;

    return {
      content: improvedContent,
      hashtags,
      emojis,
      metadata: {
        templateId: validated.templateId,
        platform,
        generatedAt: new Date().toISOString(),
        tokensUsed: result.usage.totalTokens,
      },
    };
  }

  async getIndustryTemplates(industry: string): Promise<IndustryTemplateSet> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `You are a social media strategist specializing in ${industry} industry.

Create 5-7 content templates specifically for ${industry} businesses. Each template should have:
- name: template name
- category: one of industry/campaign/holiday/product-launch/engagement/educational/promotional/community
- description: what the template does
- platforms: which platforms it works best for
- tone: recommended tone
- structure: { hook, body (array), cta, format }
- variables: array of { name, type, label, description, required }
- tags: relevant tags

Also provide recommended content mix:
- category: the content category
- percentage: what percentage of content should be this type

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create content templates for the ${industry} industry`,
        },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const templates = Array.isArray(parsed.templates)
          ? (parsed.templates as Array<Record<string, unknown>>).map((t) => this.parseTemplateObject(t))
          : [];

        for (const template of templates) {
          this.customTemplates.set(template.id, template);
        }

        return {
          industry,
          templates,
          recommendedMix: Array.isArray(parsed.recommendedMix)
            ? (parsed.recommendedMix as Array<Record<string, unknown>>).map((m) => ({
                category: (m.category as TemplateCategory) ?? "educational",
                percentage: typeof m.percentage === "number" ? m.percentage : 20,
              }))
            : [],
        };
      }
    } catch {
      // fallback
    }

    return { industry, templates: [], recommendedMix: [] };
  }

  async getCampaignTemplates(campaignType: string): Promise<CampaignTemplateSet> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Create a complete campaign template set for a "${campaignType}" campaign.

Provide:
1. templates: 5-7 templates for different campaign phases
2. timeline: day-by-day posting schedule with template assignments

Each template should follow the ContentTemplate structure.
Timeline should cover a 7-14 day campaign.

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create campaign templates for: ${campaignType}`,
        },
      ],
      { temperature: 0.7, maxTokens: 5000 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const templates = Array.isArray(parsed.templates)
          ? (parsed.templates as Array<Record<string, unknown>>).map((t) => this.parseTemplateObject(t))
          : [];

        for (const template of templates) {
          this.customTemplates.set(template.id, template);
        }

        return {
          campaignType,
          templates,
          timeline: Array.isArray(parsed.timeline)
            ? (parsed.timeline as Array<Record<string, unknown>>).map((t) => ({
                day: typeof t.day === "number" ? t.day : 1,
                phase: String(t.phase ?? ""),
                templateId: String(t.templateId ?? ""),
                platform: (t.platform as Platform) ?? "twitter",
                objective: String(t.objective ?? ""),
              }))
            : [],
        };
      }
    } catch {
      // fallback
    }

    return { campaignType, templates: [], timeline: [] };
  }

  async getHolidayTemplates(holiday: string, date: string): Promise<HolidayTemplateSet> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Create social media templates for "${holiday}" (${date}).

Provide:
1. templates: 4-6 holiday-specific templates
2. contentCalendar: posting schedule around the holiday

Each template should be holiday-themed and engaging.
Content calendar should cover 3 days before to 1 day after.

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create templates for: ${holiday} (${date})`,
        },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const templates = Array.isArray(parsed.templates)
          ? (parsed.templates as Array<Record<string, unknown>>).map((t) => this.parseTemplateObject(t))
          : [];

        for (const template of templates) {
          this.customTemplates.set(template.id, template);
        }

        return {
          holiday,
          date,
          templates,
          contentCalendar: Array.isArray(parsed.contentCalendar)
            ? (parsed.contentCalendar as Array<Record<string, unknown>>).map((c) => ({
                date: String(c.date ?? ""),
                templateId: String(c.templateId ?? ""),
                platform: (c.platform as Platform) ?? "instagram",
              }))
            : [],
        };
      }
    } catch {
      // fallback
    }

    return { holiday, date, templates: [], contentCalendar: [] };
  }

  async getProductLaunchTemplates(product: string): Promise<ProductLaunchTemplateSet> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Create product launch templates for "${product}".

Provide launch phases, each with:
- name: phase name (e.g., "Teaser", "Launch Day", "Post-Launch")
- days: when this phase occurs
- templates: 2-3 templates for this phase
- objectives: what this phase aims to achieve

Cover 3 phases: pre-launch, launch day, post-launch.

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create launch templates for: ${product}`,
        },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const phases = Array.isArray(parsed.phases)
          ? (parsed.phases as Array<Record<string, unknown>>).map((p) => ({
              name: String(p.name ?? ""),
              days: String(p.days ?? ""),
              templates: Array.isArray(p.templates)
                ? (p.templates as Array<Record<string, unknown>>).map((t) => this.parseTemplateObject(t))
                : [],
              objectives: Array.isArray(p.objectives) ? p.objectives.map(String) : [],
            }))
          : [];

        for (const phase of phases) {
          for (const template of phase.templates) {
            this.customTemplates.set(template.id, template);
          }
        }

        return { product, phases };
      }
    } catch {
      // fallback
    }

    return { product, phases: [] };
  }

  async createCustomTemplate(
    name: string,
    category: TemplateCategory,
    description: string,
    platforms: Platform[],
    goal: string
  ): Promise<ContentTemplate> {
    const result = await this.client.complete(
      [
        {
          role: "system",
          content: `Create a custom social media content template.

Template details:
- Name: ${name}
- Category: ${category}
- Description: ${description}
- Platforms: ${platforms.join(", ")}
- Goal: ${goal}

Output as JSON with:
- structure: { hook, body (array), cta, format }
- variables: array of { name, type, label, description, required, defaultValue (optional), placeholder (optional) }
- examples: 2 example outputs with variable values

Output as JSON.`,
        },
        {
          role: "user",
          content: `Create the template: ${name}`,
        },
      ],
      { temperature: 0.7, maxTokens: 3000 }
    );

    const templateId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const template: ContentTemplate = {
          id: templateId,
          name,
          category,
          description,
          platforms,
          tone: "professional",
          structure: {
            hook: String((parsed.structure as Record<string, unknown>)?.hook ?? ""),
            body: Array.isArray((parsed.structure as Record<string, unknown>)?.body)
              ? ((parsed.structure as Record<string, unknown>).body as string[])
              : [],
            cta: String((parsed.structure as Record<string, unknown>)?.cta ?? ""),
            format: String((parsed.structure as Record<string, unknown>)?.format ?? "custom"),
          },
          variables: Array.isArray(parsed.variables)
            ? (parsed.variables as Array<Record<string, unknown>>).map((v) => ({
                name: String(v.name ?? ""),
                type: (v.type as TemplateVariable["type"]) ?? "text",
                label: String(v.label ?? ""),
                description: String(v.description ?? ""),
                required: typeof v.required === "boolean" ? v.required : true,
                defaultValue: typeof v.defaultValue === "string" ? v.defaultValue : undefined,
                options: Array.isArray(v.options) ? v.options.map(String) : undefined,
                placeholder: typeof v.placeholder === "string" ? v.placeholder : undefined,
              }))
            : [],
          examples: [],
          tags: [category, ...platforms],
          usageCount: 0,
          rating: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.customTemplates.set(templateId, template);
        return template;
      }
    } catch {
      // fallback
    }

    const fallbackTemplate: ContentTemplate = {
      id: templateId,
      name,
      category,
      description,
      platforms,
      tone: "professional",
      structure: {
        hook: `{{${name.toLowerCase().replace(/\s+/g, "_")}_hook}}`,
        body: ["{{content}}"],
        cta: "Take action now!",
        format: "custom",
      },
      variables: [
        { name: "hook", type: "text", label: "Hook", description: "Opening hook", required: true },
        { name: "content", type: "text", label: "Content", description: "Main content", required: true },
      ],
      examples: [],
      tags: [category],
      usageCount: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customTemplates.set(templateId, fallbackTemplate);
    return fallbackTemplate;
  }

  private fillTemplate(structure: TemplateStructure, variables: Record<string, string>): string {
    let content = "";

    let hook = structure.hook;
    for (const [key, value] of Object.entries(variables)) {
      hook = hook.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    content += hook + "\n\n";

    for (const line of structure.body) {
      let filledLine = line;
      for (const [key, value] of Object.entries(variables)) {
        filledLine = filledLine.replace(new RegExp(`{{${key}}}`, "g"), value);
      }
      content += filledLine + "\n";
    }

    content += "\n";

    let cta = structure.cta;
    for (const [key, value] of Object.entries(variables)) {
      cta = cta.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    content += cta;

    if (structure.hashtags) {
      let hashtags = structure.hashtags;
      for (const [key, value] of Object.entries(variables)) {
        hashtags = hashtags.replace(new RegExp(`{{${key}}}`, "g"), value);
      }
      content += "\n\n" + hashtags;
    }

    return content.trim();
  }

  private parseTemplateObject(obj: Record<string, unknown>): ContentTemplate {
    const id = String(obj.id ?? `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const structure = (obj.structure ?? {}) as Record<string, unknown>;

    return {
      id,
      name: String(obj.name ?? "Untitled Template"),
      category: (obj.category as TemplateCategory) ?? "custom",
      description: String(obj.description ?? ""),
      platforms: Array.isArray(obj.platforms) ? obj.platforms.map(String) as Platform[] : ["twitter"],
      tone: (obj.tone as Tone) ?? "professional",
      structure: {
        hook: String(structure.hook ?? ""),
        body: Array.isArray(structure.body) ? structure.body.map(String) : [],
        cta: String(structure.cta ?? ""),
        hashtags: typeof structure.hashtags === "string" ? structure.hashtags : undefined,
        format: String(structure.format ?? "custom"),
        maxLength: typeof structure.maxLength === "number" ? structure.maxLength : undefined,
      },
      variables: Array.isArray(obj.variables)
        ? (obj.variables as Array<Record<string, unknown>>).map((v) => ({
            name: String(v.name ?? ""),
            type: (v.type as TemplateVariable["type"]) ?? "text",
            label: String(v.label ?? ""),
            description: String(v.description ?? ""),
            required: typeof v.required === "boolean" ? v.required : true,
            defaultValue: typeof v.defaultValue === "string" ? v.defaultValue : undefined,
            options: Array.isArray(v.options) ? v.options.map(String) : undefined,
            placeholder: typeof v.placeholder === "string" ? v.placeholder : undefined,
          }))
        : [],
      examples: Array.isArray(obj.examples) ? obj.examples.map(() => ({ variables: {}, output: "", platform: "twitter" as Platform })) : [],
      tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
      usageCount: typeof obj.usageCount === "number" ? obj.usageCount : 0,
      rating: typeof obj.rating === "number" ? obj.rating : 0,
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
      updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    };
  }
}

export const contentTemplates = new ContentTemplates();
