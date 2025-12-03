// Hook to fetch user's replies (posts that are not first post in topic)
// Uses Discourse activity API /u/{username}/activity/replies.json endpoint

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem } from './adapters/byteToPostItem';

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
        });

        // Discourse activity endpoint returns user_actions array
        // For replies, extract topics from user_actions where action_type = 5 (replied)
        const userActions = response.data.user_actions || [];
        const topicsList = response.data.topic_list?.topics || [];
        
        // Extract topics from user_actions
        // action_type 5 = replied to topic
        const topics: any[] = [];
        
        // First, check if we have topic_list
        if (topicsList.length > 0) {
          topics.push(...topicsList);
        } else if (userActions.length > 0) {
          // Extract topics from user_actions where user replied
          userActions.forEach((action: any) => {
            // action_type 5 = replied
            if (action.action_type === 5 && action.topic) {
              topics.push(action.topic);
            } else if (action.target_topic_id && action.topic) {
              // If it has a target_topic_id, it's a reply action
              topics.push(action.topic);
            } else if (!action.action_type && action.id && action.post_number > 1) {
              // Sometimes the action itself is a reply post
              topics.push(action);
            }
          });
        }
        
        console.log('💬 Extracted replies:', topics.length);

        // Transform topics to PostItem format
        const mappedReplies: PostItem[] = topics.map((topic: any) => 
          discourseTopicToPostItem(topic, discourseApi)
        ).filter(Boolean);

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

