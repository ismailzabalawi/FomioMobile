/**
 * useUserPosts Hook - User posts with TanStack Query
 * 
 * Uses useInfiniteQuery for paginated user posts (topics created by user).
 */

import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem, userActionToPostItem } from './adapters/byteToPostItem';
import { queryKeys } from './query-client';

export interface UseUserPostsReturn {
  posts: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface PostsPageData {
  posts: PostItem[];
  page: number;
  hasMore: boolean;
}

/**
 * Fetch user posts page from API
 */
async function fetchUserPostsPage(
  username: string,
  page: number
): Promise<PostsPageData> {
  const response = await discourseApi.getUserActivity(username, 'topics', page);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load posts');
  }

  const responseData = response.data || {};
  let topics: any[] = [];
  let isUserActionsFormat = false;

  // Structure 1: topic_list.topics (from /topics/created-by/{username}.json)
  if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
    topics = responseData.topic_list.topics;
  }
  // Structure 2: Direct topics array
  else if (responseData.topics && Array.isArray(responseData.topics)) {
    topics = responseData.topics;
  }
  // Structure 3: user_actions array (from /user_actions.json?filter=4)
  else if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
    topics = responseData.user_actions
      .filter((action: any) => action.action_type === 4)
      .map((action: any) => action.topic || action);
    isUserActionsFormat = true;
  }

  const posts: PostItem[] = topics
    .map((topic: any) =>
      isUserActionsFormat
        ? userActionToPostItem(topic, discourseApi)
        : discourseTopicToPostItem(topic, discourseApi)
    )
    .filter(Boolean);

  return {
    posts,
    page,
    hasMore: topics.length === 20,
  };
}

/**
 * useUserPosts hook with TanStack Query
 */
export function useUserPosts(username: string): UseUserPostsReturn {
  const queryClient = useQueryClient();
  const postsQueryKey = queryKeys.userPosts(username);

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
    queryKey: postsQueryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return fetchUserPostsPage(username, pageParam);
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
  const posts: PostItem[] = data?.pages.flatMap((page) => page.posts) ?? [];

  // Load more
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Refresh
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: postsQueryKey });
  }, [queryClient, postsQueryKey]);

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && posts.length === 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    posts,
    isLoading,
    hasError: !!error,
    errorMessage,
    hasMore: hasNextPage ?? false,
    loadMore,
    refresh,
  };
}
