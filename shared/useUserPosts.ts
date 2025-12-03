// Hook to fetch user's topics (Bytes) using Discourse activity API
// Uses /u/{username}/activity/topics.json endpoint

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem } from './adapters/byteToPostItem';

export interface UseUserPostsReturn {
  posts: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useUserPosts(username: string): UseUserPostsReturn {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const loadPosts = useCallback(
    async (page: number = 0, append: boolean = false) => {
      if (!username) return;

      setIsLoading(true);
      setHasError(false);
      setErrorMessage(undefined);

      try {
        // Use Discourse activity endpoint for user topics
        const response = await discourseApi.getUserActivity(username, 'topics', page);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load posts');
        }

        // Log response structure for debugging
        console.log('📊 User Topics Response:', {
          hasData: !!response.data,
          keys: response.data ? Object.keys(response.data) : [],
          hasUserActions: !!(response.data?.user_actions),
          userActionsCount: response.data?.user_actions?.length || 0,
          hasTopicList: !!(response.data?.topic_list),
          topicListCount: response.data?.topic_list?.topics?.length || 0,
        });

        // Discourse activity endpoint returns user_actions array or topic_list
        // For topics, extract topics from user_actions
        const userActions = response.data.user_actions || [];
        const topicsList = response.data.topic_list?.topics || [];
        
        // Extract topics from user_actions (action_type 4 = created topic, 5 = replied)
        // For topics tab, we want topics the user created
        const topics: any[] = [];
        
        // First, check if we have topic_list (cleaner format)
        if (topicsList.length > 0) {
          topics.push(...topicsList);
        } else if (userActions.length > 0) {
          // Extract topics from user_actions
          userActions.forEach((action: any) => {
            // action_type 4 = created topic
            if (action.action_type === 4 && action.topic) {
              topics.push(action.topic);
            } else if (action.topic && !action.target_topic_id) {
              // If it has a topic and isn't a reply action, it's a topic creation
              topics.push(action.topic);
            } else if (!action.action_type && action.id) {
              // Sometimes the action itself is the topic
              topics.push(action);
            }
          });
        }
        
        console.log('📝 Extracted topics:', topics.length);

        // Transform topics to PostItem format
        const mappedPosts: PostItem[] = topics.map((topic: any) => 
          discourseTopicToPostItem(topic, discourseApi)
        ).filter(Boolean);

        if (append) {
          setPosts((prev) => [...prev, ...mappedPosts]);
        } else {
          setPosts(mappedPosts);
        }

        // Check if there are more results
        setHasMore(mappedPosts.length === 20);
        setCurrentPage(page);
      } catch (error) {
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load posts'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [username]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadPosts(currentPage + 1, true);
  }, [hasMore, isLoading, currentPage, loadPosts]);

  const refresh = useCallback(async () => {
    setCurrentPage(0);
    await loadPosts(0, false);
  }, [loadPosts]);

  useEffect(() => {
    if (username) {
      loadPosts(0, false);
    }
  }, [username, loadPosts]);

  return {
    posts,
    isLoading,
    hasError,
    errorMessage,
    hasMore,
    loadMore,
    refresh,
  };
}

