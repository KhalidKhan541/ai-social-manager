"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { PostCard } from "@/components/posts/post-card";
import { PostList } from "@/components/posts/post-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";

export default function PostsPage() {
  const { posts } = useAppStore();
  const [filter, setFilter] = useState<"all" | "published" | "scheduled" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts.filter((post) => {
    if (filter !== "all" && post.status !== filter) return false;
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your published and scheduled content
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-1.5" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="published">
              Published ({posts.filter((p) => p.status === "published").length})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled ({posts.filter((p) => p.status === "scheduled").length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({posts.filter((p) => p.status === "draft").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[240px]"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Posts List */}
      <PostList posts={filteredPosts} />
    </div>
  );
}
