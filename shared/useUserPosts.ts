// Hook to fetch user's topics (Bytes) using Discourse search API
// Uses author:username filter to get all topics created by the user

import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';

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
        // Use search API with author filter
        const searchQuery = `author:${username}`;
        const response = await discourseApi.search(searchQuery, {
          type: 'topic',
          limit: 20,
          order: 'created',
          period: 'all',
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load posts');
        }

        // Map search results to PostItem format
        const bytes = response.data.bytes || [];
        const mappedPosts: PostItem[] = bytes.map((byte: any) => ({
          id: byte.id,
          title: byte.title,
          hubName: byte.hubName || 'Uncategorized',
          teretName: byte.teretName,
          author: {
            name: byte.author?.name || 'Unknown',
            avatar: byte.author?.avatarUrl || '',
          },
          replyCount: byte.stats?.replyCount || 0,
          likeCount: byte.stats?.likeCount || 0,
          createdAt: byte.createdAt,
          lastPostedAt: byte.lastPostedAt,
          isBookmarked: byte.isBookmarked,
          hasMedia: byte.hasMedia,
          coverImage: byte.coverImage,
          slug: byte.slug || `t/${byte.id}`,
        }));

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

