"use client";

import Link from "next/link";
import { useAppStore } from "@/store";
import { formatNumber, formatRelativeTime, PLATFORMS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/analytics/stats-card";
import { PostCard } from "@/components/posts/post-card";
import {
  ArrowUpRight,
  TrendingUp,
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Calendar,
  FileText,
  Sparkles,
  BarChart3,
} from "lucide-react";

const quickActions = [
  { label: "Create Post", href: "/dashboard/compose", icon: Plus, color: "bg-primary text-primary-foreground" },
  { label: "Schedule", href: "/dashboard/calendar", icon: Calendar, color: "bg-blue-500 text-white" },
  { label: "AI Studio", href: "/dashboard/ai-studio", icon: Sparkles, color: "bg-purple-500 text-white" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, color: "bg-green-500 text-white" },
];

const recentActivity = [
  { type: "published", text: "Post published to Twitter", time: "2 hours ago", icon: Share2 },
  { type: "comment", text: "New comment on Instagram post", time: "3 hours ago", icon: MessageCircle },
  { type: "scheduled", text: "3 posts scheduled for tomorrow", time: "5 hours ago", icon: Calendar },
  { type: "milestone", text: "Reached 50K followers on Instagram", time: "1 day ago", icon: TrendingUp },
];

export default function DashboardPage() {
  const { posts, accounts } = useAppStore();

  const publishedPosts = posts.filter((p) => p.status === "published");
  const totalEngagement = publishedPosts.reduce((acc, p) => {
    if (p.engagement) {
      return acc + p.engagement.likes + p.engagement.comments + p.engagement.shares;
    }
    return acc;
  }, 0);
  const totalImpressions = publishedPosts.reduce((acc, p) => {
    return acc + (p.engagement?.impressions ?? 0);
  }, 0);
  const connectedAccounts = accounts.filter((a) => a.connected);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good morning, Sarah 👋</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening across your social accounts today.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" size="sm">
                <action.icon className="w-4 h-4 mr-1.5" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Reach"
          value={formatNumber(totalImpressions)}
          change="+12.5%"
          trend="up"
          icon={Eye}
        />
        <StatsCard
          title="Engagement"
          value={formatNumber(totalEngagement)}
          change="+8.2%"
          trend="up"
          icon={Heart}
        />
        <StatsCard
          title="Followers"
          value={formatNumber(connectedAccounts.reduce((a, c) => a + c.followers, 0))}
          change="+3.1%"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Posts This Week"
          value={publishedPosts.length.toString()}
          change="+2"
          trend="up"
          icon={FileText}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Posts</h2>
            <Link
              href="/dashboard/posts"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {posts.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} compact />
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Posts */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Upcoming</h3>
              <Link
                href="/dashboard/calendar"
                className="text-xs text-primary hover:underline"
              >
                View calendar
              </Link>
            </div>
            <div className="space-y-3">
              {posts
                .filter((p) => p.status === "scheduled")
                .slice(0, 3)
                .map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {post.platforms.map((p) => (
                          <span
                            key={p}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ backgroundColor: PLATFORMS[p].color }}
                          >
                            {p[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {post.scheduledAt
                          ? formatRelativeTime(post.scheduledAt)
                          : "Not scheduled"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <activity.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Accounts</h3>
              <Link
                href="/dashboard/accounts"
                className="text-xs text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      backgroundColor: PLATFORMS[account.platform].color,
                    }}
                  >
                    {account.platform[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {account.handle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(account.followers)} followers
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
