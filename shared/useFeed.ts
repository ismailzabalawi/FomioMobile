import { useState, useEffect, useCallback, useRef } from 'react';
import { discourseApi, Byte, Hub } from './discourseApi';
import { onAuthEvent } from './auth-events';

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
  const currentPageRef = useRef(0);

  // Load hubs for reference
  const loadHubs = useCallback(async () => {
    try {
      const response = await discourseApi.getHubs();
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
        currentPageRef.current = 0;
        setFeedState(prev => ({ ...prev, isLoading: true, error: null }));
      } else {
        setFeedState(prev => ({ ...prev, isRefreshing: true, error: null }));
      }

      const page = reset ? 0 : currentPageRef.current;

      console.log('🔍 useFeed: Loading feed', { 
        reset, 
        page, 
        hubId: filters.hubId 
      });

      const response = await discourseApi.getBytes(filters.hubId, page);

      console.log('🔍 useFeed: Response received', {
        success: response.success,
        bytesCount: response.data?.length || 0,
        error: response.error,
      });

      if (response.success && response.data) {
        const newBytes = response.data;
        currentPageRef.current = page + 1;
        
        setFeedState(prev => ({
          ...prev,
          bytes: reset ? newBytes : [...prev.bytes, ...newBytes],
          isLoading: false,
          isRefreshing: false,
          hasMore: newBytes.length === 20, // If we got a full page, there might be more
          currentPage: currentPageRef.current,
          error: null
        }));
        
        console.log('✅ useFeed: Successfully loaded', newBytes.length, 'bytes');
      } else {
        const errorMsg = response.error || 'Failed to load feed';
        console.error('❌ useFeed: Failed to load feed', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ useFeed: Exception caught', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load feed';
      setFeedState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage
      }));
    }
  }, [filters.hubId, filters.sortBy]);

  // Refresh feed
  const refresh = useCallback(async () => {
    await loadFeed(true);
  }, [loadFeed]);

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
    loadHubs();
  }, [filters.hubId, filters.sortBy]);

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        refresh();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [refresh]);

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

