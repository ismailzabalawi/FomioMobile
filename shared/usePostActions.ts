import { useState, useCallback } from 'react';
import { discourseApiService } from './discourseApiService';
import { logger } from './logger';

export interface PostActionState {
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  isLoading: boolean;
  error?: string;
}

export function usePostActions(
  postId: number,
  initialLikeCount: number = 0,
  initialIsLiked: boolean = false,
  initialIsBookmarked: boolean = false
) {
  const [state, setState] = useState<PostActionState>({
    isLiked: initialIsLiked,
    isBookmarked: initialIsBookmarked,
    likeCount: initialLikeCount,
    isLoading: false,
  });

  const toggleLike = useCallback(async () => {
    if (state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = state.isLiked 
        ? await discourseApiService.unlikePost(postId)
        : await discourseApiService.likePost(postId);

      if (response.success) {
        setState(prev => ({
          ...prev,
          isLiked: !prev.isLiked,
          likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
          isLoading: false,
        }));
        logger.info(`Post ${postId} ${state.isLiked ? 'unliked' : 'liked'} successfully`);
      } else {
        throw new Error(response.error || 'Failed to update like status');
      }
    } catch (error) {
      logger.error('Failed to toggle like', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update like status',
      }));
    }
  }, [postId, state.isLiked, state.isLoading]);

  const toggleBookmark = useCallback(async () => {
    if (state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = state.isBookmarked 
        ? await discourseApiService.unbookmarkPost(postId)
        : await discourseApiService.bookmarkPost(postId);

      if (response.success) {
        setState(prev => ({
          ...prev,
          isBookmarked: !prev.isBookmarked,
          isLoading: false,
        }));
        logger.info(`Post ${postId} ${state.isBookmarked ? 'unbookmarked' : 'bookmarked'} successfully`);
      } else {
        throw new Error(response.error || 'Failed to update bookmark status');
      }
    } catch (error) {
      logger.error('Failed to toggle bookmark', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update bookmark status',
      }));
    }
  }, [postId, state.isBookmarked, state.isLoading]);

  const createComment = useCallback(async (content: string, replyToPostNumber?: number) => {
    if (state.isLoading) return false;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await discourseApiService.createComment({
        content,
        byteId: postId,
        replyToPostNumber
      });

      if (response.success) {
        setState(prev => ({ ...prev, isLoading: false }));
        logger.info(`Comment created successfully for post ${postId}`);
        return true;
      } else {
        throw new Error(response.error || 'Failed to create comment');
      }
    } catch (error) {
      logger.error('Failed to create comment', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      }));
      return false;
    }
  }, [postId, state.isLoading]);

  const updateState = useCallback((updates: Partial<PostActionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    ...state,
    toggleLike,
    toggleBookmark,
    createComment,
    updateState,
  };
} 