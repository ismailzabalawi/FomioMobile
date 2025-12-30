import { useState, useCallback, useEffect } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface RecentTopic {
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
  url: string;
}

export interface RecentTopicsState {
  topics: RecentTopic[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function useRecentTopics() {
  const [state, setState] = useState<RecentTopicsState>({
    topics: [],
    isLoading: false,
    hasError: false,
  });

  const loadRecentTopics = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
      }));

      // Get recent topics
      const response = await discourseApi.getTopics('?order=created&period=all');
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load recent topics');
      }

      // Extract users array from root level (not inside topic_list)
      const users = response.data?.users || [];

      // Build user map for username lookup (user_id -> user object)
      const usersMap = new Map();
      users.forEach((user: any) => {
        if (user.id) {
          usersMap.set(user.id, user);
        }
      });

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
        console.log('Failed to fetch categories for recent topics:', error);
      }

      // Transform topics
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

        // Extract author info - try creator.user first, then lookup from usersMap
        let username = 'unknown';
        let name = 'Unknown User';
        let avatarTemplate = '';

        if (creator?.user) {
          // Full user object exists in poster
          username = creator.user.username || 'unknown';
          name = creator.user.name || creator.user.username || 'Unknown User';
          avatarTemplate = creator.user.avatar_template || '';
        } else if (creator?.user_id && usersMap) {
          // Look up from users map using user_id
          const user = usersMap.get(creator.user_id);
          if (user) {
            username = user.username || 'unknown';
            name = user.name || user.username || 'Unknown User';
            avatarTemplate = user.avatar_template || '';
          }
        }

        const avatar = avatarTemplate 
          ? discourseApi.getAvatarUrl(avatarTemplate, 40)
          : '';

        return {
          id: topic.id,
          title: topic.title,
          excerpt: topic.excerpt || '',
          slug: topic.slug,
          category: categoryInfo,
          author: {
            username,
            name,
            avatar,
          },
          tags: topic.tags || [],
          createdAt: topic.created_at,
          likeCount: topic.like_count || 0,
          replyCount: topic.reply_count || 0,
          views: topic.views || 0,
          url: `${discourseApi.getBaseUrl()}/t/${topic.slug}/${topic.id}`,
        };
      });

      setState(prev => ({
        ...prev,
        topics,
        isLoading: false,
      }));

      logger.info('Recent topics loaded successfully', { count: topics.length });

    } catch (error) {
      logger.error('Failed to load recent topics', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load recent topics',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    if (state.hasError) {
      loadRecentTopics();
    }
  }, [state.hasError, loadRecentTopics]);

  // Load recent topics on mount
  useEffect(() => {
    loadRecentTopics();
  }, [loadRecentTopics]);

  return {
    ...state,
    loadRecentTopics,
    retry,
  };
} 