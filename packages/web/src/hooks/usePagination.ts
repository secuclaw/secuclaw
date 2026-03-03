import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  options: UsePaginationOptions<T>
): UsePaginationReturn<T> {
  const { data, pageSize: initialPageSize = 20, initialPage = 1 } = options;
  
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const items = data.slice(startIndex, endIndex);

  const nextPage = useCallback(() => {
    if (hasNext) setPage(p => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage(p => p - 1);
  }, [hasPrev]);

  const goToPage = useCallback((targetPage: number) => {
    const clampedPage = Math.max(1, Math.min(targetPage, totalPages));
    setPage(clampedPage);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  };
}

interface UseInfiniteScrollOptions<T> {
  data: T[];
  pageSize?: number;
  threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T>(
  options: UseInfiniteScrollOptions<T>
): UseInfiniteScrollReturn<T> {
  const { data, pageSize = 20, threshold = 200 } = options;
  
  const [displayCount, setDisplayCount] = useState(pageSize);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = data.slice(0, displayCount);
  const hasMore = displayCount < data.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount(prev => Math.min(prev + pageSize, data.length));
    }
  }, [hasMore, pageSize, data.length]);

  const reset = useCallback(() => {
    setDisplayCount(pageSize);
  }, [pageSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore, threshold]);

  useEffect(() => {
    setDisplayCount(pageSize);
  }, [data, pageSize]);

  return {
    items,
    hasMore,
    loadMore,
    reset,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
  };
}

interface UseVirtualListOptions<T> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualListReturn<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
}

export function useVirtualList<T>(
  options: UseVirtualListOptions<T>
): UseVirtualListReturn<T> {
  const { data, itemHeight, containerHeight, overscan = 3 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = data.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = data.slice(startIndex, endIndex).map((item, i) => {
    const index = startIndex + i;
    return {
      index,
      item,
      style: {
        position: 'absolute' as const,
        top: index * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    };
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative' as const,
      },
      onScroll: handleScroll,
    },
  };
}

interface UseDebouncedSearchOptions {
  delay?: number;
  minChars?: number;
}

interface UseDebouncedSearchReturn {
  query: string;
  debouncedQuery: string;
  setQuery: (q: string) => void;
  isSearching: boolean;
}

export function useDebouncedSearch(
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const { delay = 300, minChars = 2 } = options;
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      if (query.length >= minChars || query.length === 0) {
        setDebouncedQuery(query);
      }
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, minChars]);

  return {
    query,
    debouncedQuery,
    setQuery,
    isSearching,
  };
}

export default {
  usePagination,
  useInfiniteScroll,
  useVirtualList,
  useDebouncedSearch,
};
