/**
 * TanStack Query (React Query) Configuration
 * 
 * Centralized QueryClient configuration with optimal settings for mobile.
 * Includes query key factory for consistent key generation across the app.
 */

import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persister for query cache persistence across app restarts
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'fomio-query-cache',
  throttleTime: 1000, // Throttle writes to AsyncStorage (1 second)
});

// Query client with optimized defaults for mobile
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 2 minutes (no refetch during this time)
      staleTime: 2 * 60 * 1000,
      
      // Keep cached data for 30 minutes (even when unused)
      gcTime: 30 * 60 * 1000,
      
      // Show cached data while refetching in background
      refetchOnMount: 'always', // Always refetch on mount, but show cached data first
      refetchOnWindowFocus: false, // Don't refetch on app focus (mobile doesn't use this)
      refetchOnReconnect: true, // Refetch when network reconnects
      
      // Retry configuration
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Network mode - only run queries when online
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

/**
 * Query key factory for consistent key generation across the app.
 * Using a factory ensures type-safe and consistent query keys.
 */
export const queryKeys = {
  // Feed queries
  feed: (filters?: { hubId?: number; sortBy?: string }) => 
    ['feed', filters] as const,
  
  // Topic queries
  topic: (topicId: number) => ['topic', topicId] as const,
  topicComments: (topicId: number) => ['topic', topicId, 'comments'] as const,
  
  // Category/Hub queries
  categories: () => ['categories'] as const,
  category: (categoryId: number) => ['category', categoryId] as const,
  hubs: () => ['hubs'] as const,
  hub: (hubId: number) => ['hub', hubId] as const,
  
  // User queries
  user: (username: string) => ['user', username] as const,
  userPosts: (username: string) => ['user', username, 'posts'] as const,
  userReplies: (username: string) => ['user', username, 'replies'] as const,
  userLikes: (username: string) => ['user', username, 'likes'] as const,
  userBookmarks: (username: string) => ['user', username, 'bookmarks'] as const,
  userRead: (username: string) => ['user', username, 'read'] as const,
  userVotes: (username: string) => ['user', username, 'votes'] as const,
  userSolved: (username: string) => ['user', username, 'solved'] as const,
  
  // Search queries
  search: (query: string, filters?: object) => 
    ['search', query, filters] as const,
  
  // Notification queries
  notifications: () => ['notifications'] as const,
  
  // Settings queries
  userSettings: (username: string) => ['user', username, 'settings'] as const,
} as const;

/**
 * Get cache statistics for debugging/monitoring
 */
export function getCacheStats() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  return {
    size: queries.length,
    queries: queries.map(q => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdatedAt: q.state.dataUpdatedAt,
      staleTime: new Date(q.state.dataUpdatedAt).toISOString(),
    })),
  };
}

/**
 * Clear all cached queries
 */
export function clearQueryCache() {
  queryClient.clear();
}

/**
 * Invalidate queries by key prefix
 */
export function invalidateQueriesByPrefix(prefix: string[]) {
  queryClient.invalidateQueries({ queryKey: prefix });
}

/**
 * Prefetch a query for faster navigation
 * Use this to prefetch data that the user is likely to need
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime?: number
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: staleTime ?? 2 * 60 * 1000, // Default 2 minutes
  });
}

/**
 * Prefetch an infinite query for faster navigation
 */
export async function prefetchInfiniteQuery<T>(
  queryKey: readonly unknown[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<T>,
  staleTime?: number
) {
  await queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: 0,
    staleTime: staleTime ?? 2 * 60 * 1000,
  });
}

/**
 * Set data directly in the cache (useful for optimistic updates)
 */
export function setQueryData<T>(queryKey: readonly unknown[], data: T) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Get data directly from the cache
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData(queryKey);
}

