"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { name: "Mon", likes: 245, comments: 45, shares: 32, impressions: 4200 },
  { name: "Tue", likes: 312, comments: 67, shares: 41, impressions: 5100 },
  { name: "Wed", likes: 189, comments: 34, shares: 28, impressions: 3800 },
  { name: "Thu", likes: 423, comments: 89, shares: 56, impressions: 7200 },
  { name: "Fri", likes: 356, comments: 72, shares: 48, impressions: 6100 },
  { name: "Sat", likes: 278, comments: 51, shares: 37, impressions: 4800 },
  { name: "Sun", likes: 198, comments: 42, shares: 29, impressions: 3500 },
];

interface EngagementChartProps {
  metric?: "likes" | "comments" | "shares" | "impressions";
}

export function EngagementChart({ metric = "likes" }: EngagementChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
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
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="comments"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="shares"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
