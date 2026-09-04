import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
  siblingCount?: number;
}

interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  isFirst: boolean;
  isLast: boolean;
  startIndex: number;
  endIndex: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
  getPageItems: (items: T[]) => T[];
  getVisiblePages: () => (number | "ellipsis")[];
}

export function usePagination<T = unknown>(
  options?: UsePaginationOptions
): UsePaginationResult<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    total: initialTotal = 0,
    siblingCount = 1,
  } = options || {};

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotalState] = useState(initialTotal);

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const isFirst = page === 1;
  const isLast = page === totalPages || totalPages === 0;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, total - 1);

  const setPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages || 1));
      setPageState(clampedPage);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal);
  }, []);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPageState((prev) => prev + 1);
    }
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPageState((prev) => prev - 1);
    }
  }, [hasPrev]);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages || 1);
  }, [totalPages]);

  const goToPage = useCallback(
    (targetPage: number) => {
      setPage(targetPage);
    },
    [setPage]
  );

  const getPageItems = useCallback(
    (items: T[]): T[] => {
      return items.slice(startIndex, startIndex + pageSize);
    },
    [startIndex, pageSize]
  );

  const getVisiblePages = useCallback((): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 0) return pages;

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      pages.push(...leftRange);
      pages.push("ellipsis");
    } else if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      pages.push("ellipsis");
      pages.push(...rightRange);
    } else if (showLeftEllipsis && showRightEllipsis) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      pages.push(1);
      pages.push("ellipsis");
      pages.push(...middleRange);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else {
      const fullRange = Array.from({ length: totalPages }, (_, i) => i + 1);
      pages.push(...fullRange);
    }

    return pages;
  }, [page, totalPages, siblingCount]);

  return {
    page,
    pageSize,
    totalPages,
    total,
    hasNext,
    hasPrev,
    isFirst,
    isLast,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    goToPage,
    getPageItems,
    getVisiblePages,
  };
}

export function useCursorPagination<T = unknown>(
  options?: {
    initialCursor?: string | null;
    pageSize?: number;
  }
): {
  cursor: string | null;
  data: T[];
  isLoading: boolean;
  hasNext: boolean;
  setCursor: (cursor: string | null) => void;
  setData: (data: T[]) => void;
  appendData: (newData: T[], nextCursor: string | null) => void;
  reset: () => void;
} {
  const { initialCursor = null, pageSize = 20 } = options || {};

  const [cursor, setCursorState] = useState<string | null>(initialCursor);
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNext, setHasNext] = useState(true);

  const setCursor = useCallback((newCursor: string | null) => {
    setCursorState(newCursor);
  }, []);

  const appendData = useCallback(
    (newData: T[], nextCursor: string | null) => {
      setData((prev) => [...prev, ...newData]);
      setCursorState(nextCursor);
      setHasNext(nextCursor !== null);
    },
    []
  );

  const reset = useCallback(() => {
    setCursorState(initialCursor);
    setData([]);
    setIsLoading(false);
    setHasNext(true);
  }, [initialCursor]);

  return {
    cursor,
    data,
    isLoading,
    hasNext,
    setCursor,
    setData,
    appendData,
    reset,
  };
}

export function usePaginatedSearch<T = unknown>(
  searchFn: (query: string, page: number, pageSize: number) => Promise<{
    data: T[];
    total: number;
  }>,
  options?: {
    pageSize?: number;
    debounceMs?: number;
  }
): {
  query: string;
  setQuery: (query: string) => void;
  data: T[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { pageSize = 20, debounceMs = 300 } = options || {};

  const [query, setQueryState] = useState("");
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);
      setPageState(1);
    },
    []
  );

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const reset = useCallback(() => {
    setQueryState("");
    setData([]);
    setTotal(0);
    setPageState(1);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    data,
    total,
    page,
    setPage,
    isLoading,
    error,
    reset,
  };
}

export function useInfiniteScrollPagination<T = unknown>(
  fetchFn: (cursor: string | null) => Promise<{
    data: T[];
    nextCursor: string | null;
  }>,
  options?: {
    enabled?: boolean;
  }
): {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNext: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
} {
  const { enabled = true } = options || {};

  const [data, setData] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPage = useCallback(
    async (currentCursor: string | null, append: boolean = false) => {
      if (!enabled) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetchFn(currentCursor);
        
        setData((prev) => (append ? [...prev, ...result.data] : result.data));
        setCursor(result.nextCursor);
        setHasNext(result.nextCursor !== null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fetchFn, enabled]
  );

  const loadMore = useCallback(() => {
    if (hasNext && !isLoadingMore) {
      loadPage(cursor, true);
    }
  }, [hasNext, isLoadingMore, cursor, loadPage]);

  const refresh = useCallback(() => {
    setData([]);
    setCursor(null);
    loadPage(null);
  }, [loadPage]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasNext,
    error,
    loadMore,
    refresh,
  };
}
