import type { AIContentRequest, AIContentResponse, SentimentScore, Platform } from '@/types'

export interface AIConfig {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

const DEFAULT_CONFIG: AIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1024,
}

export class PostGenerator {
  private config: AIConfig

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async generatePost(request: AIContentRequest): Promise<AIContentResponse> {
    const prompt = this.buildPrompt(request)
    const response = await this.callAI(prompt)
    const content = this.extractContent(response)
    const hashtags = request.includeHashtags
      ? await this.generateHashtags(content, request.platform)
      : []

    return {
      content,
      hashtags,
      suggestedMedia: [],
      sentiment: await this.analyzeSentiment(content),
      readingLevel: this.calculateReadingLevel(content),
      wordCount: content.split(/\s+/).length,
    }
  }

  private buildPrompt(request: AIContentRequest): string {
    const parts = [
      `Create a ${request.tone.toLowerCase()} social media post for ${request.platform}.`,
      `Topic: ${request.topic}`,
      `Maximum length: ${request.maxLength} characters.`,
    ]

    if (request.targetAudience) {
      parts.push(`Target audience: ${request.targetAudience}`)
    }
    if (request.brandVoice) {
      parts.push(`Brand voice: ${request.brandVoice}`)
    }
    if (request.keywords?.length) {
      parts.push(`Keywords to include: ${request.keywords.join(', ')}`)
    }
    if (request.includeEmojis) {
      parts.push('Include relevant emojis.')
    }

    return parts.join('\n')
  }

  private async callAI(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: 'You are a social media content expert.' },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch {
      return this.generateFallbackContent(prompt)
    }
  }

  private generateFallbackContent(prompt: string): string {
    const topic = prompt.match(/Topic: (.+)/)?.[1] || 'this topic'
    return `Check out our latest insights on ${topic}. Stay tuned for more updates!`
  }

  private extractContent(response: string): string {
    return response.replace(/^\s+|\s+$/g, '').replace(/\n{3,}/g, '\n\n')
  }

  private calculateReadingLevel(content: string): number {
    const words = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim()).length
    const syllables = this.countSyllables(content)

    if (sentences === 0 || words === 0) return 0

    const score = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    return Math.max(0, Math.min(12, Math.round(score)))
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/)
    let count = 0

    for (const word of words) {
      const vowels = word.match(/[aeiouy]+/g)
      if (vowels) {
        count += vowels.length
        if (word.endsWith('e')) count--
        count = Math.max(1, count)
      }
    }

    return count
  }

  async generateHashtags(content: string, platform: Platform): Promise<string[]> {
    const words = content.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being'])
    const contentWords = words.filter((w) => w.length > 3 && !stopWords.has(w))
    const hashtags = contentWords.slice(0, 5).map((w) => `#${w}`)

    const platformHashtags: Record<Platform, string[]> = {
      TWITTER: ['#socialmedia', '#marketing'],
      LINKEDIN: ['#business', '#professional'],
      INSTAGRAM: ['#instagood', '#photooftheday'],
      FACEBOOK: ['#trending', '#viral'],
    }

    return [...new Set([...hashtags, ...platformHashtags[platform]])]
  }

  async analyzeSentiment(content: string): Promise<SentimentScore> {
    const positiveWords = ['great', 'amazing', 'love', 'excellent', 'wonderful', 'fantastic', 'happy', 'joy']
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'sad', 'angry', 'frustrated']

    const words = content.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    for (const word of words) {
      if (positiveWords.some((pw) => word.includes(pw))) positiveCount++
      if (negativeWords.some((nw) => word.includes(nw))) negativeCount++
    }

    const total = positiveCount + negativeCount
    const score = total === 0 ? 0.5 : positiveCount / total

    let label: SentimentScore['label'] = 'NEUTRAL'
    if (score > 0.6) label = 'POSITIVE'
    else if (score < 0.4) label = 'NEGATIVE'

    return {
      score: Math.round(score * 100) / 100,
      label,
      confidence: Math.min(0.95, 0.5 + total * 0.1),
    }
  }
}

export const postGenerator = new PostGenerator()
