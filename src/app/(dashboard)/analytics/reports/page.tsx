"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { StatsCard } from "@/components/analytics/stats-card";
import {
  Download,
  Calendar,
  Eye,
  Heart,
  Users,
  TrendingUp,
  FileText,
  BarChart3,
} from "lucide-react";

const reports = [
  {
    id: "1",
    title: "Weekly Performance Report",
    date: "Jan 8 - Jan 15, 2025",
    status: "ready",
    metrics: { impressions: "45.2K", engagement: "2,341", followers: "+342" },
  },
  {
    id: "2",
    title: "Monthly Executive Summary",
    date: "December 2024",
    status: "ready",
    metrics: { impressions: "198K", engagement: "12,456", followers: "+1,234" },
  },
  {
    id: "3",
    title: "Campaign ROI Report",
    date: "Product Launch Q1",
    status: "generating",
    metrics: null,
  },
];

const scheduledReports = [
  { name: "Weekly Summary", frequency: "Every Monday", recipients: "team@company.com" },
  { name: "Monthly Analytics", frequency: "1st of month", recipients: "marketing@company.com" },
  { name: "Campaign Report", frequency: "End of campaign", recipients: "stakeholders@company.com" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage analytics reports
          </p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-1.5" />
          Generate Report
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Generated Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4 mt-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{report.title}</h3>
                      <Badge
                        variant={
                          report.status === "ready" ? "default" : "secondary"
                        }
                      >
                        {report.status === "ready" ? "Ready" : "Generating..."}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.date}
                    </p>
                    {report.metrics && (
                      <div className="flex gap-6 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Impressions
                          </p>
                          <p className="text-sm font-semibold">
                            {report.metrics.impressions}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Engagement
                          </p>
                          <p className="text-sm font-semibold">
                            {report.metrics.engagement}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            New Followers
                          </p>
                          <p className="text-sm font-semibold">
                            {report.metrics.followers}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {report.status === "ready" && (
                      <>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Automated Report Schedule
                </CardTitle>
                <Button variant="outline" size="sm">
                  Add Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.frequency} · {report.recipients}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Performance Overview",
                desc: "Standard metrics across all platforms",
                icon: BarChart3,
              },
              {
                title: "Campaign Report",
                desc: "Detailed campaign analytics and ROI",
                icon: TrendingUp,
              },
              {
                title: "Audience Insights",
                desc: "Demographics and growth analysis",
                icon: Users,
              },
            ].map((template) => (
              <Card
                key={template.title}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <template.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{template.title}</h3>
                  <p className="text-xs text-muted-foreground">{template.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
