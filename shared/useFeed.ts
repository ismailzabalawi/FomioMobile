/**
 * useFeed Hook - Feed data fetching with TanStack Query
 * 
 * Uses useInfiniteQuery for paginated feed data with caching,
 * background refetching, and stale-while-revalidate pattern.
 */

import { useCallback, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { onAuthEvent } from './auth-events';
import { topicSummaryToByte } from './adapters/topicSummaryToByte';
import { useAuth } from './auth-context';
import { queryKeys } from './query-client';
import type { Byte as FeedByte } from '@/types/byte';

export type FeedItem = FeedByte;

export interface FeedState {
  bytes: FeedByte[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

export interface FeedFilters {
  hubId?: number;
  sortBy?: 'latest' | 'hot' | 'unread';
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
}

interface FeedPageData {
  bytes: FeedByte[];
  page: number;
  hasMore: boolean;
}

/**
 * Fetch feed page from API
 */
async function fetchFeedPage(
  page: number,
  filters: FeedFilters
): Promise<FeedPageData> {
  let topics: any[] = [];
  let categories: any[] = [];

  if (filters.hubId) {
    // For category, use getCategoryTopics
    const categoryResponse = await discourseApi.getCategoryTopics(
      String(filters.hubId),
      page > 0 ? `page=${page}` : ''
    );

    if (!categoryResponse.success || !categoryResponse.data?.topic_list?.topics) {
      throw new Error(categoryResponse.error || 'Failed to load feed');
    }
    topics = categoryResponse.data.topic_list.topics;
    categories = categoryResponse.data.topic_list.categories || categoryResponse.data.categories || [];

    // If no categories in response, fetch them separately
    if (categories.length === 0) {
      try {
        const categoriesResponse = await discourseApi.getCategories(true);
        if (categoriesResponse.success && categoriesResponse.data?.category_list?.categories) {
          categories = categoriesResponse.data.category_list.categories;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch categories separately:', error);
      }
    }
  } else {
    // For latest feed
    const queryParams = page > 0 ? `page=${page}` : '';
    const rawResponse = await discourseApi.getTopics(queryParams);

    if (!rawResponse.success || !rawResponse.data?.topic_list?.topics) {
      throw new Error(rawResponse.error || 'Failed to load feed');
    }
    topics = rawResponse.data.topic_list.topics;
    categories = rawResponse.data.topic_list.categories || rawResponse.data.categories || [];

    // If no categories in response, fetch them separately
    if (categories.length === 0) {
      try {
        const categoriesResponse = await discourseApi.getCategories(true);
        if (categoriesResponse.success && categoriesResponse.data?.category_list?.categories) {
          categories = categoriesResponse.data.category_list.categories;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch categories separately:', error);
      }
    }
  }

  // Build category map
  const categoryMap = new Map();
  categories.forEach((cat: any) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      parent_category_id: cat.parent_category_id,
    });
  });

  // Enrich topics with category data
  const enrichedTopics = topics.map((topic: any) => {
    const category = topic.category_id != null
      ? categoryMap.get(topic.category_id) || null
      : null;
    let parentHub = null;

    if (category?.parent_category_id) {
      parentHub = categoryMap.get(category.parent_category_id) || null;
    }

    return {
      ...topic,
      category,
      parentHub,
    };
  });

  // Map topics to bytes
  const bytes: FeedByte[] = enrichedTopics
    .map((topic: any) => {
      try {
        const byte = topicSummaryToByte(topic);
        if (!byte || !byte.id || !byte.title) {
          return null;
        }
        return byte;
      } catch (error) {
        console.error(`❌ [useFeed] Failed to transform topic ${topic.id}:`, error);
        return null;
      }
    })
    .filter((byte): byte is FeedByte => byte !== null && byte !== undefined && !!byte.title);

  return {
    bytes,
    page,
    hasMore: topics.length === 20, // Full page means there might be more
  };
}

/**
 * useFeed hook with TanStack Query
 * 
 * Provides paginated feed data with caching, background refetching,
 * and optimistic updates. Maintains backward compatible interface.
 */
export function useFeed(filters: FeedFilters = {}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  // Query key includes filters and auth state for proper cache separation
  const feedQueryKey = queryKeys.feed({ hubId: filters.hubId, sortBy: filters.sortBy });

  const {
    data,
    isLoading: isQueryLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey: [...feedQueryKey, isAuthenticated],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchFeedPage(pageParam, filters);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !isAuthLoading, // Only run when auth is ready
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Show cached data but refetch in background
  });

  // Flatten pages into single array of bytes
  const items: FeedByte[] = data?.pages.flatMap((page) => page.bytes) ?? [];

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        // Invalidate feed queries to refetch with new auth state
        queryClient.invalidateQueries({ queryKey: feedQueryKey });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [queryClient, feedQueryKey]);

  // Refresh feed - invalidates cache and refetches
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: feedQueryKey });
  }, [queryClient, feedQueryKey]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Retry on error
  const retry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Compute loading states for backward compatibility
  // isLoading is true only on initial load when there's no cached data
  const isLoading = isAuthLoading || (isQueryLoading && items.length === 0);
  // isRefreshing is true when refetching in background with existing data
  const isRefreshing = isFetching && items.length > 0 && !isFetchingNextPage;

  // Error message extraction
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    // Feed data
    items,

    // Loading states (backward compatible)
    isLoading,
    isRefreshing,
    hasMore: hasNextPage ?? false,

    // Error handling
    hasError: !!error,
    errorMessage,

    // Actions
    refresh,
    loadMore,
    retry,

    // Filters
    currentFilters: filters,
  };
}
