"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/store";
import { PLATFORMS, formatRelativeTime, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/analytics/stats-card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  Copy,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export default function PostDetailPage() {
  const params = useParams();
  const { posts } = useAppStore();
  const post = posts.find((p) => p.id === params.id);

  if (!post) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/dashboard/posts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Posts
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Post not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/posts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Post Details</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Created {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-1.5" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Post Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex -space-x-1">
                  {post.platforms.map((p) => (
                    <div
                      key={p}
                      className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: PLATFORMS[p].color }}
                    >
                      {p[0].toUpperCase()}
                    </div>
                  ))}
                </div>
                <Badge variant="secondary" className="capitalize">
                  {post.status}
                </Badge>
                {post.aiGenerated && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" /> AI Generated
                  </Badge>
                )}
              </div>

              <p className="text-base whitespace-pre-wrap mb-4">
                {post.content}
              </p>

              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {post.hashtags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                {post.scheduledAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Scheduled for {formatRelativeTime(post.scheduledAt)}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Published {formatRelativeTime(post.publishedAt)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          {post.engagement && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Engagement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <EngagementChart />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Engagement Stats */}
          {post.engagement && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">
                      {formatNumber(post.engagement.likes)}
                    </p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <MessageCircle className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">
                      {formatNumber(post.engagement.comments)}
                    </p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Share2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">
                      {formatNumber(post.engagement.shares)}
                    </p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Eye className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">
                      {formatNumber(post.engagement.impressions)}
                    </p>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Platform Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.platforms.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: PLATFORMS[p].color }}
                    >
                      {p[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {PLATFORMS[p].name}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
