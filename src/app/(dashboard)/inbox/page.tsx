"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { InboxItem } from "@/components/inbox/inbox-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Filter,
  CheckCheck,
  MessageCircle,
  AtSign,
  Mail,
  Star,
  Settings,
  RefreshCw,
} from "lucide-react";

export default function InboxPage() {
  const { inboxItems, markInboxRead } = useAppStore();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const filteredItems = inboxItems.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "comments") return item.type === "comment";
    if (filter === "mentions") return item.type === "mention";
    if (filter === "dms") return item.type === "dm";
    return true;
  });

  const unreadCount = inboxItems.filter((i) => !i.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Manage comments, mentions, and messages across platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark All Read
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Unread", value: unreadCount, icon: Mail, color: "text-blue-500" },
          {
            label: "Comments",
            value: inboxItems.filter((i) => i.type === "comment").length,
            icon: MessageCircle,
            color: "text-green-500",
          },
          {
            label: "Mentions",
            value: inboxItems.filter((i) => i.type === "mention").length,
            icon: AtSign,
            color: "text-purple-500",
          },
          {
            label: "DMs",
            value: inboxItems.filter((i) => i.type === "dm").length,
            icon: Mail,
            color: "text-orange-500",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">
              All ({inboxItems.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
            <TabsTrigger value="dms">DMs</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search inbox..." className="pl-9 w-[240px]" />
        </div>
      </div>

      {/* Inbox List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold">Inbox is clear</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No messages to display
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onSelect={(id) => {
                  markInboxRead(id);
                  setSelectedItem(id);
                }}
              />
            ))
          )}
        </div>

        {/* AI Reply Suggestions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-3">
                AI Reply Suggestions
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Select an item to get AI-powered reply suggestions
              </p>
              <div className="space-y-2">
                {[
                  "Thank you! We appreciate your feedback.",
                  "Great question! Let me get back to you shortly.",
                  "Thanks for reaching out! We'll look into this.",
                ].map((suggestion, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-muted/50 text-xs cursor-pointer hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-3">Quick Filters</h3>
              <div className="space-y-2">
                {[
                  { label: "Needs Response", count: 3, icon: MessageCircle },
                  { label: "Positive Feedback", count: 5, icon: Star },
                  { label: "Questions", count: 2, icon: AtSign },
                ].map((filter) => (
                  <button
                    key={filter.label}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <filter.icon className="w-4 h-4 text-muted-foreground" />
                      {filter.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {filter.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
