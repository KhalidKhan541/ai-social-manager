"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Copy, Check, Wand2, Lightbulb, Zap } from "lucide-react";

const suggestions = [
  {
    id: "1",
    type: "improve",
    label: "Make it more engaging",
    prompt: "Rewrite this to be more engaging and add a call to action",
  },
  {
    id: "2",
    type: "shorten",
    label: "Make it shorter",
    prompt: "Condense this into a concise, punchy post",
  },
  {
    id: "3",
    type: "hashtags",
    label: "Suggest hashtags",
    prompt: "Generate 5 relevant hashtags for this content",
  },
  {
    id: "4",
    type: "tone",
    label: "Make it professional",
    prompt: "Rewrite in a more professional and authoritative tone",
  },
  {
    id: "5",
    type: "fun",
    label: "Make it fun & casual",
    prompt: "Rewrite in a fun, casual tone with some humor",
  },
  {
    id: "6",
    type: "thread",
    label: "Turn into thread",
    prompt: "Break this into a Twitter thread format with numbered points",
  },
];

const contentIdeas = [
  "Share a behind-the-scenes look at your team",
  "Post a customer success story",
  "Share an industry insight or statistic",
  "Create a how-to tutorial",
  "Ask your audience a thought-provoking question",
  "Share a before/after comparison",
];

export function AiAssist() {
  const { composeContent, setComposeContent } = useAppStore();
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async (prompt: string) => {
    setLoading(true);
    // Simulate AI generation
    setTimeout(() => {
      const mockResponses: Record<string, string> = {
        improve:
          "🚀 Ready to take your social media to the next level? Our new AI-powered tools make it easier than ever to create, schedule, and analyze your content. Start your free trial today! #SocialMediaMarketing #AI",
        shorten:
          "AI-powered social media management is here. Create. Schedule. Analyze. All in one place. Try it free →",
        hashtags:
          "#SocialMediaMarketing #AI #ContentCreation #MarketingTools #DigitalMarketing",
        tone:
          "We are pleased to announce the launch of our comprehensive AI-powered social media management platform. This solution streamlines content creation, scheduling, and analytics across multiple channels.",
        fun:
          "PSA: Social media management doesn't have to be a headache anymore 😅 Our new AI tools do the heavy lifting so you can focus on what matters — being awesome. ✨",
        thread:
          "🧵 THREAD: 5 ways our AI transforms social media management:\n\n1/ Automated content generation that actually sounds human\n2/ Smart scheduling based on when YOUR audience is active\n3/ Cross-platform optimization in one click\n4/ Real-time analytics dashboard\n5/ AI-powered hashtag suggestions",
      };
      setGeneratedText(
        mockResponses[prompt] || "Here is your AI-generated content suggestion..."
      );
      setLoading(false);
    }, 1500);
  };

  const handleApplyGenerated = () => {
    setComposeContent(generatedText);
    setGeneratedText("");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-sm">AI Assist</h3>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s.id}
            onClick={() => handleGenerate(s.type)}
            disabled={loading || !composeContent.trim()}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg border text-left hover:bg-muted/50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="flex-1">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Prompt */}
      <div className="space-y-2">
        <Textarea
          placeholder="Describe what you want the AI to generate..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="min-h-[80px] text-xs resize-none"
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            if (customPrompt.trim()) {
              handleGenerate("custom");
              setCustomPrompt("");
            }
          }}
          disabled={loading || !customPrompt.trim()}
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Generated Result */}
      {generatedText && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2 animate-fade-in">
          <p className="text-sm">{generatedText}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={handleApplyGenerated}>
              Use this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy("generated", generatedText)}
            >
              {copiedId === "generated" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGeneratedText("")}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Content Ideas */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          Content Ideas
        </p>
        <div className="space-y-1.5">
          {contentIdeas.slice(0, 3).map((idea, i) => (
            <button
              key={i}
              onClick={() => setComposeContent(idea)}
              className="w-full text-left p-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
