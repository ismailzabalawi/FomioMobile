import { useState, useEffect, useCallback } from 'react';
import { discourseApi, Comment } from './discourseApi';

export interface CommentsState {
  comments: Comment[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isPosting: boolean;
}

export function useComments(byteId: number) {
  const [commentsState, setCommentsState] = useState<CommentsState>({
    comments: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    isPosting: false
  });

  useEffect(() => {
    if (byteId) {
      loadComments();
    }
  }, [byteId]);

  const loadComments = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setCommentsState(prev => ({
          ...prev,
          isLoading: true,
          error: null
        }));
      } else {
        setCommentsState(prev => ({
          ...prev,
          isRefreshing: true,
          error: null
        }));
      }

      const response = await discourseApi.getComments(byteId);

      if (response.success && response.data) {
        setCommentsState(prev => ({
          ...prev,
          comments: response.data || [],
          isLoading: false,
          isRefreshing: false,
          error: null
        }));
      } else {
        setCommentsState(prev => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: response.error || 'Failed to load comments'
        }));
      }
    } catch (error) {
      console.error('Comments loading error:', error);
      setCommentsState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Network error'
      }));
    }
  };

  const refreshComments = useCallback(() => {
    loadComments(false);
  }, [byteId]);

  const createComment = async (
    content: string,
    replyToPostNumber?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setCommentsState(prev => ({
        ...prev,
        isPosting: true,
        error: null
      }));

      const response = await discourseApi.createComment({
        content,
        byteId,
        replyToPostNumber
      });

      if (response.success && response.data) {
        // Add the new comment to the list
        setCommentsState(prev => ({
          ...prev,
          comments: response.data ? [...prev.comments, response.data] : prev.comments,
          isPosting: false
        }));

        return { success: true };
      } else {
        setCommentsState(prev => ({
          ...prev,
          isPosting: false,
          error: response.error || 'Failed to create comment'
        }));

        return {
          success: false,
          error: response.error || 'Failed to create comment'
        };
      }
    } catch (error) {
      console.error('Create comment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setCommentsState(prev => ({
        ...prev,
        isPosting: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const updateComment = async (
    commentId: number,
    content: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await discourseApi.updateComment(commentId, content);

      if (response.success && response.data) {
        // Update the comment in the list
        setCommentsState(prev => ({
          ...prev,
          comments: prev.comments.map(comment =>
            comment.id === commentId ? response.data! : comment
          )
        }));

        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to update comment'
        };
      }
    } catch (error) {
      console.error('Update comment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  };

  const deleteComment = async (commentId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await discourseApi.deleteComment(commentId);

      if (response.success) {
        // Remove the comment from the list
        setCommentsState(prev => ({
          ...prev,
          comments: prev.comments.filter(comment => comment.id !== commentId)
        }));

        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to delete comment'
        };
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  };

  const likeComment = async (commentId: number) => {
    try {
      // Optimistically update UI
      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likeCount: comment.isLiked ? comment.likeCount - 1 : comment.likeCount + 1
              }
            : comment
        )
      }));

      const response = await discourseApi.likeComment(commentId);

      if (!response.success) {
        // Revert optimistic update on failure
        setCommentsState(prev => ({
          ...prev,
          comments: prev.comments.map(comment =>
            comment.id === commentId
              ? {
                  ...comment,
                  isLiked: !comment.isLiked,
                  likeCount: comment.isLiked ? comment.likeCount - 1 : comment.likeCount + 1
                }
              : comment
          )
        }));
        console.error('Failed to like comment:', response.error);
      }
    } catch (error) {
      console.error('Like comment error:', error);
      // Revert optimistic update
      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likeCount: comment.isLiked ? comment.likeCount - 1 : comment.likeCount + 1
              }
            : comment
        )
      }));
    }
  };

  const addComment = (newComment: Comment) => {
    setCommentsState(prev => ({
      ...prev,
      comments: [...prev.comments, newComment]
    }));
  };

  const clearError = () => {
    setCommentsState(prev => ({ ...prev, error: null }));
  };

  // Helper function to get replies to a specific comment
  const getReplies = (commentPostNumber: number): Comment[] => {
    return commentsState.comments.filter(
      comment => comment.replyToPostNumber === commentPostNumber
    );
  };

  // Helper function to get top-level comments (not replies)
  const getTopLevelComments = (): Comment[] => {
    return commentsState.comments.filter(comment => !comment.replyToPostNumber);
  };

  // Helper function to build threaded comment structure
  const getThreadedComments = (): Comment[] => {
    const topLevel = getTopLevelComments();
    
    return topLevel.map(comment => ({
      ...comment,
      replies: getReplies(comment.postNumber)
    }));
  };

  return {
    ...commentsState,
    refreshComments,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    addComment,
    clearError,
    getReplies,
    getTopLevelComments,
    getThreadedComments
  };
}

// Hook for managing comment drafts
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
    // Optionally pre-fill draft with @username mention
    if (!draft.includes(`@${username}`)) {
      setDraft(prev => `@${username} ${prev}`);
    }
  };

  const clearReply = () => {
    setReplyTo(null);
    // Remove @username mention if it was added
    if (replyTo) {
      setDraft(prev => prev.replace(`@${replyTo.username} `, ''));
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
    isDraftEmpty
  };
}

