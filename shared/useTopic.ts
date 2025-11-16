import { useState, useCallback, useEffect } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface TopicData {
  id: number;
  title: string;
  content: string;
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
  views: number;
  slug: string;
  url: string;
  posts: Array<{
    id: number;
    number: number;
    content: string;
    author: {
      username: string;
      name: string;
      avatar: string;
    };
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    isLiked: boolean;
    reply_to_post_number?: number;
  }>;
}

export interface TopicState {
  topic: TopicData | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function useTopic(topicId: number | null) {
  const [state, setState] = useState<TopicState>({
    topic: null,
    isLoading: false,
    hasError: false,
  });

  const loadTopic = useCallback(async (id: number) => {
    if (!id) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: undefined,
      }));

      // Single optimized API call with all needed data
      const topicResponse = await discourseApi.getTopic(id, {
        includeRaw: true,
        trackVisit: true,
        includePostActions: true,
      });
      
      if (!topicResponse.success || !topicResponse.data) {
        throw new Error(topicResponse.error || 'Failed to load topic');
      }

      const topic = topicResponse.data;

      // Extract posts from topic.post_stream.posts (already in response)
      const posts = topic.post_stream?.posts || [];

      // Extract category information from topic.details.category (already in response)
      let categoryInfo = {
        id: topic.category_id || 0,
        name: 'Uncategorized',
        color: '#000000',
        slug: 'uncategorized',
      };
      
      if (topic.details?.category) {
        // Category info is already in the response
        categoryInfo = {
          id: topic.details.category.id,
          name: topic.details.category.name,
          color: topic.details.category.color ? `#${topic.details.category.color}` : '#000000',
          slug: topic.details.category.slug,
        };
      } else if (topic.category_id) {
        // Fallback: try to get category info if not in details
        try {
          const categoryResponse = await discourseApi.getCategory(topic.category_id);
          if (categoryResponse.success && categoryResponse.data) {
            categoryInfo = {
              id: categoryResponse.data.id,
              name: categoryResponse.data.name,
              color: categoryResponse.data.color ? `#${categoryResponse.data.color}` : '#000000',
              slug: categoryResponse.data.slug,
            };
          }
        } catch (error) {
          console.log('Failed to fetch category info:', error);
        }
      }

      // Get user information from the first post (original poster)
      const firstPost = posts[0];
      let authorInfo = {
        username: 'unknown',
        name: 'Unknown User',
        avatar: '',
      };
      
      if (firstPost) {
        authorInfo = {
          username: firstPost.username || 'unknown',
          name: firstPost.name || firstPost.username || 'Unknown User',
          avatar: discourseApi.getAvatarUrl(firstPost.avatar_template || '', 120),
        };
      }

      // Extract user actions from post.actions_summary for like/bookmark status
      const extractUserAction = (post: any, actionTypeId: number): boolean => {
        if (!post.actions_summary) return false;
        const action = post.actions_summary.find((a: any) => a.id === actionTypeId);
        return action?.acted === true;
      };

      // Transform topic data
      const topicData: TopicData = {
        id: topic.id,
        title: topic.title,
        content: firstPost?.cooked || '',
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
        views: topic.views,
        slug: topic.slug,
        url: `${discourseApi.getBaseUrl()}/t/${topic.slug}/${topic.id}`,
        posts: posts.map((post: any) => ({
          id: post.id,
          number: post.post_number,
          content: post.cooked,
          author: {
            username: post.username,
            name: post.name || post.username,
            avatar: discourseApi.getAvatarUrl(post.avatar_template || '', 40),
          },
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          likeCount: post.like_count || 0,
          isLiked: extractUserAction(post, 2), // Action type 2 is like
          reply_to_post_number: post.reply_to_post_number,
        })),
      };

      setState(prev => ({
        ...prev,
        topic: topicData,
        isLoading: false,
      }));

    } catch (error) {
      logger.error('Failed to load topic', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load topic',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    if (topicId && state.hasError) {
      loadTopic(topicId);
    }
  }, [topicId, state.hasError, loadTopic]);

  useEffect(() => {
    if (topicId) {
      loadTopic(topicId);
    }
  }, [topicId, loadTopic]);

  return {
    ...state,
    retry,
  };
} 