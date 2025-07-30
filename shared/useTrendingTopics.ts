import { useState, useCallback, useEffect } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface TrendingTopic {
  id: number;
  title: string;
  excerpt: string;
  slug: string;
  category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  createdAt: string;
  likeCount: number;
  replyCount: number;
  views: number;
  isTrending: boolean;
  url: string;
}

export interface TrendingTopicsState {
  topics: TrendingTopic[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function useTrendingTopics() {
  const [state, setState] = useState<TrendingTopicsState>({
    topics: [],
    isLoading: false,
    hasError: false,
  });

  const loadTrendingTopics = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
      }));

      // Get latest topics with high engagement (likes, replies, views)
      const response = await discourseApi.getTopics('?order=likes&period=weekly');
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load trending topics');
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
        console.log('Failed to fetch categories for trending topics:', error);
      }

      // Transform topics and determine trending status
      const topics = response.data.topic_list.topics.slice(0, 5).map((topic: any) => {
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

        // Determine if topic is trending based on engagement
        const isTrending = (topic.like_count > 5 || topic.reply_count > 3 || topic.views > 100);

        return {
          id: topic.id,
          title: topic.title,
          excerpt: topic.excerpt || '',
          slug: topic.slug,
          category: categoryInfo,
          author: creator?.user ? {
            username: creator.user.username,
            name: creator.user.name || creator.user.username,
            avatar: discourseApi.getAvatarUrl(creator.user.avatar_template || '', 40),
          } : {
            username: 'unknown',
            name: 'Unknown User',
            avatar: '',
          },
          tags: topic.tags || [],
          createdAt: topic.created_at,
          likeCount: topic.like_count || 0,
          replyCount: topic.reply_count || 0,
          views: topic.views || 0,
          isTrending,
          url: `${discourseApi.getBaseUrl()}/t/${topic.slug}/${topic.id}`,
        };
      });

      setState(prev => ({
        ...prev,
        topics,
        isLoading: false,
      }));

      logger.info('Trending topics loaded successfully', { count: topics.length });

    } catch (error) {
      logger.error('Failed to load trending topics', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load trending topics',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    if (state.hasError) {
      loadTrendingTopics();
    }
  }, [state.hasError, loadTrendingTopics]);

  // Load trending topics on mount
  useEffect(() => {
    loadTrendingTopics();
  }, [loadTrendingTopics]);

  return {
    ...state,
    loadTrendingTopics,
    retry,
  };
} 