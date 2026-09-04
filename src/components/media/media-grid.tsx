"use client";

import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Video,
  FileImage,
  Upload,
  Trash2,
  Download,
  Eye,
  Grid,
  List,
  Search,
  Filter,
  FolderOpen,
} from "lucide-react";

interface MediaGridProps {
  items?: Array<{
    id: string;
    url: string;
    type: "image" | "video" | "gif";
    name: string;
    size: number;
    createdAt: string;
  }>;
}

const defaultItems = [
  { id: "1", type: "image" as const, name: "Product Hero Shot", size: 2400000 },
  { id: "2", type: "video" as const, name: "Demo Video", size: 15000000 },
  { id: "3", type: "image" as const, name: "Team Photo", size: 3200000 },
  { id: "4", type: "image" as const, name: "Infographic", size: 1800000 },
  { id: "5", type: "gif" as const, name: "Logo Animation", size: 800000 },
  { id: "6", type: "image" as const, name: "Campaign Banner", size: 2100000 },
  { id: "7", type: "video" as const, name: "Tutorial Clip", size: 28000000 },
  { id: "8", type: "image" as const, name: "Social Template", size: 1200000 },
  { id: "9", type: "image" as const, name: "Brand Assets", size: 900000 },
];

const typeIcons: Record<string, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  gif: FileImage,
};

const typeColors: Record<string, string> = {
  image: "from-blue-500 to-cyan-400",
  video: "from-purple-500 to-pink-400",
  gif: "from-orange-500 to-yellow-400",
};

export function MediaGrid({ items }: MediaGridProps) {
  const mediaItems = items ?? defaultItems;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mediaItems.map((item) => {
          const Icon = typeIcons[item.type] || ImageIcon;
          return (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden border bg-card hover:shadow-lg transition-all cursor-pointer aspect-square"
            >
              {/* Preview */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br flex items-center justify-center",
                  typeColors[item.type]
                )}
              >
                <Icon className="w-8 h-8 text-white/60" />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-white/20 hover:bg-white/30 border-0"
                >
                  <Eye className="w-4 h-4 text-white" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-white/20 hover:bg-white/30 border-0"
                >
                  <Download className="w-4 h-4 text-white" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-white/20 hover:bg-white/30 border-0"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </Button>
              </div>

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[11px] text-white font-medium truncate">
                  {item.name}
                </p>
                <p className="text-[10px] text-white/70">
                  {formatFileSize(item.size)}
                </p>
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 right-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-black/40 uppercase">
                  {item.type}
                </span>
              </div>
            </div>
          );
        })}

        {/* Upload Card */}
        <button className="aspect-square rounded-xl border-2 border-dashed bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
          <Upload className="w-8 h-8" />
          <span className="text-xs font-medium">Upload Media</span>
        </button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}
