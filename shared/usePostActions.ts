import { useState, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface PostActionState {
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  isLoading: boolean;
  error?: string;
}

export function usePostActions(
  postId: number, // For like/bookmark actions on the post
  topicId: number, // For comment creation (topic ID)
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
        ? await discourseApi.unlikePost(postId)
        : await discourseApi.likePost(postId);

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
        ? await discourseApi.unbookmarkPost(postId)
        : await discourseApi.bookmarkPost(postId);

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
      console.log('📝 usePostActions.createComment:', {
        topicId,
        replyToPostNumber,
        contentLength: content.length,
        hasReply: !!replyToPostNumber
      });

      const response = await discourseApi.createComment({
        content,
        byteId: topicId, // Use topicId, not postId
        replyToPostNumber
      });

      console.log('📥 usePostActions.createComment response:', {
        success: response.success,
        error: response.error,
        errors: response.errors,
        status: response.status
      });

      if (response.success) {
        setState(prev => ({ ...prev, isLoading: false }));
        logger.info(`Comment created successfully for topic ${topicId}`);
        return true;
      } else {
        // Extract detailed error message
        const errorMessage = response.error || 
                            (response.errors && Array.isArray(response.errors) ? response.errors.join(', ') : 'Unknown error') ||
                            'Failed to create comment';
        console.error('❌ usePostActions.createComment failed:', errorMessage);
        
        // Preserve the original error message so it can be detected by the UI layer
        // The UI will detect "too short" errors and show user-friendly messages
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error('Failed to create comment', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create comment';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [topicId, state.isLoading]);

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