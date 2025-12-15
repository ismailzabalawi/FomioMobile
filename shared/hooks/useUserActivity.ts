/**
 * useUserActivity Hook - Generic user activity with TanStack Query
 * 
 * Uses useInfiniteQuery for paginated user activity data.
 * This is a generic hook that can fetch different activity types.
 */

import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from '../discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem, userActionToPostItem } from '../adapters/byteToPostItem';

export type ActivityType = 'all' | 'topics' | 'replies' | 'read' | 'likes' | 'bookmarks' | 'solved' | 'votes';

export interface UseUserActivityReturn {
  items: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface ActivityPageData {
  items: PostItem[];
  page: number;
  hasMore: boolean;
}

/**
 * Create query key for user activity
 */
function activityQueryKey(username: string, activityType: ActivityType) {
  return ['user', username, 'activity', activityType] as const;
}

/**
 * Fetch user activity page from API
 */
async function fetchUserActivityPage(
  username: string,
  activityType: ActivityType,
  page: number
): Promise<ActivityPageData> {
  const response = await discourseApi.getUserActivity(username, activityType, page);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load activity');
  }

  const responseData = response.data || {};
  let rawItems: any[] = [];
  let useUserActionAdapter = false;

  // Structure 1: user_actions array (from /user_actions.json endpoints)
  if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
    rawItems = responseData.user_actions;
    useUserActionAdapter = true;
  }
  // Structure 2: topic_list.topics (from /topics/created-by, /topics/voted-by, etc.)
  else if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
    rawItems = responseData.topic_list.topics;
  }
  // Structure 3: Direct topics array (fallback)
  else if (responseData.topics && Array.isArray(responseData.topics)) {
    rawItems = responseData.topics;
  }
  // Structure 4: Solutions format (from /solution/by_user.json)
  else if (responseData.solutions && Array.isArray(responseData.solutions)) {
    rawItems = responseData.solutions.map((solution: any) => solution.topic || solution);
  }

  const items: PostItem[] = rawItems
    .map((item: any) =>
      useUserActionAdapter
        ? userActionToPostItem(item, discourseApi)
        : discourseTopicToPostItem(item, discourseApi)
    )
    .filter(Boolean);

  return {
    items,
    page,
    hasMore: rawItems.length === 20,
  };
}

/**
 * Generic hook for fetching user activity data with TanStack Query
 */
export function useUserActivity(
  username: string | undefined,
  activityType: ActivityType
): UseUserActivityReturn {
  const queryClient = useQueryClient();
  const queryKey = username ? activityQueryKey(username, activityType) : ['user', null, 'activity', activityType];

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
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!username) {
        return { items: [], page: 0, hasMore: false };
      }
      return fetchUserActivityPage(username, activityType, pageParam);
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
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

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
