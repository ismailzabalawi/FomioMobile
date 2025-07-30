import { useState, useEffect, useCallback } from 'react';
import { discourseApiService, Byte, Hub } from './discourseApiService';

export type FeedItem = Byte;

export interface FeedState {
  bytes: Byte[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

export interface FeedFilters {
  hubId?: number;
  sortBy?: 'latest' | 'hot' | 'top';
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export function useFeed(filters: FeedFilters = {}) {
  const [feedState, setFeedState] = useState<FeedState>({
    bytes: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    hasMore: true,
    currentPage: 0
  });

  const [hubs, setHubs] = useState<Hub[]>([]);

  // Load hubs for reference
  const loadHubs = useCallback(async () => {
    try {
      const response = await discourseApiService.getHubs();
      if (response.success && response.data) {
        setHubs(response.data);
      }
    } catch (error) {
      console.error('Failed to load hubs:', error);
    }
  }, []);

  // Load feed data
  const loadFeed = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setFeedState(prev => ({ ...prev, isLoading: true, error: null }));
      } else {
        setFeedState(prev => ({ ...prev, isRefreshing: true, error: null }));
      }

      const page = reset ? 0 : feedState.currentPage;
      const response = await discourseApiService.getBytes(filters.hubId, page);

      if (response.success && response.data) {
        const newBytes = response.data;
        
        setFeedState(prev => ({
          ...prev,
          bytes: reset ? newBytes : [...prev.bytes, ...newBytes],
          isLoading: false,
          isRefreshing: false,
          hasMore: newBytes.length === 20, // If we got a full page, there might be more
          currentPage: page + 1,
          error: null
        }));
      } else {
        throw new Error(response.error || 'Failed to load feed');
      }
    } catch (error) {
      console.error('Feed loading error:', error);
      setFeedState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Failed to load feed'
      }));
    }
  }, [filters.hubId, filters.sortBy, feedState.currentPage]);

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
    loadHubs();
  }, [filters.hubId, filters.sortBy]);

  // Refresh feed
  const refresh = useCallback(async () => {
    await loadFeed(true);
  }, [loadFeed]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (!feedState.isLoading && !feedState.isRefreshing && feedState.hasMore) {
      await loadFeed(false);
    }
  }, [loadFeed, feedState.isLoading, feedState.isRefreshing, feedState.hasMore]);

  // Retry on error
  const retry = useCallback(async () => {
    await loadFeed(true);
  }, [loadFeed]);

  return {
    // Feed data
    items: feedState.bytes,
    hubs,
    
    // Loading states
    isLoading: feedState.isLoading,
    isRefreshing: feedState.isRefreshing,
    hasMore: feedState.hasMore,
    
    // Error handling
    hasError: !!feedState.error,
    errorMessage: feedState.error,
    
    // Actions
    refresh,
    loadMore,
    retry,
    
    // Filters
    currentFilters: filters
  };
}

