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

      // Get topic details
      const topicResponse = await discourseApi.getTopic(id);
      
      if (!topicResponse.success || !topicResponse.data) {
        throw new Error(topicResponse.error || 'Failed to load topic');
      }

      const topic = topicResponse.data;

      // Get topic posts
      const postsResponse = await discourseApi.getTopicPosts(id);
      
      if (!postsResponse.success || !postsResponse.data) {
        throw new Error(postsResponse.error || 'Failed to load topic posts');
      }

      const posts = postsResponse.data.post_stream.posts;

      // Get category information
      let categoryInfo = {
        id: topic.category_id,
        name: 'Uncategorized',
        color: '#000000',
        slug: 'uncategorized',
      };
      
      if (topic.category_id) {
        try {
          const categoryResponse = await discourseApi.getCategory(topic.category_id);
          if (categoryResponse.success && categoryResponse.data) {
            categoryInfo = {
              id: categoryResponse.data.id,
              name: categoryResponse.data.name,
              color: categoryResponse.data.color || '#000000',
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
          isLiked: false, // TODO: Implement like state
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