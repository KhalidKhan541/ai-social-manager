import { useState, useEffect, useCallback, useRef } from "react";

interface UseFetchOptions extends RequestInit {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (url?: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

export function useFetch<T = unknown>(
  url: string | null,
  options?: UseFetchOptions
): UseFetchResult<T> {
  const { immediate = true, onSuccess, onError, onFinally, ...fetchOptions } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (executeUrl?: string, executeOptions?: RequestInit): Promise<T | null> => {
      const targetUrl = executeUrl || url;
      if (!targetUrl) return null;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(targetUrl, {
          ...fetchOptions,
          ...executeOptions,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        
        if (mountedRef.current) {
          setData(result);
          setIsLoading(false);
          onSuccess?.(result);
        }
        
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }

        if (mountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
        
        return null;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          onFinally?.();
        }
      }
    },
    [url, fetchOptions, onSuccess, onError, onFinally]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (immediate && url) {
      execute();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, immediate]);

  return {
    data,
    error,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    execute,
    reset,
  };
}

export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (
      data: TData | null,
      error: Error | null,
      variables: TVariables
    ) => void;
  }
): {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
} {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        
        if (mountedRef.current) {
          setData(result);
          setIsLoading(false);
          options?.onSuccess?.(result, variables);
          options?.onSettled?.(result, null, variables);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (mountedRef.current) {
          setError(error);
          setIsLoading(false);
          options?.onError?.(error, variables);
          options?.onSettled?.(null, error, variables);
        }
        
        throw error;
      }
    },
    [mutationFn, options]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {});
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    reset,
  };
}

export function useInfiniteScroll<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options?: {
    initialPage?: number;
    enabled?: boolean;
  }
): {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
} {
  const { initialPage = 1, enabled = true } = options || {};
  
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!enabled) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetchFn(pageNum);
        
        if (mountedRef.current) {
          setData((prev) => (append ? [...prev, ...result.data] : result.data));
          setHasMore(result.hasMore);
          setPage(pageNum);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [fetchFn, enabled]
  );

  useEffect(() => {
    loadPage(initialPage);
  }, [loadPage, initialPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadPage(page + 1, true);
    }
  }, [hasMore, isLoadingMore, page, loadPage]);

  const refresh = useCallback(() => {
    setData([]);
    loadPage(initialPage);
  }, [loadPage, initialPage]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
