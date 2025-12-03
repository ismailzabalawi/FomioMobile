// Hook to fetch bookmarked topics
// Only available for own profile
// Can leverage bookmark store for better performance

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from '../discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { useBookmarkStore } from '../useBookmarkSync';
import { discourseTopicToPostItem } from '../adapters/byteToPostItem';

export interface UseUserBookmarkedReturn {
  items: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useUserBookmarked(username: string | undefined): UseUserBookmarkedReturn {
  const [items, setItems] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);

  const loadBookmarked = useCallback(
    async (page: number = 0, append: boolean = false) => {
      if (!username) return;

      setIsLoading(true);
      setHasError(false);
      setErrorMessage(undefined);

      try {
        const response = await discourseApi.getUserBookmarkedTopics(username, page);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load bookmarks');
        }

        const userActions = response.data.user_actions || [];
        const topicsList = response.data.topic_list?.topics || [];
        
        // Extract topics from user_actions (which may have nested topic objects)
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
        
        const mappedItems: PostItem[] = topics.map((topic: any) => {
          const item = discourseTopicToPostItem(topic, discourseApi);
          return { ...item, isBookmarked: true }; // All items here are bookmarked
        }).filter(Boolean);

        if (append) {
          setItems((prev) => [...prev, ...mappedItems]);
        } else {
          setItems(mappedItems);
        }

        setHasMore(mappedItems.length === 20);
        setCurrentPage(page);
      } catch (error) {
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load bookmarks'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [username]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadBookmarked(currentPage + 1, true);
  }, [hasMore, isLoading, currentPage, loadBookmarked]);

  const refresh = useCallback(async () => {
    setCurrentPage(0);
    await loadBookmarked(0, false);
  }, [loadBookmarked]);

  useEffect(() => {
    if (username) {
      loadBookmarked(0, false);
    }
  }, [username, loadBookmarked]);

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

