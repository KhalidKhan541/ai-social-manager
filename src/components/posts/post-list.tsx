"use client";

import { type Post } from "@/store";
import { PostCard } from "./post-card";
import { FileText } from "lucide-react";

interface PostListProps {
  posts: Post[];
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-1">No posts found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or create a new post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
