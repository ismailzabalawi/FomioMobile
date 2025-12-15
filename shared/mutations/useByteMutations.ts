/**
 * Byte Mutations - TanStack Query mutation hooks for byte operations
 * 
 * Provides mutation hooks for creating, liking, and bookmarking bytes
 * with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from '../discourseApi';
import { queryKeys } from '../query-client';

/**
 * Create a new byte (topic)
 */
export function useCreateByte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; content: string; hubId: number }) => {
      const response = await discourseApi.createByte(data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create byte');
      }
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate feed queries to show new byte
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      // Also invalidate hub-specific feed if hubId is specified
      if (variables.hubId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feed({ hubId: variables.hubId }),
        });
      }
    },
  });
}

/**
 * Like/unlike a byte (topic)
 */
export function useLikeByte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (byteId: number) => {
      const response = await discourseApi.likeByte(byteId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to like byte');
      }
      return byteId;
    },
    onSuccess: (byteId) => {
      // Invalidate topic and feed queries
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    },
  });
}

/**
 * Unlike a byte (topic)
 */
export function useUnlikeByte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number) => {
      const response = await discourseApi.unlikePost(postId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to unlike byte');
      }
      return postId;
    },
    onSuccess: (_postId, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    },
  });
}

/**
 * Bookmark a byte (topic)
 */
export function useBookmarkByte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { byteId: number; postId: number }) => {
      const response = await discourseApi.bookmarkPost(params.postId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to bookmark byte');
      }
      return params;
    },
    onSuccess: ({ byteId }) => {
      // Invalidate topic query
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

/**
 * Unbookmark a byte (topic)
 */
export function useUnbookmarkByte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { byteId: number; postId: number }) => {
      const response = await discourseApi.unbookmarkPost(params.postId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to unbookmark byte');
      }
      return params;
    },
    onSuccess: ({ byteId }) => {
      // Invalidate topic query
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

/**
 * Toggle bookmark on a byte (topic level)
 */
export function useToggleByteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (byteId: number) => {
      const response = await discourseApi.toggleTopicBookmark(byteId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle bookmark');
      }
      return byteId;
    },
    onSuccess: (byteId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

/**
 * Set notification level for a byte (topic)
 */
export function useSetByteNotificationLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ byteId, level }: { byteId: number; level: number }) => {
      const response = await discourseApi.setNotificationLevel(byteId, level);
      if (!response.success) {
        throw new Error(response.error || 'Failed to set notification level');
      }
      return { byteId, level };
    },
    onSuccess: ({ byteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.topic(byteId) });
    },
  });
}

