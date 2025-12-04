// Hook to fetch user activity data using Discourse activity API
// Generic hook that can fetch different activity types

import { useState, useEffect, useCallback } from 'react';
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

/**
 * Generic hook for fetching user activity data
 */
export function useUserActivity(
  username: string | undefined,
  activityType: ActivityType
): UseUserActivityReturn {
  const [items, setItems] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const loadActivity = useCallback(
    async (page: number = 0, append: boolean = false) => {
      if (!username) return;

      setIsLoading(true);
      setHasError(false);
      setErrorMessage(undefined);

      try {
        const response = await discourseApi.getUserActivity(username, activityType, page);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load activity');
        }

        // Handle multiple possible response structures from Discourse API
        // Different activity types return different formats:
        // - user_actions.json returns: { user_actions: [...] }
        // - /topics/created-by/{username}.json returns: { topic_list: { topics: [...] } }
        // - /topics/voted-by/{username}.json returns: { topic_list: { topics: [...] } }
        // - /solution/by_user.json returns: different format
        // - /read.json returns: different format
        const responseData = response.data || {};
        
        let items: any[] = [];
        let useUserActionAdapter = false;
        
        // Structure 1: user_actions array (from /user_actions.json endpoints)
        if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
          // User actions have topic data embedded directly in the action object
          items = responseData.user_actions.map((action: any) => action);
          useUserActionAdapter = true;
          console.log(`✅ useUserActivity (${activityType}): Found ${items.length} user_actions`);
        }
        // Structure 2: topic_list.topics (from /topics/created-by, /topics/voted-by, etc.)
        else if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
          items = responseData.topic_list.topics;
          useUserActionAdapter = false;
          console.log(`✅ useUserActivity (${activityType}): Found ${items.length} topics in topic_list.topics`);
        }
        // Structure 3: Direct topics array (fallback)
        else if (responseData.topics && Array.isArray(responseData.topics)) {
          items = responseData.topics;
          useUserActionAdapter = false;
          console.log(`✅ useUserActivity (${activityType}): Found ${items.length} topics in direct array`);
        }
        // Structure 4: Solutions format (from /solution/by_user.json)
        else if (responseData.solutions && Array.isArray(responseData.solutions)) {
          items = responseData.solutions.map((solution: any) => solution.topic || solution);
          useUserActionAdapter = false;
          console.log(`✅ useUserActivity (${activityType}): Found ${items.length} solutions`);
        }
        // Structure 5: Read topics format (from /read.json)
        else if (responseData.topic_list && responseData.topic_list.topics) {
          items = responseData.topic_list.topics;
          useUserActionAdapter = false;
          console.log(`✅ useUserActivity (${activityType}): Found ${items.length} read topics`);
        }
        
        console.log(`📝 useUserActivity (${activityType}): Extracted ${items.length} items`, {
          structure: responseData.user_actions ? 'user_actions' : 
                    responseData.topic_list ? 'topic_list' : 
                    responseData.solutions ? 'solutions' : 'unknown',
        });
        
        // Use appropriate adapter based on response structure
        const mappedItems: PostItem[] = items.map((item: any) => {
          return useUserActionAdapter
            ? userActionToPostItem(item, discourseApi)
            : discourseTopicToPostItem(item, discourseApi);
        }).filter(Boolean);

        if (append) {
          setItems((prev) => [...prev, ...mappedItems]);
        } else {
          setItems(mappedItems);
        }

        // Check if there are more results (typical pagination pattern)
        setHasMore(mappedItems.length === 20);
        setCurrentPage(page);
      } catch (error) {
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load activity'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [username, activityType]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadActivity(currentPage + 1, true);
  }, [hasMore, isLoading, currentPage, loadActivity]);

  const refresh = useCallback(async () => {
    setCurrentPage(0);
    await loadActivity(0, false);
  }, [loadActivity]);

  useEffect(() => {
    if (username) {
      loadActivity(0, false);
    }
  }, [username, activityType, loadActivity]);

  return {
    items,
    isLoading,
    hasError,
    errorMessage,
    hasMore,
    loadMore,
    refresh,
  };
}

