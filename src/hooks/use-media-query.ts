import { useState, useEffect, useCallback, useRef } from "react";

type MediaQueryType = "mobile" | "tablet" | "desktop" | "largeDesktop";

interface MediaQueryConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

const DEFAULT_BREAKPOINTS: MediaQueryConfig = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1280,
};

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

export function useBreakpoint(
  breakpoints: MediaQueryConfig = DEFAULT_BREAKPOINTS
): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  breakpoint: MediaQueryType;
  width: number;
} {
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === "undefined") return 0;
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < breakpoints.tablet;
  const isTablet =
    windowWidth >= breakpoints.tablet && windowWidth < breakpoints.desktop;
  const isDesktop =
    windowWidth >= breakpoints.desktop && windowWidth < breakpoints.largeDesktop;
  const isLargeDesktop = windowWidth >= breakpoints.largeDesktop;

  let breakpoint: MediaQueryType = "mobile";
  if (isLargeDesktop) breakpoint = "largeDesktop";
  else if (isDesktop) breakpoint = "desktop";
  else if (isTablet) breakpoint = "tablet";

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint,
    width: windowWidth,
  };
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersHighContrast(): boolean {
  return useMediaQuery("(prefers-contrast: high)");
}

export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(() => {
    if (typeof window === "undefined") return "landscape";
    return window.matchMedia("(orientation: portrait)").matches
      ? "portrait"
      : "landscape";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    
    const handleChange = (event: MediaQueryListEvent) => {
      setOrientation(event.matches ? "portrait" : "landscape");
    };

    mediaQuery.addEventListener("change", handleChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return orientation;
}

export function useHover(): [boolean, { onMouseEnter: () => void; onMouseLeave: () => void }] {
  const [isHovered, setIsHovered] = useState(false);

  const handlers = {
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: useCallback(() => setIsHovered(false), []),
  };

  return [isHovered, handlers];
}

export function useFocus(): [boolean, { onFocus: () => void; onBlur: () => void }] {
  const [isFocused, setIsFocused] = useState(false);

  const handlers = {
    onFocus: useCallback(() => setIsFocused(true), []),
    onBlur: useCallback(() => setIsFocused(false), []),
  };

  return [isFocused, handlers];
}

export function useActive(): [boolean, { onMouseDown: () => void; onMouseUp: () => void }] {
  const [isActive, setIsActive] = useState(false);

  const handlers = {
    onMouseDown: useCallback(() => setIsActive(true), []),
    onMouseUp: useCallback(() => setIsActive(false), []),
  };

  return [isActive, handlers];
}

export function useMediaDevice(): {
  isTouchDevice: boolean;
  hasHover: boolean;
  hasPointer: boolean;
  colorGamut: "srgb" | "p3" | "rec2020" | "unknown";
  dynamicRange: "high" | "standard" | "unknown";
} {
  const [deviceInfo] = useState(() => {
    if (typeof window === "undefined") {
      return {
        isTouchDevice: false,
        hasHover: true,
        hasPointer: true,
        colorGamut: "srgb" as const,
        dynamicRange: "standard" as const,
      };
    }

    const isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const hasPointer = window.matchMedia("(pointer: fine)").matches;
    
    let colorGamut: "srgb" | "p3" | "rec2020" | "unknown" = "unknown";
    if (window.matchMedia("(color-gamut: rec2020)").matches) {
      colorGamut = "rec2020";
    } else if (window.matchMedia("(color-gamut: p3)").matches) {
      colorGamut = "p3";
    } else if (window.matchMedia("(color-gamut: srgb)").matches) {
      colorGamut = "srgb";
    }

    let dynamicRange: "high" | "standard" | "unknown" = "unknown";
    if (window.matchMedia("(dynamic-range: high)").matches) {
      dynamicRange = "high";
    } else if (window.matchMedia("(dynamic-range: standard)").matches) {
      dynamicRange = "standard";
    }

    return {
      isTouchDevice,
      hasHover,
      hasPointer,
      colorGamut,
      dynamicRange,
    };
  });

  return deviceInfo;
}

export function useInViewport(
  options?: IntersectionObserverInit
): [boolean, React.RefObject<HTMLElement>] {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "0px",
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [isInView, ref as React.RefObject<HTMLElement>];
}

export function useElementSize(): {
  ref: React.RefObject<HTMLElement>;
  width: number;
  height: number;
} {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setSize({ width, height });
        }
      }
    );

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { ref, width: size.width, height: size.height };
}
