"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { cn, PLATFORMS, type PlatformKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PostComposer } from "@/components/compose/post-composer";
import { PlatformSelector } from "@/components/compose/platform-selector";
import { AiAssist } from "@/components/compose/ai-assist";
import { Image, Video, Smile, Hash, Link2, Calendar, Send, Save, Sparkles, X } from "lucide-react";

export default function ComposePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Compose Post</h1>
        <p className="text-muted-foreground mt-1">
          Create and schedule content across all your platforms
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PostComposer />
        </div>
        <div className="space-y-6">
          <PlatformSelector />
          <AiAssist />
        </div>
      </div>
    </div>
  );
}
