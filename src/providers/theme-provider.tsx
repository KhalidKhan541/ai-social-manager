"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeContextValue {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  resolvedTheme: "light" | "dark";
  themes: string[];
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProviderCustom({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
  storageKey?: string;
}) {
  const [theme, setThemeState] = React.useState<"light" | "dark" | "system">(
    () => {
      if (typeof window === "undefined") return defaultTheme;
      const stored = localStorage.getItem(storageKey) as typeof theme;
      return stored || defaultTheme;
    }
  );

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    "light"
  );

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let resolved = theme;
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      resolved = systemTheme;
    }

    root.classList.add(resolved);
    setResolvedTheme(resolved);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  React.useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      const newTheme = mediaQuery.matches ? "dark" : "light";
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = React.useCallback((newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
  }, []);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    resolvedTheme,
    themes: ["light", "dark", "system"],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
