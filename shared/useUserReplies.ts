/**
 * useUserReplies Hook - User replies with TanStack Query
 * 
 * Uses useInfiniteQuery for paginated user replies.
 */

import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem, userActionToPostItem } from './adapters/byteToPostItem';
import { queryKeys } from './query-client';

export interface UseUserRepliesReturn {
  replies: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface RepliesPageData {
  replies: PostItem[];
  page: number;
  hasMore: boolean;
}

/**
 * Fetch user replies page from API
 */
async function fetchUserRepliesPage(
  username: string,
  page: number
): Promise<RepliesPageData> {
  const response = await discourseApi.getUserActivity(username, 'replies', page);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load replies');
  }

  const responseData = response.data || {};
  let topics: any[] = [];
  let isUserActionsFormat = false;

  // Structure 1: user_actions array (from /user_actions.json?filter=5)
  if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
    topics = responseData.user_actions
      .filter((action: any) => action.action_type === 5)
      .map((action: any) => action.topic || action);
    isUserActionsFormat = true;
  }
  // Structure 2: topic_list.topics (fallback)
  else if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
    topics = responseData.topic_list.topics;
  }
  // Structure 3: Direct topics array (fallback)
  else if (responseData.topics && Array.isArray(responseData.topics)) {
    topics = responseData.topics;
  }

  const replies: PostItem[] = topics
    .map((topic: any) =>
      isUserActionsFormat
        ? userActionToPostItem(topic, discourseApi)
        : discourseTopicToPostItem(topic, discourseApi)
    )
    .filter(Boolean);

  return {
    replies,
    page,
    hasMore: topics.length === 20,
  };
}

/**
 * useUserReplies hook with TanStack Query
 */
export function useUserReplies(username: string): UseUserRepliesReturn {
  const queryClient = useQueryClient();
  const repliesQueryKey = queryKeys.userReplies(username);

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
    queryKey: repliesQueryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return fetchUserRepliesPage(username, pageParam);
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
  const replies: PostItem[] = data?.pages.flatMap((page) => page.replies) ?? [];

  // Load more
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Refresh
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: repliesQueryKey });
  }, [queryClient, repliesQueryKey]);

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && replies.length === 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    replies,
    isLoading,
    hasError: !!error,
    errorMessage,
    hasMore: hasNextPage ?? false,
    loadMore,
    refresh,
  };
}
