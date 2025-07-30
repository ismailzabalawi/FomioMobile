import { useState, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface SearchResult {
  id: number;
  type: 'topic' | 'category' | 'user';
  title: string;
  content?: string;
  excerpt?: string;
  author?: {
    username: string;
    name: string;
    avatar: string;
  };
  category?: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  tags?: string[];
  createdAt?: string;
  likeCount?: number;
  replyCount?: number;
  views?: number;
  isPinned?: boolean;
  isClosed?: boolean;
  isArchived?: boolean;
  url: string;
  slug?: string;
  relevance?: number;
  lastPostedAt?: string;
  lastPoster?: {
    username: string;
    name: string;
  };
}

export interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  query: string;
  hasSearched: boolean;
  totalResults?: number;
  searchType: 'quick' | 'full';
  filters: {
    type?: 'topic' | 'category' | 'user' | 'all';
    category?: string;
    tags?: string[];
    author?: string;
    order?: 'latest' | 'created' | 'updated' | 'views' | 'likes' | 'relevance';
    period?: 'all' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
  };
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    hasError: false,
    query: '',
    hasSearched: false,
    totalResults: 0,
    searchType: 'full',
    filters: {
      type: 'all',
      order: 'relevance',
      period: 'all',
    },
  });

  // Enhanced search with better error handling and options
  const search = useCallback(async (query: string, options: {
    type?: 'quick' | 'full';
    filters?: Partial<SearchState['filters']>;
  } = {}) => {
    const { type = 'full', filters = {} } = options;

    if (!query.trim()) {
      setState(prev => ({
        ...prev,
        results: [],
        query: '',
        hasSearched: false,
        totalResults: 0,
        searchType: type,
      }));
      return;
    }

    // Discourse requires minimum 3 characters for search
    if (query.trim().length < 3) {
      setState(prev => ({
        ...prev,
        results: [],
        query: query.trim(),
        hasSearched: false,
        totalResults: 0,
        searchType: type,
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
        query: query.trim(),
        hasSearched: true,
        searchType: type,
        filters: { ...prev.filters, ...filters },
      }));

      logger.info('Search started', { 
        query: query.trim(), 
        type, 
        filters: { ...state.filters, ...filters } 
      });

      let response;
      
      if (type === 'quick') {
        // Quick search for instant results
        response = await discourseApi.quickSearch(query.trim());
      } else {
        // Full search with all options
        response = await discourseApi.search(query.trim(), {
          type: 'all',
          limit: 30,
          includeBlurbs: true,
          order: 'relevance',
          period: 'all',
          ...filters,
        });
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search Discourse');
      }

      logger.info('Search response received', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        searchType: type,
        responseData: response.data, // Log the actual response data
      });

      // Transform search results based on Discourse API response format
      const results: SearchResult[] = [];

      // Handle topics from search results
      if (response.data.topics && Array.isArray(response.data.topics)) {
        logger.info('Processing topics', { 
          topicCount: response.data.topics.length,
          firstTopic: response.data.topics[0]
        });
        
        response.data.topics.forEach((topic: any) => {
          try {
            // For search results, we need to get author info from posts
            // Find the first post for this topic to get author info
            const firstPost = response.data.posts?.find((post: any) => post.topic_id === topic.id);
            
            logger.info('Processing topic', { 
              topicId: topic.id, 
              title: topic.title,
              hasCategory: !!topic.category,
              categoryName: topic.category?.name,
              hasFirstPost: !!firstPost,
              authorName: firstPost?.username,
            });

            const result: SearchResult = {
              id: topic.id,
              type: 'topic' as const,
              title: topic.title || topic.fancy_title || 'Untitled',
              content: topic.excerpt || '',
              excerpt: topic.excerpt || '',
              author: firstPost ? {
                username: firstPost.username || 'Unknown',
                name: firstPost.name || firstPost.username || 'Unknown',
                avatar: discourseApi.getAvatarUrl(firstPost.avatar_template || '', 40),
              } : {
                username: 'Unknown',
                name: 'Unknown',
                avatar: '',
              },
              category: topic.category ? {
                id: topic.category.id,
                name: topic.category.name,
                color: topic.category.color,
                slug: topic.category.slug,
              } : undefined,
              tags: topic.tags || [],
              createdAt: topic.created_at,
              likeCount: topic.like_count || 0,
              replyCount: topic.reply_count || 0,
              views: topic.views || 0,
              isPinned: topic.pinned || false,
              isClosed: topic.closed || false,
              isArchived: topic.archived || false,
              url: `${discourseApi.getBaseUrl()}/t/${topic.slug}/${topic.id}`,
              slug: topic.slug,
              lastPostedAt: topic.last_posted_at,
              lastPoster: topic.last_poster_username ? {
                username: topic.last_poster_username,
                name: topic.last_poster_username,
              } : undefined,
            };

            results.push(result);
          } catch (error) {
            logger.error('Error processing topic', { error, topicId: topic.id });
          }
        });
      } else {
        logger.info('No topics found in search response', { 
          hasTopics: !!response.data.topics,
          topicsType: typeof response.data.topics,
          isArray: Array.isArray(response.data.topics),
          availableKeys: Object.keys(response.data || {})
        });
      }

      // Handle categories from search results (if any)
      if (response.data.categories && Array.isArray(response.data.categories)) {
        logger.info('Processing categories', { categoryCount: response.data.categories.length });
        response.data.categories.forEach((category: any) => {
          const result: SearchResult = {
            id: category.id,
            type: 'category' as const,
            title: category.name,
            content: category.description || '',
            excerpt: category.description || '',
            category: {
              id: category.id,
              name: category.name,
              color: category.color,
              slug: category.slug,
            },
            createdAt: category.created_at,
            url: `${discourseApi.getBaseUrl()}/c/${category.slug}/${category.id}`,
            slug: category.slug,
          };
          results.push(result);
        });
      }

      // Handle users from search results (if any)
      if (response.data.users && Array.isArray(response.data.users)) {
        logger.info('Processing users', { userCount: response.data.users.length });
        response.data.users.forEach((user: any) => {
          const result: SearchResult = {
            id: user.id,
            type: 'user' as const,
            title: user.name || user.username,
            content: user.bio_raw || '',
            excerpt: user.bio_raw || '',
            author: {
              username: user.username,
              name: user.name || user.username,
              avatar: discourseApi.getAvatarUrl(user.avatar_template || '', 40),
            },
            createdAt: user.created_at,
            url: `${discourseApi.getBaseUrl()}/u/${user.username}`,
            slug: user.username,
          };
          results.push(result);
        });
      }

      logger.info('Search results transformed', {
        totalResults: results.length,
        topics: results.filter(r => r.type === 'topic').length,
        categories: results.filter(r => r.type === 'category').length,
        users: results.filter(r => r.type === 'user').length,
        searchType: type,
        finalResults: results, // Log the final results
      });

      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
        totalResults: results.length,
      }));

    } catch (error) {
      logger.error('Search failed', { error, query: query.trim(), type });
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Search failed',
        results: [],
        totalResults: 0,
      }));
    }
  }, [state.filters]);

  // Quick search for instant results
  const quickSearch = useCallback((query: string) => {
    search(query, { type: 'quick' });
  }, [search]);

  // Advanced search with filters
  const advancedSearch = useCallback((query: string, filters: SearchState['filters']) => {
    search(query, { type: 'full', filters });
  }, [search]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      query: '',
      hasSearched: false,
      totalResults: 0,
    }));
  }, []);

  // Retry search
  const retry = useCallback(() => {
    if (state.query.trim()) {
      search(state.query, { type: state.searchType });
    }
  }, [state.query, state.searchType, search]);

      return {
      // State
      results: state.results,
      isLoading: state.isLoading,
      hasError: state.hasError,
      errorMessage: state.errorMessage,
      query: state.query,
      hasSearched: state.hasSearched,
      totalResults: state.totalResults,
      searchType: state.searchType,
      filters: state.filters,
      
      // Actions
      search,
      quickSearch,
      advancedSearch,
      clearSearch,
      retry,
    };
} 