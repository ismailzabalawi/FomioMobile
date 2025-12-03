// Hook to fetch user activity data using Discourse activity API
// Generic hook that can fetch different activity types

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from '../discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem } from '../adapters/byteToPostItem';

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

        // Transform response data to PostItem format
        // Discourse activity endpoints return different structures
        // We need to handle topics array from activity response
        const userActions = response.data.user_actions || [];
        const topicsList = response.data.topic_list?.topics || [];
        
        // Extract topics from user_actions (which may have nested topic objects)
        const topics: any[] = [];
        if (userActions.length > 0) {
          userActions.forEach((action: any) => {
            if (action.topic) {
              topics.push(action.topic);
            } else if (action.id) {
              // If it's already a topic object
              topics.push(action);
            }
          });
        } else {
          topics.push(...topicsList);
        }
        
        const mappedItems: PostItem[] = topics.map((topic: any) => 
          discourseTopicToPostItem(topic, discourseApi)
        ).filter(Boolean);

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

