import { useState, useCallback, useEffect, useRef } from "react";

interface UseCharacterCountOptions {
  maxLength?: number;
  minLength?: number;
  countSpaces?: boolean;
  countNewlines?: boolean;
  onLimitReached?: () => void;
  onWarning?: (remaining: number) => void;
  warningThreshold?: number;
}

interface UseCharacterCountResult {
  value: string;
  setValue: (value: string) => void;
  characterCount: number;
  wordCount: number;
  lineCount: number;
  remaining: number;
  isOverLimit: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean;
  percentage: number;
  status: "normal" | "warning" | "error";
  clear: () => void;
  insertText: (text: string, position?: number) => void;
  deleteText: (start: number, end: number) => void;
}

export function useCharacterCount(
  initialValue: string = "",
  options?: UseCharacterCountOptions
): UseCharacterCountResult {
  const {
    maxLength = Infinity,
    minLength = 0,
    countSpaces = true,
    countNewlines = true,
    onLimitReached,
    onWarning,
    warningThreshold = 10,
  } = options || {};

  const [value, setValueState] = useState(initialValue);
  const prevValueRef = useRef(initialValue);
  const onLimitReachedRef = useRef(onLimitReached);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onLimitReachedRef.current = onLimitReached;
  }, [onLimitReached]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  const getCharacterCount = useCallback(
    (text: string): number => {
      let count = text.length;
      if (!countSpaces) {
        count = text.replace(/\s/g, "").length;
      }
      if (!countNewlines) {
        count = text.replace(/\n/g, "").length;
      }
      return count;
    },
    [countSpaces, countNewlines]
  );

  const characterCount = getCharacterCount(value);
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value.split("\n").length;
  const remaining = maxLength - characterCount;
  const isOverLimit = characterCount > maxLength;
  const isAtLimit = characterCount === maxLength;
  const isNearLimit = remaining <= warningThreshold && remaining > 0;
  const percentage = Math.min(100, (characterCount / maxLength) * 100);

  let status: "normal" | "warning" | "error" = "normal";
  if (isOverLimit) {
    status = "error";
  } else if (isNearLimit) {
    status = "warning";
  }

  useEffect(() => {
    if (prevValueRef.current !== value) {
      if (characterCount >= maxLength && prevValueRef.current.length < value.length) {
        onLimitReachedRef.current?.();
      }
      
      if (isNearLimit && characterCount > prevValueRef.current.length) {
        onWarningRef.current?.(remaining);
      }
      
      prevValueRef.current = value;
    }
  }, [value, characterCount, maxLength, isNearLimit, remaining]);

  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
    },
    []
  );

  const clear = useCallback(() => {
    setValueState("");
  }, []);

  const insertText = useCallback(
    (text: string, position?: number) => {
      const pos = position ?? value.length;
      const newValue = value.slice(0, pos) + text + value.slice(pos);
      setValueState(newValue);
    },
    [value]
  );

  const deleteText = useCallback(
    (start: number, end: number) => {
      const newValue = value.slice(0, start) + value.slice(end);
      setValueState(newValue);
    },
    [value]
  );

  return {
    value,
    setValue,
    characterCount,
    wordCount,
    lineCount,
    remaining,
    isOverLimit,
    isAtLimit,
    isNearLimit,
    percentage,
    status,
    clear,
    insertText,
    deleteText,
  };
}

export function usePlatformCharacterCount(
  platform: string,
  initialValue: string = ""
): UseCharacterCountResult & {
  platformName: string;
  platformLimit: number;
  isOverPlatformLimit: boolean;
} {
  const PLATFORM_LIMITS: Record<string, number> = {
    twitter: 280,
    instagram: 2200,
    facebook: 63206,
    linkedin: 3000,
    tiktok: 2200,
    pinterest: 500,
    youtube: 5000,
  };

  const limit = PLATFORM_LIMITS[platform.toLowerCase()] || 280;

  const charCount = useCharacterCount(initialValue, {
    maxLength: limit,
    countSpaces: true,
    countNewlines: true,
  });

  return {
    ...charCount,
    platformName: platform,
    platformLimit: limit,
    isOverPlatformLimit: charCount.isOverLimit,
  };
}

export function useMultiPlatformCharacterCount(
  platforms: string[],
  initialValue: string = ""
): {
  value: string;
  setValue: (value: string) => void;
  platformCounts: Array<{
    platform: string;
    limit: number;
    count: number;
    remaining: number;
    isOverLimit: boolean;
    percentage: number;
  }>;
  worstPlatform: string | null;
  isOverAnyLimit: boolean;
  clear: () => void;
} {
  const PLATFORM_LIMITS: Record<string, number> = {
    twitter: 280,
    instagram: 2200,
    facebook: 63206,
    linkedin: 3000,
    tiktok: 2200,
    pinterest: 500,
    youtube: 5000,
  };

  const [value, setValue] = useState(initialValue);

  const platformCounts = platforms.map((platform) => {
    const limit = PLATFORM_LIMITS[platform.toLowerCase()] || 280;
    const count = value.length;
    const remaining = limit - count;
    const isOverLimit = count > limit;
    const percentage = Math.min(100, (count / limit) * 100);

    return {
      platform,
      limit,
      count,
      remaining,
      isOverLimit,
      percentage,
    };
  });

  const worstPlatform = platformCounts
    .filter((p) => p.isOverLimit)
    .sort((a, b) => a.remaining - b.remaining)[0]?.platform || null;

  const isOverAnyLimit = platformCounts.some((p) => p.isOverLimit);

  const clear = useCallback(() => {
    setValue("");
  }, []);

  return {
    value,
    setValue,
    platformCounts,
    worstPlatform,
    isOverAnyLimit,
    clear,
  };
}

export function useCharacterCounter(
  initialValue: string = "",
  options?: {
    maxLength?: number;
    showWarning?: boolean;
    warningThreshold?: number;
  }
): {
  value: string;
  setValue: (value: string) => void;
  count: number;
  maxLength: number;
  remaining: number;
  isOverLimit: boolean;
  shouldShowWarning: boolean;
  percentage: number;
  reset: () => void;
} {
  const {
    maxLength = 280,
    showWarning = true,
    warningThreshold = 20,
  } = options || {};

  const [value, setValueState] = useState(initialValue);

  const count = value.length;
  const remaining = maxLength - count;
  const isOverLimit = count > maxLength;
  const shouldShowWarning = showWarning && remaining <= warningThreshold && remaining > 0;
  const percentage = Math.min(100, (count / maxLength) * 100);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
  }, []);

  const reset = useCallback(() => {
    setValueState(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    count,
    maxLength,
    remaining,
    isOverLimit,
    shouldShowWarning,
    percentage,
    reset,
  };
}
