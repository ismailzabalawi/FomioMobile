import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

// Feed item types
export interface FeedItem {
  id: number;
  title: string;
  excerpt: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isArchived: boolean;
  lastPostedAt: string;
  lastPoster: {
    username: string;
    name: string;
  };
  views: number;
  slug: string;
  url: string;
}

export interface FeedFilters {
  category?: string;
  tags?: string[];
  author?: string;
  search?: string;
  sort?: 'latest' | 'popular' | 'unread' | 'top';
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
}

export interface FeedState {
  items: FeedItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  currentPage: number;
  totalItems: number;
}

const ITEMS_PER_PAGE = 20;

export function useFeed(filters: FeedFilters = {}) {
  const [state, setState] = useState<FeedState>({
    items: [],
    isLoading: false,
    isRefreshing: false,
    hasError: false,
    hasMore: true,
    currentPage: 0,
    totalItems: 0,
  });

  const [filtersState, setFiltersState] = useState<FeedFilters>(filters);

  // Load feed items
  const loadFeed = useCallback(async (page: number = 0, isRefresh: boolean = false) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        hasError: false,
        errorMessage: undefined,
      }));

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', ITEMS_PER_PAGE.toString());

      // Add filters
      if (filtersState.category) {
        params.append('category', filtersState.category);
      }
      if (filtersState.tags && filtersState.tags.length > 0) {
        params.append('tags', filtersState.tags.join(','));
      }
      if (filtersState.author) {
        params.append('author', filtersState.author);
      }
      if (filtersState.search) {
        params.append('q', filtersState.search);
      }
      if (filtersState.sort) {
        params.append('order', filtersState.sort);
      }
      if (filtersState.period) {
        params.append('period', filtersState.period);
      }

      // Get topics from Discourse
      const response = await discourseApi.getTopics(params.toString());
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load feed');
      }

             // Get categories for better category information
      let categoriesMap = new Map();
      try {
        const categoriesResponse = await discourseApi.getCategories();
        if (categoriesResponse.success && categoriesResponse.data) {
          categoriesResponse.data.category_list.categories.forEach((cat: any) => {
            categoriesMap.set(cat.id, {
              id: cat.id,
              name: cat.name,
              color: cat.color || '#000000',
              slug: cat.slug,
            });
          });
        }
      } catch (error) {
        console.log('Failed to fetch categories:', error);
      }

      // Transform Discourse topics to FeedItems
      const transformedItems = response.data.topic_list.topics.map((topic: any) => {
        // Debug: Log the first topic to see the structure
        if (topic.id === response.data.topic_list.topics[0].id) {
          console.log('🔍 First topic structure:', JSON.stringify(topic, null, 2));
        }
        
        // Get the topic creator from posters array
        const creator = topic.posters?.find((poster: any) => 
          poster.description?.includes('Original Poster') || poster.extras?.includes('single')
        ) || topic.posters?.[0];
        
        // Get category information
        const categoryInfo = categoriesMap.get(topic.category_id) || {
          id: topic.category_id,
          name: 'Uncategorized',
          color: '#000000',
          slug: 'uncategorized',
        };
        
        // Get user information from last_poster_username
        const authorInfo = {
          username: topic.last_poster_username || 'unknown',
          name: topic.last_poster_username || 'Unknown User',
          avatar: discourseApi.getAvatarUrl('', 40), // Will be updated when we get user details
        };
        
        const transformedItem = {
          id: topic.id,
          title: topic.title,
          excerpt: topic.excerpt || '',
          author: authorInfo,
          category: categoryInfo,
          tags: topic.tags || [],
          createdAt: topic.created_at,
          updatedAt: topic.updated_at,
          replyCount: topic.reply_count,
          likeCount: topic.like_count,
          isPinned: topic.pinned,
          isClosed: topic.closed,
          isArchived: topic.archived,
          lastPostedAt: topic.last_posted_at,
          lastPoster: {
            username: topic.last_poster_username || 'unknown',
            name: topic.last_poster_username || 'Unknown User',
          },
          views: topic.views,
          slug: topic.slug,
          url: `${discourseApi.getBaseUrl()}/t/${topic.slug}/${topic.id}`,
        };
        
        // Debug: Log the transformed item
        if (topic.id === response.data.topic_list.topics[0].id) {
          console.log('🔍 Transformed item:', JSON.stringify(transformedItem, null, 2));
        }
        
        return transformedItem;
      });

      setState(prev => ({
        ...prev,
        items: isRefresh ? transformedItems : [...prev.items, ...transformedItems],
        isLoading: false,
        isRefreshing: false,
        hasMore: transformedItems.length === ITEMS_PER_PAGE,
        currentPage: page,
        totalItems: response.data.topic_list.topics.length,
      }));

    } catch (error) {
      logger.error('Failed to load feed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load feed',
      }));
    }
  }, [filtersState]);

  // Load initial feed
  useEffect(() => {
    loadFeed(0, true);
  }, [loadFeed]);

  // Refresh feed
  const refresh = useCallback(() => {
    loadFeed(0, true);
  }, [loadFeed]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!state.isLoading && state.hasMore && !state.hasError) {
      loadFeed(state.currentPage + 1, false);
    }
  }, [state.isLoading, state.hasMore, state.hasError, state.currentPage, loadFeed]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FeedFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear feed
  const clearFeed = useCallback(() => {
    setState(prev => ({
      ...prev,
      items: [],
      currentPage: 0,
      hasMore: true,
      hasError: false,
      errorMessage: undefined,
    }));
  }, []);

  // Retry loading
  const retry = useCallback(() => {
    if (state.hasError) {
      loadFeed(state.currentPage, true);
    }
  }, [state.hasError, state.currentPage, loadFeed]);

  return {
    ...state,
    refresh,
    loadMore,
    updateFilters,
    clearFeed,
    retry,
    filters: filtersState,
  };
}

