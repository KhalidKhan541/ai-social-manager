import { getCache, setCache } from "./cache";

const FEATURE_FLAGS_PREFIX = "ff:";
const FLAGS_CACHE_TTL = 300;

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: "boolean" | "percentage" | "user_segment" | "plan_based";
  value?: boolean | number | string[];
  metadata?: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
  };
}

export interface FeatureFlagEvaluation {
  key: string;
  enabled: boolean;
  variant?: string;
  reason: string;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: "ai_content_generation",
    name: "AI Content Generation",
    description: "Enable AI-powered content generation features",
    enabled: true,
    type: "boolean",
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Enable advanced analytics and reporting features",
    enabled: true,
    type: "boolean",
  },
  {
    key: "team_collaboration",
    name: "Team Collaboration",
    description: "Enable team collaboration features",
    enabled: true,
    type: "plan_based",
    value: ["starter", "professional", "enterprise"],
  },
  {
    key: "api_access",
    name: "API Access",
    description: "Enable API access for integrations",
    enabled: true,
    type: "plan_based",
    value: ["professional", "enterprise"],
  },
  {
    key: "custom_branding",
    name: "Custom Branding",
    description: "Enable custom branding features",
    enabled: true,
    type: "plan_based",
    value: ["starter", "professional", "enterprise"],
  },
  {
    key: "social_inbox",
    name: "Social Inbox",
    description: "Enable unified social inbox feature",
    enabled: true,
    type: "boolean",
  },
  {
    key: "post_scheduling",
    name: "Post Scheduling",
    description: "Enable post scheduling feature",
    enabled: true,
    type: "boolean",
  },
  {
    key: "content_calendar",
    name: "Content Calendar",
    description: "Enable content calendar feature",
    enabled: true,
    type: "boolean",
  },
  {
    key: "multi_user_access",
    name: "Multi-User Access",
    description: "Enable multi-user access for team accounts",
    enabled: false,
    type: "boolean",
  },
  {
    key: "beta_features",
    name: "Beta Features",
    description: "Enable beta features for testing",
    enabled: false,
    type: "percentage",
    value: 10,
  },
];

let flagsCache: FeatureFlag[] | null = null;

async function loadFlags(): Promise<FeatureFlag[]> {
  if (flagsCache) return flagsCache;

  const cached = await getCache<FeatureFlag[]>("feature_flags");
  if (cached) {
    flagsCache = cached;
    return cached;
  }

  flagsCache = DEFAULT_FLAGS;
  await setCache("feature_flags", DEFAULT_FLAGS, FLAGS_CACHE_TTL);
  return flagsCache;
}

export async function isFeatureEnabled(
  key: string,
  context?: {
    userId?: string;
    plan?: string;
    percentage?: number;
  }
): Promise<boolean> {
  const evaluation = await evaluateFeatureFlag(key, context);
  return evaluation.enabled;
}

export async function evaluateFeatureFlag(
  key: string,
  context?: {
    userId?: string;
    plan?: string;
    percentage?: number;
  }
): Promise<FeatureFlagEvaluation> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag) {
    return {
      key,
      enabled: false,
      reason: "Flag not found",
    };
  }

  if (!flag.enabled) {
    return {
      key,
      enabled: false,
      reason: "Flag is disabled",
    };
  }

  switch (flag.type) {
    case "boolean":
      return {
        key,
        enabled: true,
        reason: "Flag is enabled",
      };

    case "percentage": {
      const percentage = flag.value as number;
      const userHash = context?.userId
        ? hashString(context.userId)
        : Math.random() * 100;
      const enabled = userHash % 100 < percentage;
      return {
        key,
        enabled,
        reason: enabled
          ? `User within ${percentage}% rollout`
          : `User outside ${percentage}% rollout`,
      };
    }

    case "plan_based": {
      const allowedPlans = flag.value as string[];
      const userPlan = context?.plan || "free";
      const enabled = allowedPlans.includes(userPlan);
      return {
        key,
        enabled,
        reason: enabled
          ? `Plan ${userPlan} is allowed`
          : `Plan ${userPlan} is not allowed`,
      };
    }

    case "user_segment": {
      const segments = flag.value as string[];
      const enabled = segments.includes(context?.userId || "");
      return {
        key,
        enabled,
        reason: enabled
          ? "User is in target segment"
          : "User is not in target segment",
      };
    }

    default:
      return {
        key,
        enabled: false,
        reason: "Unknown flag type",
      };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function getAllFlags(
  context?: {
    userId?: string;
    plan?: string;
  }
): Promise<FeatureFlagEvaluation[]> {
  const flags = await loadFlags();
  const evaluations: FeatureFlagEvaluation[] = [];

  for (const flag of flags) {
    const evaluation = await evaluateFeatureFlag(flag.key, context);
    evaluations.push(evaluation);
  }

  return evaluations;
}

export async function getFlagValue<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag || !flag.enabled) {
    return defaultValue;
  }

  return (flag.value as T) ?? defaultValue;
}

export async function setFeatureFlag(
  flag: Partial<FeatureFlag> & { key: string }
): Promise<void> {
  const flags = await loadFlags();
  const existingIndex = flags.findIndex((f) => f.key === flag.key);

  const updatedFlag: FeatureFlag = {
    key: flag.key,
    name: flag.name || flag.key,
    description: flag.description || "",
    enabled: flag.enabled ?? true,
    type: flag.type || "boolean",
    value: flag.value,
    metadata: {
      createdBy: flag.metadata?.createdBy || "system",
      createdAt: flag.metadata?.createdAt || new Date(),
      updatedAt: new Date(),
      expiresAt: flag.metadata?.expiresAt,
    },
  };

  if (existingIndex >= 0) {
    flags[existingIndex] = updatedFlag;
  } else {
    flags.push(updatedFlag);
  }

  flagsCache = flags;
  await setCache("feature_flags", flags, FLAGS_CACHE_TTL);
}

export async function deleteFeatureFlag(key: string): Promise<boolean> {
  const flags = await loadFlags();
  const initialLength = flags.length;
  const filtered = flags.filter((f) => f.key !== key);

  if (filtered.length === initialLength) {
    return false;
  }

  flagsCache = filtered;
  await setCache("feature_flags", filtered, FLAGS_CACHE_TTL);
  return true;
}

export async function getFeatureFlagsByType(
  type: FeatureFlag["type"]
): Promise<FeatureFlag[]> {
  const flags = await loadFlags();
  return flags.filter((f) => f.type === type);
}

export async function getEnabledFlags(): Promise<FeatureFlag[]> {
  const flags = await loadFlags();
  return flags.filter((f) => f.enabled);
}

export async function getDisabledFlags(): Promise<FeatureFlag[]> {
  const flags = await loadFlags();
  return flags.filter((f) => !f.enabled);
}

export async function toggleFeatureFlag(key: string): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag) {
    return false;
  }

  flag.enabled = !flag.enabled;
  flag.metadata = {
    ...flag.metadata,
    createdBy: flag.metadata?.createdBy || "system",
    createdAt: flag.metadata?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  flagsCache = flags;
  await setCache("feature_flags", flags, FLAGS_CACHE_TTL);
  return flag.enabled;
}

export function clearFlagsCache(): void {
  flagsCache = null;
}

export function getClientFlags(): Array<{ key: string; enabled: boolean }> {
  const publicFlags = DEFAULT_FLAGS.filter(
    (f) => !["user_segment", "plan_based"].includes(f.type)
  );
  return publicFlags.map((f) => ({ key: f.key, enabled: f.enabled }));
}
