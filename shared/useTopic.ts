/**
 * useTopic Hook - Topic data fetching with TanStack Query
 * 
 * Uses useQuery for topic data with caching, background refetching,
 * and stale-while-revalidate pattern.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { logger } from './logger';
import { queryKeys } from './query-client';

export interface TopicData {
  id: number;
  title: string;
  content: string;
  linkMetadata?: Record<
    string,
    {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
      publishedAt?: string;
      type?: 'article' | 'video' | 'post' | 'generic';
    }
  >;
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
  notificationLevel: number;
  lastReadPostNumber: number;
  highestPostNumber: number;
  unreadCount: number;
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
  coverImage?: string;
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

/**
 * Fetch and transform topic data from API
 */
async function fetchTopic(topicId: number): Promise<TopicData> {
  const topicResponse = await discourseApi.getTopic(topicId, {
    includeRaw: true,
    trackVisit: true,
    includePostActions: true,
  });

  if (!topicResponse.success || !topicResponse.data) {
    throw new Error(topicResponse.error || 'Failed to load topic');
  }

  const topic = topicResponse.data;
  const posts = topic.post_stream?.posts || [];

  // Extract category information
  let categoryInfo = {
    id: topic.category_id || 0,
    name: 'Uncategorized',
    color: '#000000',
    slug: 'uncategorized',
  };

  if (topic.details?.category) {
    categoryInfo = {
      id: topic.details.category.id,
      name: topic.details.category.name,
      color: topic.details.category.color ? `#${topic.details.category.color}` : '#000000',
      slug: topic.details.category.slug,
    };
  } else if (topic.category_id) {
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
      logger.warn('Failed to fetch category info:', error);
    }
  }

  // Get author info from the first post
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

  // Helper functions
  const extractUserAction = (post: any, actionTypeId: number): boolean => {
    if (!post.actions_summary) return false;
    const action = post.actions_summary.find((a: any) => a.id === actionTypeId);
    return action?.acted === true;
  };

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

  const linkMetadata =
    (topic as any).link_metadata ||
    (topic as any).linkMetadata ||
    (topic.details && (topic.details as any).link_metadata) ||
    undefined;

  // Permission flags
  const canEdit = topic.details?.can_edit || false;
  const canDelete = topic.details?.can_delete || false;
  const canFlag = topic.details?.can_flag || false;
  const canClose = topic.details?.can_close_topic || false;
  const canPin = topic.details?.can_pin || false;
  const canArchive = topic.details?.can_archive_topic || false;

  // Author badges
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

  // Media detection
  const firstPostContent = firstPost?.cooked || '';
  const hasMedia = /<img|<video|<iframe/i.test(firstPostContent);
  const coverImage = extractFirstImage(firstPostContent);

  return {
    id: topic.id,
    title: topic.title,
    content: firstPost?.cooked || '',
    linkMetadata,
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
      isLiked: extractUserAction(post, 2),
      reply_to_post_number: post.reply_to_post_number,
    })),
  };
}

/**
 * useTopic hook with TanStack Query
 * 
 * Provides topic data with caching, background refetching,
 * and optimistic updates. Maintains backward compatible interface.
 */
export function useTopic(topicId: number | null) {
  const queryClient = useQueryClient();
  const topicQueryKey = topicId ? queryKeys.topic(topicId) : ['topic', null];

  const {
    data: topic,
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: topicQueryKey,
    queryFn: () => fetchTopic(topicId!),
    enabled: topicId !== null && topicId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - topics change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always', // Always get latest when viewing
  });

  // Retry on error - invalidates and refetches
  const retry = useCallback(() => {
    if (topicId) {
      queryClient.invalidateQueries({ queryKey: topicQueryKey });
    }
  }, [queryClient, topicQueryKey, topicId]);

  // Refetch - always reloads regardless of cache state
  const refetch = useCallback(async () => {
    if (topicId) {
      await queryRefetch();
    }
  }, [topicId, queryRefetch]);

  // Compute loading state for backward compatibility
  // isLoading is true only on initial load when there's no cached data
  const isLoading = isQueryLoading && !topic;

  // Error handling
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    topic: topic ?? null,
    isLoading,
    hasError: !!error,
    errorMessage,
    retry,
    refetch,
  };
}
