"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Wand2,
  Copy,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Image,
  Hash,
  Video,
  FileText,
  Zap,
  Check,
  ArrowRight,
  Star,
  PenTool,
  Layout,
  TrendingUp,
} from "lucide-react";

const contentTypes = [
  { id: "post", label: "Social Post", icon: MessageSquare, description: "Create engaging posts for any platform" },
  { id: "thread", label: "Thread", icon: FileText, description: "Multi-part Twitter/X threads" },
  { id: "caption", label: "Caption", icon: PenTool, description: "Instagram captions with hashtags" },
  { id: "hook", label: "Hook", icon: Zap, description: "Attention-grabbing opening lines" },
  { id: "cta", label: "CTA", icon: ArrowRight, description: "Call-to-action variations" },
  { id: "bio", label: "Bio", icon: Star, description: "Optimized profile bios" },
];

const templates = [
  {
    id: "1",
    name: "Product Announcement",
    category: "Marketing",
    prompt: "Announce our new [product/feature] with excitement and a clear CTA",
    usageCount: 23,
  },
  {
    id: "2",
    name: "Customer Spotlight",
    category: "Social Proof",
    prompt: "Share a customer success story highlighting [metric/outcome]",
    usageCount: 15,
  },
  {
    id: "3",
    name: "Industry Insight",
    category: "Thought Leadership",
    prompt: "Share an insightful perspective on [trend/topic] in our industry",
    usageCount: 12,
  },
  {
    id: "4",
    name: "Behind the Scenes",
    category: "Culture",
    prompt: "Show a behind-the-scenes look at our team/company",
    usageCount: 18,
  },
  {
    id: "5",
    name: "Engagement Question",
    category: "Community",
    prompt: "Ask an engaging question related to [topic] to spark conversation",
    usageCount: 31,
  },
];

const recentGenerations = [
  {
    prompt: "Announce our new AI writing assistant",
    result: "🚀 Introducing our AI Writing Assistant! Create compelling content 10x faster...",
    platforms: ["Twitter", "LinkedIn"],
    time: "2 hours ago",
  },
  {
    prompt: "Share a tip about social media scheduling",
    result: "💡 Pro Tip: The best time to post isn't when YOU'RE most active...",
    platforms: ["Instagram"],
    time: "5 hours ago",
  },
  {
    prompt: "Write a LinkedIn post about team growth",
    result: "We're growing! Thrilled to welcome 5 new team members...",
    platforms: ["LinkedIn", "Twitter"],
    time: "1 day ago",
  },
];

export default function AiStudioPage() {
  const [selectedType, setSelectedType] = useState("post");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setGenerated(
        `🚀 ${prompt}\n\nHere's a compelling social media post based on your prompt:\n\n"${prompt}" is changing the game. Here's what you need to know:\n\n✅ Key benefit #1\n✅ Key benefit #2\n✅ Key benefit #3\n\nDon't miss out on the future of innovation. Try it today!\n\n#Innovation #TechTrends #AI`
      );
      setLoading(false);
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">AI Content Studio</h1>
            <Badge className="gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by AI
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Generate engaging content with AI assistance
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Generator */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Type Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Content Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <type.icon className="w-4 h-4 mb-1.5" />
                      <p className="text-xs font-medium">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Describe what you want to create
                </label>
                <Textarea
                  placeholder="e.g., Announce our new AI feature with excitement, highlight 3 key benefits, and include a call to action to try it free..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="funny">Funny</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="urgent">Urgent</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>All Platforms</option>
                    <option>Twitter/X</option>
                    <option>Instagram</option>
                    <option>LinkedIn</option>
                    <option>Facebook</option>
                    <option>TikTok</option>
                  </select>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Result */}
          {generated && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Generated Content
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                  {generated}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm">
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Send to Composer
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Generations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Generations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGenerations.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">
                      {item.prompt}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 mb-2">{item.result}</p>
                  <div className="flex gap-1">
                    {item.platforms.map((p) => (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Quick Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Write a thread about AI trends in 2025",
                "Create 5 engaging Instagram captions",
                "Write a LinkedIn post about our company culture",
                "Generate a viral tweet about productivity",
                "Create a product launch announcement",
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p)}
                  className="w-full text-left p-2.5 rounded-lg text-xs hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Templates</CardTitle>
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  className="w-full p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium">{template.name}</p>
                    <Badge variant="secondary" className="text-[9px]">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {template.prompt}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold">AI Tip</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Be specific in your prompts! Instead of &quot;write a tweet,&quot;
                try &quot;write a tweet announcing our new feature, highlight
                3 benefits, use an enthusiastic tone, and include a CTA.&quot;
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
