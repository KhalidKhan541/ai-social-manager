import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIProviderName = "openai" | "anthropic" | "gemini";

export interface AIProviderConfig {
  openai?: { apiKey: string; model?: string; baseUrl?: string };
  anthropic?: { apiKey: string; model?: string };
  gemini?: { apiKey: string; model?: string };
  defaultProvider?: AIProviderName;
  maxRetries?: number;
  timeout?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface CompletionResult {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: AIProviderName;
  finishReason: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ProviderConfigSchema = z.object({
  openai: z
    .object({
      apiKey: z.string(),
      model: z.string().default("gpt-4o"),
      baseUrl: z.string().optional(),
    })
    .optional(),
  anthropic: z
    .object({
      apiKey: z.string(),
      model: z.string().default("claude-sonnet-4-20250514"),
    })
    .optional(),
  gemini: z
    .object({
      apiKey: z.string(),
      model: z.string().default("gemini-1.5-flash"),
    })
    .optional(),
  defaultProvider: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  maxRetries: z.number().min(0).max(10).default(3),
  timeout: z.number().min(1000).max(300_000).default(60_000),
});

type ValidatedConfig = z.infer<typeof ProviderConfigSchema>;

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

abstract class BaseProvider {
  protected apiKey: string;
  protected model: string;
  protected timeout: number;

  constructor(apiKey: string, model: string, timeout: number) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;
  }

  abstract complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  abstract stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  protected buildHeaders(record: Record<string, string>): Record<string, string> {
    return record;
  }

  protected async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---- OpenAI ----------------------------------------------------------------

class OpenAIProvider extends BaseProvider {
  private baseUrl: string;

  constructor(apiKey: string, model: string, baseUrl: string | undefined, timeout: number) {
    super(apiKey, model, timeout);
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const body = {
      model: options.model ?? this.model,
      messages: this.formatMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stop: options.stop,
    };

    const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`OpenAI API error (${res.status}): ${err}`, "openai", res.status);
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      provider: "openai",
      finishReason: choice.finish_reason ?? "stop",
    };
  }

  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const body = {
      model: options.model ?? this.model,
      messages: this.formatMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    };

    const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`OpenAI streaming error (${res.status}): ${err}`, "openai", res.status);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", "openai");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") {
            yield { delta: "", done: true };
            return;
          }
          try {
            const parsed = JSON.parse(payload) as OpenAIStreamChunk;
            const delta = parsed.choices[0]?.delta?.content ?? "";
            if (delta) {
              yield { delta, done: false };
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ---- Anthropic -------------------------------------------------------------

class AnthropicProvider extends BaseProvider {
  constructor(apiKey: string, model: string, timeout: number) {
    super(apiKey, model, timeout);
  }

  private separateSystem(messages: ChatMessage[]): { system: string; rest: ChatMessage[] } {
    const systemMsg = messages.find((m) => m.role === "system");
    return {
      system: systemMsg?.content ?? "",
      rest: messages.filter((m) => m.role !== "system"),
    };
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const { system, rest } = this.separateSystem(messages);

    const body: Record<string, unknown> = {
      model: options.model ?? this.model,
      max_tokens: options.maxTokens ?? 2048,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    };
    if (system) body.system = system;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stop) body.stop_sequences = options.stop;

    const res = await this.fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`Anthropic API error (${res.status}): ${err}`, "anthropic", res.status);
    }

    const data = (await res.json()) as AnthropicMessageResponse;
    const textBlock = data.content.find((b) => b.type === "text");

    return {
      content: textBlock?.text ?? "",
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      provider: "anthropic",
      finishReason: data.stop_reason ?? "end_turn",
    };
  }

  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { system, rest } = this.separateSystem(messages);

    const body: Record<string, unknown> = {
      model: options.model ?? this.model,
      max_tokens: options.maxTokens ?? 2048,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    };
    if (system) body.system = system;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    const res = await this.fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`Anthropic streaming error (${res.status}): ${err}`, "anthropic", res.status);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", "anthropic");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          try {
            const parsed = JSON.parse(payload) as AnthropicStreamEvent;
            if (parsed.type === "content_block_delta" && "text" in parsed) {
              yield { delta: parsed.text, done: false };
            }
            if (parsed.type === "message_stop") {
              yield { delta: "", done: true };
              return;
            }
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ---- Gemini ----------------------------------------------------------------

class GeminiProvider extends BaseProvider {
  constructor(apiKey: string, model: string, timeout: number) {
    super(apiKey, model, timeout);
  }

  private formatMessages(messages: ChatMessage[]) {
    const contents: { role: string; parts: { text: string }[] }[] = [];
    let systemInstruction: string | undefined;

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
        continue;
      }
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    return { contents, systemInstruction };
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const { contents, systemInstruction } = this.formatMessages(messages);
    const model = options.model ?? this.model;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
        topP: options.topP ?? 1,
      },
    };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`Gemini API error (${res.status}): ${err}`, "gemini", res.status);
    }

    const data = (await res.json()) as GeminiGenerateResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    const usageMetadata = data.usageMetadata;

    return {
      content: text,
      usage: {
        promptTokens: usageMetadata?.promptTokenCount ?? 0,
        completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata?.totalTokenCount ?? 0,
      },
      model,
      provider: "gemini",
      finishReason: data.candidates?.[0]?.finishReason ?? "STOP",
    };
  }

  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { contents, systemInstruction } = this.formatMessages(messages);
    const model = options.model ?? this.model;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIProviderError(`Gemini streaming error (${res.status}): ${err}`, "gemini", res.status);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", "gemini");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          try {
            const parsed = JSON.parse(payload) as GeminiStreamResponse;
            const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
            if (text) yield { delta: text, done: false };
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class AIProviderError extends Error {
  provider: AIProviderName;
  statusCode?: number;

  constructor(message: string, provider: AIProviderName, statusCode?: number) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export class AIClient {
  private providers: Map<AIProviderName, BaseProvider> = new Map();
  private defaultProvider: AIProviderName;
  private maxRetries: number;

  constructor(config: AIProviderConfig) {
    const validated = ProviderConfigSchema.parse(config);
    this.defaultProvider = validated.defaultProvider;
    this.maxRetries = validated.maxRetries;

    if (validated.openai) {
      this.providers.set(
        "openai",
        new OpenAIProvider(
          validated.openai.apiKey,
          validated.openai.model,
          validated.openai.baseUrl,
          validated.timeout
        )
      );
    }

    if (validated.anthropic) {
      this.providers.set(
        "anthropic",
        new AnthropicProvider(
          validated.anthropic.apiKey,
          validated.anthropic.model,
          validated.timeout
        )
      );
    }

    if (validated.gemini) {
      this.providers.set(
        "gemini",
        new GeminiProvider(
          validated.gemini.apiKey,
          validated.gemini.model,
          validated.timeout
        )
      );
    }

    if (this.providers.size === 0) {
      throw new AIProviderError(
        "At least one AI provider must be configured",
        this.defaultProvider
      );
    }
  }

  private getProvider(name?: AIProviderName): { provider: BaseProvider; name: AIProviderName } {
    const providerName = name ?? this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new AIProviderError(
        `Provider "${providerName}" is not configured. Available: ${[...this.providers.keys()].join(", ")}`,
        providerName
      );
    }
    return { provider, name: providerName };
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions & { provider?: AIProviderName } = {}
  ): Promise<CompletionResult> {
    const { provider, name } = this.getProvider(options.provider);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await provider.complete(messages, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 30_000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }
    throw new AIProviderError(
      `All ${this.maxRetries + 1} attempts failed for ${name}: ${lastError?.message}`,
      name
    );
  }

  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions & { provider?: AIProviderName } = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { provider } = this.getProvider(options.provider);
    yield* provider.stream(messages, options);
  }

  async completeToArray(
    messages: ChatMessage[],
    options: CompletionOptions & { provider?: AIProviderName } = {}
  ): Promise<string> {
    const result = await this.complete(messages, options);
    return result.content;
  }

  getAvailableProviders(): AIProviderName[] {
    return [...this.providers.keys()];
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let clientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!clientInstance) {
    const config: AIProviderConfig = {
      defaultProvider:
        (process.env.AI_DEFAULT_PROVIDER as AIProviderName | undefined) ?? "openai",
      maxRetries: Number(process.env.AI_MAX_RETRIES ?? 3),
      timeout: Number(process.env.AI_TIMEOUT ?? 60000),
    };

    if (process.env.OPENAI_API_KEY) {
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        baseUrl: process.env.OPENAI_BASE_URL,
      };
    }
    if (process.env.ANTHROPIC_API_KEY) {
      config.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      };
    }
    if (process.env.GEMINI_API_KEY) {
      config.gemini = {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
      };
    }

    clientInstance = new AIClient(config);
  }
  return clientInstance;
}

// ---------------------------------------------------------------------------
// Internal types for API responses
// ---------------------------------------------------------------------------

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: { message: { role: string; content: string }; finish_reason: string | null }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface OpenAIStreamChunk {
  choices: { delta?: { content?: string }; finish_reason: string | null }[];
}

interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: { type: string; text: string }[];
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

interface AnthropicStreamEvent {
  type: string;
  text?: string;
}

interface GeminiGenerateResponse {
  candidates?: {
    content?: { parts?: { text: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiStreamResponse {
  candidates?: { content?: { parts?: { text: string }[] } }[];
}

export function resetClientForTesting(): void {
  clientInstance = null;
}
