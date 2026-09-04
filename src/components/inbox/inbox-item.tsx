"use client";

import { cn, PLATFORMS, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle,
  AtSign,
  Mail,
  Star,
  Reply,
  MoreHorizontal,
  Check,
  CheckCheck,
} from "lucide-react";

interface InboxItemProps {
  item: {
    id: string;
    platform: string;
    type: string;
    content: string;
    author: string;
    authorAvatar?: string;
    read: boolean;
    replied: boolean;
    createdAt: string;
  };
  onSelect?: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  comment: MessageCircle,
  mention: AtSign,
  dm: Mail,
  review: Star,
};

export function InboxItem({ item, onSelect }: InboxItemProps) {
  const TypeIcon = typeIcons[item.type] || MessageCircle;
  const platformColor =
    PLATFORMS[item.platform as keyof typeof PLATFORMS]?.color ?? "#888";

  return (
    <div
      onClick={() => onSelect?.(item.id)}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
        !item.read && "bg-primary/5 border-primary/20",
        item.read && "bg-card"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback
            className="text-xs font-semibold"
            style={{ backgroundColor: `${platformColor}20`, color: platformColor }}
          >
            {item.author
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: platformColor }}
        >
          <TypeIcon className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm">{item.author}</span>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {item.type}
          </Badge>
          {!item.read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
          {item.content}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.createdAt)}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
            style={{ backgroundColor: platformColor }}
          >
            {PLATFORMS[item.platform as keyof typeof PLATFORMS]?.name ?? item.platform}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Reply className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {item.replied ? (
            <CheckCheck className="w-4 h-4 text-green-500" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
