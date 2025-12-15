/**
 * useComments Hook - Comments data fetching with TanStack Query
 * 
 * Uses useQuery for comments data with caching and mutation hooks
 * for comment operations (create, update, delete, like).
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discourseApi, Comment } from './discourseApi';
import { queryKeys } from './query-client';

export interface CommentsState {
  comments: Comment[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isPosting: boolean;
}

/**
 * Fetch comments for a byte/topic
 */
async function fetchComments(byteId: number): Promise<Comment[]> {
  const response = await discourseApi.getComments(byteId);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to load comments');
  }
  
  return response.data || [];
}

/**
 * useComments hook with TanStack Query
 * 
 * Provides comments data with caching, background refetching,
 * and mutation hooks for CRUD operations.
 */
export function useComments(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  // Query for fetching comments
  const {
    data: comments = [],
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => fetchComments(byteId),
    enabled: byteId > 0,
    staleTime: 1 * 60 * 1000, // 1 minute - comments update frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always',
  });

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: async ({ content, replyToPostNumber }: { content: string; replyToPostNumber?: number }) => {
      const response = await discourseApi.createComment({
        content,
        byteId,
        replyToPostNumber,
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create comment');
      }
      
      return response.data;
    },
    onSuccess: (newComment) => {
      // Add the new comment to the cache
      queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) => 
        old ? [...old, newComment] : [newComment]
      );
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const response = await discourseApi.updateComment(commentId, content);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update comment');
      }
      
      return response.data;
    },
    onSuccess: (updatedComment) => {
      // Update the comment in cache
      queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) =>
        old?.map((comment) =>
          comment.id === updatedComment.id ? updatedComment : comment
        ) ?? []
      );
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await discourseApi.deleteComment(commentId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete comment');
      }
      
      return commentId;
    },
    onSuccess: (deletedId) => {
      // Remove the comment from cache
      queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) =>
        old?.filter((comment) => comment.id !== deletedId) ?? []
      );
    },
  });

  // Like comment mutation with optimistic update
  const likeMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await discourseApi.likeComment(commentId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to like comment');
      }
      
      return commentId;
    },
    onMutate: async (commentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      
      // Snapshot previous value
      const previousComments = queryClient.getQueryData<Comment[]>(commentsQueryKey);
      
      // Optimistically update
      queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) =>
        old?.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likeCount: comment.isLiked ? comment.likeCount - 1 : comment.likeCount + 1,
              }
            : comment
        ) ?? []
      );
      
      return { previousComments };
    },
    onError: (_err, _commentId, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
    },
  });

  // Backward compatible methods
  const refreshComments = useCallback(() => {
    refetch();
  }, [refetch]);

  const createComment = async (
    content: string,
    replyToPostNumber?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await createMutation.mutateAsync({ content, replyToPostNumber });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      };
    }
  };

  const updateComment = async (
    commentId: number,
    content: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await updateMutation.mutateAsync({ commentId, content });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update comment',
      };
    }
  };

  const deleteComment = async (commentId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteMutation.mutateAsync(commentId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      };
    }
  };

  const likeComment = async (commentId: number) => {
    try {
      await likeMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Like comment error:', error);
    }
  };

  const addComment = (newComment: Comment) => {
    queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) =>
      old ? [...old, newComment] : [newComment]
    );
  };

  const clearError = () => {
    // Error is managed by React Query, this is a no-op for compatibility
  };

  // Helper functions for threading
  const getReplies = (commentPostNumber: number): Comment[] => {
    return comments.filter(
      (comment) => comment.replyToPostNumber === commentPostNumber
    );
  };

  const getTopLevelComments = (): Comment[] => {
    return comments.filter((comment) => !comment.replyToPostNumber);
  };

  const getThreadedComments = (): Comment[] => {
    const topLevel = getTopLevelComments();
    return topLevel.map((comment) => ({
      ...comment,
      replies: getReplies(comment.postNumber),
    }));
  };

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && comments.length === 0;
  const isRefreshing = isFetching && comments.length > 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    comments,
    isLoading,
    isRefreshing,
    error: errorMessage,
    isPosting: createMutation.isPending,
    refreshComments,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    addComment,
    clearError,
    getReplies,
    getTopLevelComments,
    getThreadedComments,
  };
}

// Hook for managing comment drafts (unchanged - local state only)
export function useCommentDraft(byteId: number) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<{
    postNumber: number;
    username: string;
  } | null>(null);

  const updateDraft = (content: string) => {
    setDraft(content);
  };

  const setReplyTarget = (postNumber: number, username: string) => {
    setReplyTo({ postNumber, username });
    if (!draft.includes(`@${username}`)) {
      setDraft((prev) => `@${username} ${prev}`);
    }
  };

  const clearReply = () => {
    setReplyTo(null);
    if (replyTo) {
      setDraft((prev) => prev.replace(`@${replyTo.username} `, ''));
    }
  };

  const clearDraft = () => {
    setDraft('');
    setReplyTo(null);
  };

  const isDraftEmpty = () => {
    return draft.trim().length === 0;
  };

  return {
    draft,
    replyTo,
    updateDraft,
    setReplyTarget,
    clearReply,
    clearDraft,
    isDraftEmpty,
  };
}
