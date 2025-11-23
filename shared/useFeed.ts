import { useState, useEffect, useCallback, useRef } from 'react';
import { discourseApi, Hub } from './discourseApi';
import { onAuthEvent } from './auth-events';
import { topicSummaryToByte } from './adapters/topicSummaryToByte';
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

      let queryParams = '';
      let topics: any[] = [];
      let categories: any[] = [];

      if (filters.hubId) {
        // For category, use getCategoryTopics
        const categoryResponse = await discourseApi.getCategoryTopics(String(filters.hubId), page > 0 ? `page=${page}` : '');
        if (!categoryResponse.success || !categoryResponse.data?.topic_list?.topics) {
          throw new Error(categoryResponse.error || 'Failed to load feed');
        }
        topics = categoryResponse.data.topic_list.topics;
        categories = categoryResponse.data.categories || [];
      } else {
        // For latest feed
        if (page > 0) {
          queryParams = `page=${page}`;
        }
        const rawResponse = await discourseApi.getTopics(queryParams);
        if (!rawResponse.success || !rawResponse.data?.topic_list?.topics) {
          throw new Error(rawResponse.error || 'Failed to load feed');
        }
        topics = rawResponse.data.topic_list.topics;
        categories = rawResponse.data.categories || [];
      }

      // Build category map from categories array
      const categoryMap = new Map();
      categories.forEach((cat: any) => {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          color: cat.color,
        });
      });

      console.log('🔍 useFeed: Category extraction', {
        categoriesCount: categories.length,
        categoryMapSize: categoryMap.size,
        sampleCategories: Array.from(categoryMap.entries()).slice(0, 3),
        firstTopicCategoryId: topics[0]?.category_id,
        firstTopicHasCategory: !!categoryMap.get(topics[0]?.category_id),
      });

      // Enrich topics with category data before mapping
      const enrichedTopics = topics.map((topic: any) => ({
        ...topic,
        category: categoryMap.get(topic.category_id) || null,
      }));

      console.log('🔍 useFeed: After enrichment', {
        firstTopicCategory: enrichedTopics[0]?.category,
        topicsWithCategory: enrichedTopics.filter(t => t.category).length,
        totalTopics: enrichedTopics.length,
      });

      // Map topics to bytes using simple summary adapter
      // No user resolution - adapter uses data directly from API response
      const newBytes: FeedByte[] = enrichedTopics.map((topic: any) => {
        return topicSummaryToByte(topic);
      });

      console.log('🔍 useFeed: Response received', {
        success: true,
        bytesCount: newBytes.length,
      });

      if (newBytes.length > 0) {
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
        throw new Error('No bytes returned from feed');
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

