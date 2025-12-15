/**
 * Comment Mutations - TanStack Query mutation hooks for comment operations
 * 
 * Provides mutation hooks for creating, updating, deleting, and liking comments
 * with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discourseApi, Comment } from '../discourseApi';
import { queryKeys } from '../query-client';

/**
 * Create a new comment
 */
export function useCreateComment(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  return useMutation({
    mutationFn: async ({
      content,
      replyToPostNumber,
    }: {
      content: string;
      replyToPostNumber?: number;
    }) => {
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
      // Also invalidate the topic to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

/**
 * Update an existing comment
 */
export function useUpdateComment(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => {
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
}

/**
 * Delete a comment
 */
export function useDeleteComment(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  return useMutation({
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
      // Also invalidate the topic to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

/**
 * Like a comment with optimistic update
 */
export function useLikeComment(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  return useMutation({
    mutationFn: async (commentId: number) => {
      const response = await discourseApi.likeComment(commentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to like comment');
      }

      return commentId;
    },
    onMutate: async (commentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>(commentsQueryKey);

      // Optimistically update the cache
      queryClient.setQueryData<Comment[]>(commentsQueryKey, (old) =>
        old?.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likeCount: comment.isLiked
                  ? comment.likeCount - 1
                  : comment.likeCount + 1,
              }
            : comment
        ) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousComments };
    },
    onError: (_err, _commentId, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });
}

/**
 * Reply to a specific comment
 */
export function useReplyToComment(byteId: number) {
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.topicComments(byteId);

  return useMutation({
    mutationFn: async ({
      content,
      replyToPostNumber,
    }: {
      content: string;
      replyToPostNumber: number;
    }) => {
      const response = await discourseApi.createReply(byteId, content, replyToPostNumber);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to reply to comment');
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate comments to refetch the full list with new reply
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      // Also invalidate the topic to update reply count
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

