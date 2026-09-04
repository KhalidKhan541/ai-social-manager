import { useState, useEffect, useCallback, useRef } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export function useDebouncedValue<T>(
  value: T,
  delay: number,
  options?: {
    leading?: boolean;
    trailing?: boolean;
  }
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const lastValueRef = useRef(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledLeadingRef = useRef(false);

  useEffect(() => {
    const { leading = false, trailing = true } = options || {};
    
    lastValueRef.current = value;

    if (leading && !hasCalledLeadingRef.current) {
      setDebouncedValue(value);
      hasCalledLeadingRef.current = true;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(lastValueRef.current);
        hasCalledLeadingRef.current = false;
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, options]);

  return debouncedValue;
}

export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 300
): {
  query: string;
  setQuery: (query: string) => void;
  results: T | null;
  isLoading: boolean;
  error: Error | null;
  clearResults: () => void;
} {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!searchQuery.trim()) {
        setResults(null);
        setIsLoading(false);
        return;
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchFn(searchQuery);
        setResults(result);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [searchFn]
  );

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      debouncedSearch(query);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, delay, debouncedSearch]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setQuery("");
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults,
  };
}
