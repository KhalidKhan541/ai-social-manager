"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PLATFORMS, type PlatformKey } from "@/lib/utils";

const data = [
  { platform: "Twitter", followers: 12400, engagement: 342, reach: 24800 },
  { platform: "Instagram", followers: 34200, engagement: 567, reach: 52300 },
  { platform: "LinkedIn", followers: 8900, engagement: 189, reach: 15600 },
  { platform: "Facebook", followers: 56700, engagement: 234, reach: 67800 },
  { platform: "TikTok", followers: 89300, engagement: 1200, reach: 125000 },
];

export function PlatformComparison() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="platform"
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="followers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="engagement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="reach" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
