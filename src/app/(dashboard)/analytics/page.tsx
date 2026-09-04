"use client";

import { useState } from "react";
import { StatsCard } from "@/components/analytics/stats-card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { PlatformComparison } from "@/components/analytics/platform-comparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Heart,
  Users,
  TrendingUp,
  Download,
  Calendar,
  BarChart3,
  ArrowUpRight,
  Clock,
} from "lucide-react";

const topPosts = [
  {
    id: "1",
    content: "Excited to announce our new AI-powered features!",
    platform: "Twitter",
    engagement: 342,
    reach: 12400,
  },
  {
    id: "2",
    content: "Behind the scenes at our team offsite!",
    platform: "Instagram",
    engagement: 567,
    reach: 23100,
  },
  {
    id: "3",
    content: "5 tips for growing your audience",
    platform: "LinkedIn",
    engagement: 189,
    reach: 8900,
  },
];

const demographics = [
  { age: "18-24", percentage: 28, color: "bg-primary" },
  { age: "25-34", percentage: 35, color: "bg-blue-500" },
  { age: "35-44", percentage: 22, color: "bg-green-500" },
  { age: "45-54", percentage: 10, color: "bg-orange-500" },
  { age: "55+", percentage: 5, color: "bg-red-500" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("7d");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your social media performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Impressions"
          value="124.5K"
          change="+15.3%"
          trend="up"
          icon={Eye}
        />
        <StatsCard
          title="Total Engagement"
          value="8,432"
          change="+8.7%"
          trend="up"
          icon={Heart}
        />
        <StatsCard
          title="Follower Growth"
          value="+1,234"
          change="+3.2%"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Engagement Rate"
          value="4.8%"
          change="+0.5%"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Engagement Over Time</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                Last 7 days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <EngagementChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Platform Comparison</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <BarChart3 className="w-3 h-3" />
                All platforms
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PlatformComparison />
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Performing Posts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Performing Posts</CardTitle>
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts.map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.platform}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {post.engagement.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">engagement</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audience Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Age Distribution
              </p>
              <div className="space-y-2">
                {demographics.map((d) => (
                  <div key={d.age} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">
                      {d.age}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.color}`}
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">
                      {d.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Top Locations
              </p>
              <div className="space-y-2">
                {[
                  { country: "United States", percentage: 42 },
                  { country: "United Kingdom", percentage: 18 },
                  { country: "Canada", percentage: 12 },
                  { country: "Germany", percentage: 8 },
                  { country: "Australia", percentage: 6 },
                ].map((l) => (
                  <div key={l.country} className="flex justify-between text-xs">
                    <span>{l.country}</span>
                    <span className="font-medium">{l.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
