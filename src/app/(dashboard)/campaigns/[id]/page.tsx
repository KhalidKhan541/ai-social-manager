"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store";
import { PLATFORMS, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/analytics/stats-card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  Users,
  BarChart3,
  Plus,
  Settings,
  Pause,
  Play,
  FileText,
} from "lucide-react";

export default function CampaignDetailPage() {
  const params = useParams();
  const { campaigns, posts } = useAppStore();
  const campaign = campaigns.find((c) => c.id === params.id);

  if (!campaign) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Campaigns
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetPercent = campaign.budget
    ? Math.round(((campaign.spent ?? 0) / campaign.budget) * 100)
    : 0;

  const campaignPosts = posts.filter(
    (p) =>
      p.status === "published" || p.status === "scheduled"
  ).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge
                variant="secondary"
                className={`capitalize ${
                  campaign.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {campaign.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
          {campaign.status === "active" ? (
            <Button variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-1.5" />
              Pause
            </Button>
          ) : (
            <Button size="sm">
              <Play className="w-4 h-4 mr-1.5" />
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Reach"
          value="45.2K"
          change="+12.3%"
          trend="up"
          icon={Eye}
        />
        <StatsCard
          title="Engagement"
          value="2,341"
          change="+8.7%"
          trend="up"
          icon={Heart}
        />
        <StatsCard
          title="Posts"
          value={campaign.postsCount.toString()}
          change="+3"
          trend="up"
          icon={FileText}
        />
        <StatsCard
          title="Budget Used"
          value={`${budgetPercent}%`}
          change={`$${(campaign.spent ?? 0).toLocaleString()} of $${(campaign.budget ?? 0).toLocaleString()}`}
          trend="neutral"
          icon={DollarSign}
        />
      </div>

      {/* Budget Progress */}
      {campaign.budget && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Budget Progress</h3>
              <span className="text-sm text-muted-foreground">
                ${campaign.spent?.toLocaleString() ?? 0} / $
                {campaign.budget.toLocaleString()}
              </span>
            </div>
            <Progress value={budgetPercent} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Started {campaign.startDate}</span>
              {campaign.endDate && <span>Ends {campaign.endDate}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementChart />
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platforms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaign.platforms.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      backgroundColor:
                        PLATFORMS[p as keyof typeof PLATFORMS]?.color ?? "#888",
                    }}
                  >
                    {p[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {PLATFORMS[p as keyof typeof PLATFORMS]?.name ?? p}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {Math.floor(Math.random() * 5000 + 1000).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">impressions</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaign Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Campaign Posts</CardTitle>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaignPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50"
              >
                <div className="flex -space-x-1">
                  {post.platforms.map((p) => (
                    <div
                      key={p}
                      className="w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        backgroundColor:
                          PLATFORMS[p as keyof typeof PLATFORMS]?.color ?? "#888",
                      }}
                    >
                      {p[0].toUpperCase()}
                    </div>
                  ))}
                </div>
                <p className="flex-1 text-sm line-clamp-1">{post.content}</p>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    post.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {post.status}
                </Badge>
                {post.engagement && (
                  <span className="text-xs text-muted-foreground">
                    {post.engagement.likes} likes
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
