"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  subtitle?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  subtitle,
}: StatsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {trend === "up" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 gap-0.5 text-[10px]">
              <TrendingUp className="w-3 h-3" />
              {change}
            </Badge>
          )}
          {trend === "down" && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 gap-0.5 text-[10px]">
              <TrendingDown className="w-3 h-3" />
              {change}
            </Badge>
          )}
          {trend === "neutral" && (
            <Badge variant="secondary" className="gap-0.5 text-[10px]">
              <Minus className="w-3 h-3" />
              {change}
            </Badge>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
