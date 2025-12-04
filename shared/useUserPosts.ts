// Hook to fetch user's topics (Bytes) using Discourse activity API
// Uses /u/{username}/activity/topics.json endpoint

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseTopicToPostItem, userActionToPostItem } from './adapters/byteToPostItem';

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
          hasTopics: !!(response.data?.topics),
          topicsCount: response.data?.topics?.length || 0,
        });

        // Handle multiple possible response structures from Discourse API
        // Endpoint: /topics/created-by/{username}.json returns topic_list format
        const responseData = response.data || {};
        
        let topics: any[] = [];
        
        // Structure 1: topic_list.topics (standard format from /topics/created-by/{username}.json)
        if (responseData.topic_list?.topics && Array.isArray(responseData.topic_list.topics)) {
          topics = responseData.topic_list.topics;
          console.log('✅ Found topics in topic_list.topics:', topics.length);
        }
        // Structure 2: Direct topics array (fallback)
        else if (responseData.topics && Array.isArray(responseData.topics)) {
          topics = responseData.topics;
          console.log('✅ Found topics in direct topics array:', topics.length);
        }
        // Structure 3: user_actions array (from /user_actions.json?filter=4)
        else if (responseData.user_actions && Array.isArray(responseData.user_actions)) {
          // Extract topics from user_actions where action_type = 4 (created topic)
          topics = responseData.user_actions
            .filter((action: any) => action.action_type === 4)
            .map((action: any) => {
              // User actions have topic data embedded directly
              // If there's a nested topic, use it; otherwise use the action itself
              return action.topic || action;
            });
          console.log('✅ Found topics in user_actions (filtered action_type=4):', topics.length);
        }
        
        console.log('📝 Extracted topics:', topics.length, {
          structure: responseData.topic_list ? 'topic_list' : responseData.user_actions ? 'user_actions' : 'unknown',
        });

        // Transform topics to PostItem format
        // Use appropriate adapter based on response structure
        const isUserActionsFormat = responseData.user_actions && !responseData.topic_list;
        const mappedPosts: PostItem[] = topics.map((topic: any) => {
          // If it's from user_actions format, use userActionToPostItem
          // Otherwise use discourseTopicToPostItem for standard topic format
          return isUserActionsFormat 
            ? userActionToPostItem(topic, discourseApi)
            : discourseTopicToPostItem(topic, discourseApi);
        }).filter(Boolean);

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

