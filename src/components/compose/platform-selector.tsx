"use client";

import { useAppStore } from "@/store";
import { cn, PLATFORMS, type PlatformKey } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle } from "lucide-react";

const platforms: { key: PlatformKey; characterLimit: number }[] = [
  { key: "twitter", characterLimit: 280 },
  { key: "instagram", characterLimit: 2200 },
  { key: "linkedin", characterLimit: 3000 },
  { key: "facebook", characterLimit: 63206 },
  { key: "tiktok", characterLimit: 2200 },
  { key: "youtube", characterLimit: 5000 },
];

export function PlatformSelector() {
  const { selectedPlatforms, setSelectedPlatforms, accounts } = useAppStore();

  const togglePlatform = (platform: PlatformKey) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Platforms</h3>
        <Badge variant="secondary">{selectedPlatforms.length} selected</Badge>
      </div>

      <div className="space-y-2">
        {platforms.map(({ key, characterLimit }) => {
          const isSelected = selectedPlatforms.includes(key);
          const account = accounts.find((a) => a.platform === key);
          const isConnected = account?.connected ?? false;

          return (
            <button
              key={key}
              onClick={() => togglePlatform(key)}
              disabled={!isConnected}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/50 hover:bg-muted",
                !isConnected && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: PLATFORMS[key].color }}
              >
                {key[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {PLATFORMS[key].name}
                  </span>
                  {!isConnected && (
                    <AlertCircle className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? `${characterLimit.toLocaleString()} char limit`
                    : "Not connected"}
                </p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Posts will be optimized for each platform automatically. Line breaks
            and mentions will be adjusted as needed.
          </p>
        </div>
      )}
    </div>
  );
}
