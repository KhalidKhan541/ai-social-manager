"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { cn, PLATFORMS, type PlatformKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Image,
  Video,
  Smile,
  Hash,
  Link2,
  CalendarIcon,
  Send,
  Save,
  X,
  Clock,
  Globe,
  AtSign,
  MapPin,
} from "lucide-react";

export function PostComposer() {
  const { composeContent, setComposeContent, selectedPlatforms, addPost } =
    useAppStore();
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("14:00");
  const [showSchedule, setShowSchedule] = useState(false);
  const [charLimit, setCharLimit] = useState(280);

  const maxChars = selectedPlatforms.includes("twitter")
    ? 280
    : selectedPlatforms.includes("instagram")
    ? 2200
    : 63206;

  const addHashtag = () => {
    const tag = hashtagInput.replace("#", "").trim();
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handlePublish = () => {
    if (!composeContent.trim()) return;
    const newPost = {
      id: Math.random().toString(36).substring(7),
      content: composeContent,
      platforms: selectedPlatforms,
      media: [],
      status: "published" as const,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" as const },
      engagement: { likes: 0, comments: 0, shares: 0, impressions: 0 },
      hashtags,
      aiGenerated: false,
    };
    addPost(newPost);
    setComposeContent("");
    setHashtags([]);
  };

  const handleSchedule = () => {
    if (!composeContent.trim() || !scheduleDate) return;
    const newPost = {
      id: Math.random().toString(36).substring(7),
      content: composeContent,
      platforms: selectedPlatforms,
      media: [],
      status: "scheduled" as const,
      scheduledAt: scheduleDate.toISOString(),
      createdAt: new Date().toISOString(),
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" as const },
      hashtags,
      aiGenerated: false,
    };
    addPost(newPost);
    setComposeContent("");
    setHashtags([]);
    setShowSchedule(false);
  };

  const handleSaveDraft = () => {
    if (!composeContent.trim()) return;
    const newPost = {
      id: Math.random().toString(36).substring(7),
      content: composeContent,
      platforms: selectedPlatforms,
      media: [],
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      author: { id: "1", name: "Sarah Chen", email: "", role: "owner" as const },
      hashtags,
      aiGenerated: false,
    };
    addPost(newPost);
  };

  const contentWithHashtags =
    composeContent +
    (hashtags.length > 0
      ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ")
      : "");

  return (
    <div className="space-y-4">
      {/* Platform Previews */}
      {selectedPlatforms.length > 0 && (
        <div className="flex gap-2">
          {selectedPlatforms.map((p) => (
            <div
              key={p}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: PLATFORMS[p].color }}
            >
              {PLATFORMS[p].name}
              <button
                onClick={() =>
                  useAppStore.getState().setSelectedPlatforms(
                    selectedPlatforms.filter((sp) => sp !== p)
                  )
                }
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4">
          <Textarea
            placeholder="What's on your mind? Write something engaging..."
            value={composeContent}
            onChange={(e) => setComposeContent(e.target.value)}
            className="min-h-[200px] border-0 resize-none focus-visible:ring-0 text-base"
          />
        </div>

        {/* Character Count & Hashtags */}
        <div className="px-4 pb-3">
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add hashtag"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHashtag();
                }
              }}
              className="h-8 text-xs flex-1 max-w-[200px]"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {contentWithHashtags.length}/{maxChars}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t p-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Image className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Smile className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Hash className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Link2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <AtSign className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MapPin className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-1.5" />
              Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Schedule
            </Button>
            <Button size="sm" onClick={handlePublish}>
              <Send className="w-4 h-4 mr-1.5" />
              Publish Now
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Panel */}
      {showSchedule && (
        <div className="rounded-xl border bg-card p-4 animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">Schedule Post</h3>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={
                    scheduleDate
                      ? scheduleDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setScheduleDate(new Date(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                AI-Recommended Times
              </p>
              {["09:00 AM", "12:30 PM", "6:00 PM", "8:45 PM"].map((time) => (
                <button
                  key={time}
                  onClick={() => setScheduleTime(time)}
                  className="block w-full text-left p-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  <Clock className="w-3 h-3 inline mr-2" />
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={() => setShowSchedule(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSchedule}>
              Schedule Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
