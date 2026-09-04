"use client";

import { cn, PLATFORMS, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, MoreHorizontal, TrendingUp, BarChart3 } from "lucide-react";

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate?: string;
    postsCount: number;
    platforms: string[];
    budget?: number;
    spent?: number;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const status = statusConfig[campaign.status] || statusConfig.draft;
  const budgetPercent =
    campaign.budget && campaign.spent
      ? Math.round((campaign.spent / campaign.budget) * 100)
      : 0;

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{campaign.name}</h3>
              <Badge variant="secondary" className={cn("text-[10px] shrink-0", status.color)}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {campaign.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {campaign.platforms.map((p) => (
            <div
              key={p}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{
                backgroundColor:
                  PLATFORMS[p as keyof typeof PLATFORMS]?.color ?? "#888",
              }}
            >
              {p[0].toUpperCase()}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            {campaign.platforms.length} platforms
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Posts</p>
            <p className="text-sm font-semibold">{campaign.postsCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-semibold">
              {campaign.startDate
                ? new Date(campaign.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
              {campaign.endDate
                ? ` - ${new Date(campaign.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-sm font-semibold">
              {campaign.budget ? `$${formatNumber(campaign.budget)}` : "—"}
            </p>
          </div>
        </div>

        {campaign.budget && campaign.spent !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                ${formatNumber(campaign.spent)} spent
              </span>
              <span className="font-medium">{budgetPercent}%</span>
            </div>
            <Progress value={budgetPercent} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
