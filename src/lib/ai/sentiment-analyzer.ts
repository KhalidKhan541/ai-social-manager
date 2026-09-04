import type { SentimentScore } from '@/types'

export interface SentimentResult {
  score: number
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  confidence: number
  phrases: SentimentPhrase[]
  emotions: EmotionScore[]
}

export interface SentimentPhrase {
  text: string
  score: number
  position: number
}

export interface EmotionScore {
  emotion: string
  score: number
}

const POSITIVE_WORDS: Record<string, number> = {
  love: 0.8, great: 0.7, amazing: 0.9, excellent: 0.85, wonderful: 0.8,
  fantastic: 0.85, awesome: 0.8, happy: 0.75, joy: 0.8, perfect: 0.9,
  best: 0.75, beautiful: 0.7, brilliant: 0.8, outstanding: 0.85, superb: 0.85,
  impressive: 0.75, remarkable: 0.75, delightful: 0.8, thrilled: 0.85, excited: 0.8,
  grateful: 0.75, blessed: 0.75, celebrate: 0.7, success: 0.7, win: 0.7,
  triumph: 0.8, victory: 0.75, accomplish: 0.7, achieve: 0.7, inspiring: 0.75,
  motivating: 0.7, empowering: 0.75, innovative: 0.7, creative: 0.65, helpful: 0.6,
  useful: 0.6, valuable: 0.65, quality: 0.6, recommend: 0.65, approve: 0.65,
}

const NEGATIVE_WORDS: Record<string, number> = {
  hate: -0.8, terrible: -0.85, awful: -0.85, horrible: -0.85, worst: -0.9,
  bad: -0.6, poor: -0.6, disappointing: -0.7, frustrated: -0.75, angry: -0.8,
  sad: -0.65, upset: -0.7, annoyed: -0.65, irritated: -0.65, furious: -0.85,
  disgusted: -0.8, outraged: -0.85, devastated: -0.9, miserable: -0.85, depressing: -0.7,
  fail: -0.6, failure: -0.7, problem: -0.5, issue: -0.4, bug: -0.5,
  error: -0.5, broken: -0.6, useless: -0.7, waste: -0.6, scam: -0.85,
  fraud: -0.9, cheat: -0.8, lie: -0.7, false: -0.5, wrong: -0.5,
  damage: -0.6, harm: -0.65, danger: -0.6, risk: -0.4, threat: -0.5,
}

const EMOTION_WORDS: Record<string, Record<string, number>> = {
  joy: { happy: 0.9, love: 0.85, great: 0.7, amazing: 0.8, wonderful: 0.85 },
  sadness: { sad: 0.9, depressed: 0.85, miserable: 0.8, heartbreaking: 0.9, grief: 0.85 },
  anger: { angry: 0.9, furious: 0.95, outraged: 0.9, hate: 0.85, rage: 0.9 },
  fear: { afraid: 0.9, scared: 0.85, terrified: 0.95, anxious: 0.8, worried: 0.75 },
  surprise: { surprised: 0.9, shocked: 0.85, amazed: 0.8, stunned: 0.85, unexpected: 0.7 },
  disgust: { disgusting: 0.9, gross: 0.85, nauseous: 0.8, repulsive: 0.9, awful: 0.75 },
}

export class SentimentAnalyzer {
  private minConfidence: number

  constructor(minConfidence: number = 0.3) {
    this.minConfidence = minConfidence
  }

  async analyze(text: string): Promise<SentimentResult> {
    const words = this.tokenize(text)
    const phrases = this.extractPhrases(text)
    const wordScores = this.scoreWords(words)
    const emotions = this.detectEmotions(words)

    const avgScore = wordScores.length > 0
      ? wordScores.reduce((sum, s) => sum + s, 0) / wordScores.length
      : 0

    const normalizedScore = Math.max(-1, Math.min(1, avgScore))
    const label = this.getSentimentLabel(normalizedScore)
    const confidence = this.calculateConfidence(wordScores.length, words.length)

    return {
      score: Math.round(normalizedScore * 100) / 100,
      label,
      confidence: Math.round(confidence * 100) / 100,
      phrases,
      emotions,
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
  }

  private extractPhrases(text: string): SentimentPhrase[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim())
    const phrases: SentimentPhrase[] = []

    for (const sentence of sentences) {
      const words = this.tokenize(sentence)
      let phraseScore = 0
      let wordCount = 0

      for (const word of words) {
        if (POSITIVE_WORDS[word]) {
          phraseScore += POSITIVE_WORDS[word]
          wordCount++
        } else if (NEGATIVE_WORDS[word]) {
          phraseScore += NEGATIVE_WORDS[word]
          wordCount++
        }
      }

      if (wordCount > 0) {
        phrases.push({
          text: sentence.trim(),
          score: Math.round((phraseScore / wordCount) * 100) / 100,
          position: text.indexOf(sentence),
        })
      }
    }

    return phrases
  }

  private scoreWords(words: string[]): number[] {
    const scores: number[] = []
    for (const word of words) {
      if (POSITIVE_WORDS[word]) scores.push(POSITIVE_WORDS[word])
      else if (NEGATIVE_WORDS[word]) scores.push(NEGATIVE_WORDS[word])
    }
    return scores
  }

  private detectEmotions(words: string[]): EmotionScore[] {
    const emotions: EmotionScore[] = []

    for (const [emotion, emotionWords] of Object.entries(EMOTION_WORDS)) {
      let score = 0
      let count = 0

      for (const word of words) {
        if (emotionWords[word]) {
          score += emotionWords[word]
          count++
        }
      }

      if (count > 0) {
        emotions.push({
          emotion,
          score: Math.round((score / count) * 100) / 100,
        })
      }
    }

    return emotions.sort((a, b) => b.score - a.score)
  }

  private getSentimentLabel(score: number): SentimentScore['label'] {
    if (score > 0.2) return 'POSITIVE'
    if (score < -0.2) return 'NEGATIVE'
    return 'NEUTRAL'
  }

  private calculateConfidence(scoredWords: number, totalWords: number): number {
    if (totalWords === 0) return 0
    const coverage = scoredWords / totalWords
    return Math.min(0.95, 0.3 + coverage * 0.7)
  }

  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map((text) => this.analyze(text)))
  }

  async getOverallSentiment(texts: string[]): Promise<SentimentResult> {
    const results = await this.batchAnalyze(texts)
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    const allEmotions = results.flatMap((r) => r.emotions)
    const emotionMap = new Map<string, number[]>()

    for (const e of allEmotions) {
      if (!emotionMap.has(e.emotion)) emotionMap.set(e.emotion, [])
      emotionMap.get(e.emotion)!.push(e.score)
    }

    const emotions: EmotionScore[] = Array.from(emotionMap.entries()).map(([emotion, scores]) => ({
      emotion,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    }))

    return {
      score: Math.round(avgScore * 100) / 100,
      label: this.getSentimentLabel(avgScore),
      confidence: Math.min(0.95, 0.5 + results.length * 0.05),
      phrases: [],
      emotions,
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer()
