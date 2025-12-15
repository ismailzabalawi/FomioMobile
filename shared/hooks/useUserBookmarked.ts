/**
 * useUserBookmarked Hook - Bookmarked topics with TanStack Query
 * 
 * Uses useInfiniteQuery for paginated bookmarked topics.
 */

import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from '../discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem } from '../adapters/byteToPostItem';
import { queryKeys } from '../query-client';

export interface UseUserBookmarkedReturn {
  items: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface BookmarkedPageData {
  items: PostItem[];
  page: number;
  hasMore: boolean;
}

/**
 * Fetch bookmarked topics page from API
 */
async function fetchUserBookmarkedPage(
  username: string,
  page: number
): Promise<BookmarkedPageData> {
  const response = await discourseApi.getUserBookmarkedTopics(username, page);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load bookmarks');
  }

  const userActions = response.data.user_actions || [];
  const topicsList = response.data.topic_list?.topics || [];

  // Extract topics from user_actions
  const topics: any[] = [];
  if (userActions.length > 0) {
    userActions.forEach((action: any) => {
      if (action.topic) {
        topics.push({ ...action.topic, bookmarked: true });
      } else if (action.id) {
        topics.push({ ...action, bookmarked: true });
      }
    });
  } else {
    topics.push(...topicsList.map((t: any) => ({ ...t, bookmarked: true })));
  }

  const items: PostItem[] = topics
    .map((topic: any) => {
      const item = discourseTopicToPostItem(topic, discourseApi);
      return { ...item, isBookmarked: true };
    })
    .filter(Boolean);

  return {
    items,
    page,
    hasMore: items.length === 20,
  };
}

/**
 * useUserBookmarked hook with TanStack Query
 */
export function useUserBookmarked(username: string | undefined): UseUserBookmarkedReturn {
  const queryClient = useQueryClient();
  const bookmarksQueryKey = username ? queryKeys.userBookmarks(username) : ['user', null, 'bookmarks'];

  const {
    data,
    isLoading: isQueryLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: bookmarksQueryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!username) {
        return { items: [], page: 0, hasMore: false };
      }
      return fetchUserBookmarkedPage(username, pageParam);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Flatten pages into single array
  const items: PostItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  // Load more
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Refresh
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: bookmarksQueryKey });
  }, [queryClient, bookmarksQueryKey]);

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && items.length === 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    items,
    isLoading,
    hasError: !!error,
    errorMessage,
    hasMore: hasNextPage ?? false,
    loadMore,
    refresh,
  };
}
