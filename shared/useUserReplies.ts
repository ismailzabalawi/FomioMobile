// Hook to fetch user's replies (posts that are not first post in topic)
// Uses search API to find posts by user where post_number > 1

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';

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
        // Use search API with author filter and filter for comments
        const searchQuery = `author:${username}`;
        const response = await discourseApi.search(searchQuery, {
          type: 'all',
          limit: 20,
          order: 'created',
          period: 'all',
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load replies');
        }

        // Filter comments (posts that are replies, not first posts)
        const comments = response.data.comments || [];
        const mappedReplies: PostItem[] = comments.map((comment: any) => ({
          id: comment.byteId, // Use topic ID for navigation
          title: comment.byteTitle || 'Reply',
          hubName: 'Uncategorized', // Comments don't have category info in search results
          author: {
            name: comment.author?.name || 'Unknown',
            avatar: comment.author?.avatar || '',
          },
          replyCount: 0, // Not applicable for individual replies
          likeCount: comment.likeCount || 0,
          createdAt: comment.createdAt,
          lastPostedAt: comment.createdAt,
          slug: `t/${comment.byteId}`,
        }));

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

