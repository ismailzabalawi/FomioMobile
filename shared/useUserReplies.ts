// Hook to fetch user's replies (posts that are not first post in topic)
// Uses Discourse activity API /u/{username}/activity/replies.json endpoint

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem, userActionToPostItem } from './adapters/byteToPostItem';

export interface UseUserRepliesReturn {
  replies: PostItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useUserReplies(username: string): UseUserRepliesReturn {
  const [replies, setReplies] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const loadReplies = useCallback(
    async (page: number = 0, append: boolean = false) => {
      if (!username) return;

      setIsLoading(true);
      setHasError(false);
      setErrorMessage(undefined);

      try {
        // Use Discourse activity endpoint for user replies
        const response = await discourseApi.getUserActivity(username, 'replies', page);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load replies');
        }

        // Log response structure for debugging
        console.log('📊 User Replies Response:', {
          hasData: !!response.data,
          keys: response.data ? Object.keys(response.data) : [],
          hasUserActions: !!(response.data?.user_actions),
          userActionsCount: response.data?.user_actions?.length || 0,
          hasTopicList: !!(response.data?.topic_list),
          topicListCount: response.data?.topic_list?.topics?.length || 0,
          hasTopics: !!(response.data?.topics),
          topicsCount: response.data?.topics?.length || 0,
        });

        // Handle multiple possible response structures from Discourse API
        // Endpoint: /user_actions.json?username={username}&filter=5 returns user_actions format
        const responseData = response.data || {};
        
        let topics: any[] = [];
        
        // Structure 1: user_actions array (standard format from /user_actions.json?filter=5)
        if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
          // Extract topics from user_actions where action_type = 5 (replied)
          // User actions have topic data embedded directly in the action object
          topics = responseData.user_actions
            .filter((action: any) => action.action_type === 5)
            .map((action: any) => {
              // User actions have topic data embedded directly
              // If there's a nested topic, use it; otherwise use the action itself
              return action.topic || action;
            });
          console.log('✅ Found replies in user_actions (filtered action_type=5):', topics.length);
        }
        // Structure 2: topic_list.topics (fallback)
        else if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
          topics = responseData.topic_list.topics;
          console.log('✅ Found replies in topic_list.topics:', topics.length);
        }
        // Structure 3: Direct topics array (fallback)
        else if (responseData.topics && Array.isArray(responseData.topics)) {
          topics = responseData.topics;
          console.log('✅ Found replies in direct topics array:', topics.length);
        }
        
        console.log('💬 Extracted replies:', topics.length, {
          structure: responseData.user_actions ? 'user_actions' : responseData.topic_list ? 'topic_list' : 'unknown',
        });

        // Transform topics to PostItem format
        // Replies from user_actions format need userActionToPostItem adapter
        const isUserActionsFormat = responseData.user_actions && !responseData.topic_list;
        const mappedReplies: PostItem[] = topics.map((topic: any) => {
          return isUserActionsFormat 
            ? userActionToPostItem(topic, discourseApi)
            : discourseTopicToPostItem(topic, discourseApi);
        }).filter(Boolean);

        if (append) {
          setReplies((prev) => [...prev, ...mappedReplies]);
        } else {
          setReplies(mappedReplies);
        }

        // Check if there are more results
        setHasMore(mappedReplies.length === 20);
        setCurrentPage(page);
      } catch (error) {
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load replies'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [username]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadReplies(currentPage + 1, true);
  }, [hasMore, isLoading, currentPage, loadReplies]);

  const refresh = useCallback(async () => {
    setCurrentPage(0);
    await loadReplies(0, false);
  }, [loadReplies]);

  useEffect(() => {
    if (username) {
      loadReplies(0, false);
    }
  }, [username, loadReplies]);

  return {
    replies,
    isLoading,
    hasError,
    errorMessage,
    hasMore,
    loadMore,
    refresh,
  };
}

