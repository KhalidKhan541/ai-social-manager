"use client";

import { useAppStore, type Post } from "@/store";
import { cn, PLATFORMS, POST_STATUSES, formatRelativeTime, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Eye, MoreHorizontal, ExternalLink, Sparkles } from "lucide-react";

interface PostCardProps {
  post: Post;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const statusConfig = POST_STATUSES[post.status];

  if (compact) {
    return (
      <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {post.platforms.map((p) => (
                <div
                  key={p}
                  className="w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: PLATFORMS[p].color }}
                >
                  {p[0].toUpperCase()}
                </div>
              ))}
            </div>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", statusConfig.color)}
            >
              {statusConfig.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {post.publishedAt
              ? formatRelativeTime(post.publishedAt)
              : post.scheduledAt
              ? formatRelativeTime(post.scheduledAt)
              : formatRelativeTime(post.createdAt)}
          </span>
        </div>
        <p className="text-sm line-clamp-2 mb-3">{post.content}</p>
        {post.engagement && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> {formatNumber(post.engagement.likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {formatNumber(post.engagement.comments)}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3" /> {formatNumber(post.engagement.shares)}
            </span>
          </div>
        )}
        {post.aiGenerated && (
          <Badge variant="secondary" className="mt-2 text-[10px] gap-1">
            <Sparkles className="w-3 h-3" /> AI Generated
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              SC
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{post.author.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.hashtags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          {post.platforms.map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: PLATFORMS[p].color }}
              >
                {p[0].toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground">
                {PLATFORMS[p].name}
              </span>
            </div>
          ))}
        </div>
        {post.engagement && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" /> {formatNumber(post.engagement.likes)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> {formatNumber(post.engagement.comments)}
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="w-4 h-4" /> {formatNumber(post.engagement.shares)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {formatNumber(post.engagement.impressions)}
            </span>
          </div>
        )}
      </div>

      {post.aiGenerated && (
        <div className="mt-3 p-2 rounded-lg bg-purple-50 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs text-purple-600">
            This post was generated with AI assistance
          </span>
        </div>
      )}
    </div>
  );
}
