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
  bookmarked: boolean;
  notificationLevel: number; // 0=muted, 1=normal, 2=tracking, 3=watching, 4=watching-first-post
  lastReadPostNumber: number;
  highestPostNumber: number;
  unreadCount: number; // Calculated: highestPostNumber - lastReadPostNumber
  canEdit: boolean;
  canDelete: boolean;
  canFlag: boolean;
  canClose: boolean;
  canPin: boolean;
  canArchive: boolean;
  authorBadges?: Array<{
    id: number;
    name: string;
    icon?: string;
  }>;
  hasMedia: boolean;
  coverImage?: string; // First image URL from first post
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

      // Helper function to extract first image URL from HTML
      const extractFirstImage = (html: string): string | undefined => {
        if (!html) return undefined;
        const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
        return imgMatch ? imgMatch[1] : undefined;
      };

      // Extract topic-level fields
      const bookmarked = topic.details?.bookmarked || false;
      const notificationLevel = topic.details?.notification_level ?? 1;
      const lastReadPostNumber = topic.details?.last_read_post_number || 0;
      const highestPostNumber = topic.highest_post_number || topic.posts_count || 0;
      const unreadCount = Math.max(0, highestPostNumber - lastReadPostNumber);

      // Extract permission flags
      const canEdit = topic.details?.can_edit || false;
      const canDelete = topic.details?.can_delete || false;
      const canFlag = topic.details?.can_flag || false;
      const canClose = topic.details?.can_close_topic || false;
      const canPin = topic.details?.can_pin || false;
      const canArchive = topic.details?.can_archive_topic || false;

      // Extract author badges
      const authorBadges: Array<{ id: number; name: string; icon?: string }> = [];
      if (firstPost?.user_badge_count > 0 && firstPost.badges) {
        firstPost.badges.forEach((badge: any) => {
          authorBadges.push({
            id: badge.id,
            name: badge.name,
            icon: badge.icon,
          });
        });
      }

      // Detect media and extract cover image
      const firstPostContent = firstPost?.cooked || '';
      const hasMedia = /<img|<video|<iframe/i.test(firstPostContent);
      const coverImage = extractFirstImage(firstPostContent);

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
        bookmarked,
        notificationLevel,
        lastReadPostNumber,
        highestPostNumber,
        unreadCount,
        canEdit,
        canDelete,
        canFlag,
        canClose,
        canPin,
        canArchive,
        authorBadges: authorBadges.length > 0 ? authorBadges : undefined,
        hasMedia,
        coverImage,
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

  // Add refetch function that always reloads (regardless of error state)
  const refetch = useCallback(() => {
    if (topicId) {
      loadTopic(topicId);
    }
  }, [topicId, loadTopic]);

  useEffect(() => {
    if (topicId) {
      loadTopic(topicId);
    }
  }, [topicId, loadTopic]);

  return {
    ...state,
    retry,
    refetch,
  };
} 