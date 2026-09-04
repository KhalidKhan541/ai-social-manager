"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Hash,
  TrendingUp,
  Search,
  Plus,
  Copy,
  Trash2,
  Sparkles,
  BarChart3,
  RefreshCw,
  Lightbulb,
  Check,
} from "lucide-react";

const hashtagGroups = [
  {
    id: "1",
    name: "Brand",
    hashtags: ["SocialPilotAI", "AIContent", "SocialMediaTools", "MarketingAI"],
    usageCount: 24,
  },
  {
    id: "2",
    name: "Industry",
    hashtags: ["DigitalMarketing", "ContentMarketing", "SocialMedia", "Marketing"],
    usageCount: 18,
  },
  {
    id: "3",
    name: "Trending",
    hashtags: ["AI2025", "TechTrends", "Innovation", "FutureOfWork"],
    usageCount: 12,
  },
];

const trendingHashtags = [
  { tag: "#AI2025", posts: "2.3M", growth: "+45%" },
  { tag: "#SocialMediaTips", posts: "1.8M", growth: "+12%" },
  { tag: "#ContentCreation", posts: "956K", growth: "+8%" },
  { tag: "#MarketingStrategy", posts: "743K", growth: "+15%" },
  { tag: "#DigitalMarketing", posts: "3.2M", growth: "+5%" },
  { tag: "#GrowthHacking", posts: "567K", growth: "+22%" },
];

export default function HashtagManagerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hashtag Manager</h1>
          <p className="text-muted-foreground mt-1">
            Organize, discover, and optimize your hashtags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Sparkles className="w-4 h-4 mr-1.5" />
            AI Suggest
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            New Group
          </Button>
        </div>
      </div>

      {/* Hashtag Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search hashtags, check volume, find trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">My Groups</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 mt-4">
          {hashtagGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    {group.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {group.hashtags.length} hashtags
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Used {group.usageCount}x
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {group.hashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleCopy(`#${tag}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors group"
                    >
                      <span>#{tag}</span>
                      {copiedTag === `#${tag}` ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ))}
                  <button className="px-3 py-1.5 rounded-full border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                    + Add
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trending" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Trending Hashtags
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trendingHashtags.map((ht) => (
                  <div
                    key={ht.tag}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {ht.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {ht.posts} posts
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-[10px]"
                      >
                        {ht.growth}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(ht.tag)}
                      >
                        {copiedTag === ht.tag ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Hashtags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { tag: "#AI2025", avgEngagement: "4.8%", usage: 12 },
                  { tag: "#SocialMediaTools", avgEngagement: "3.2%", usage: 8 },
                  { tag: "#MarketingAI", avgEngagement: "2.9%", usage: 6 },
                ].map((ht) => (
                  <div
                    key={ht.tag}
                    className="flex items-center justify-between p-2 rounded-lg"
                  >
                    <span className="text-sm font-medium">{ht.tag}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ht.avgEngagement} avg engagement</span>
                      <span>{ht.usage} uses</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Suggestion</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on your recent posts, consider adding{" "}
                    <span className="text-primary font-medium">
                      #TechTrends #Innovation #FutureOfWork
                    </span>{" "}
                    to increase reach by an estimated 15%.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Add All Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
