import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Alert, FlatList } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Comment } from '../CommentItem';
import { TopicData } from '@/shared/useTopic';
import { discourseApi } from '@/shared/discourseApi';
import { getCommentErrorMessage, isConsecutiveReplyError } from '@/shared/utils/comment-errors';
import { CommentsSheetRef } from '@/components/comments/CommentsSheet';
import { NewCommentInputRef } from '@/components/feed/NewCommentInput';

interface UseByteBlogCommentsParams {
  topicId: number;
  topic: TopicData | null;
  refetch: () => Promise<void>;
  user: { name: string; avatar: string } | null;
  isAuthenticated: boolean;
  createComment: (content: string, replyToPostNumber?: number) => Promise<boolean>;
  actionsError: string | undefined;
  scrollOffsetRef: React.MutableRefObject<number>;
  flatListRef: React.RefObject<FlatList>;
  initialCommentsVisible?: boolean;
}

/**
 * Hook for managing comments in ByteBlogPage
 * Handles comment transformation, optimistic updates, and comment actions
 */
export function useByteBlogComments({
  topicId,
  topic,
  refetch,
  user,
  isAuthenticated,
  createComment,
  actionsError,
  scrollOffsetRef,
  flatListRef,
  initialCommentsVisible = false,
}: UseByteBlogCommentsParams) {
  const [replyTo, setReplyTo] = useState<{ postNumber: number; username: string } | null>(null);
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const commentSheetRef = useRef<CommentsSheetRef>(null);
  const commentInputRef = useRef<NewCommentInputRef>(null);

  // Transform topic posts to comments with proper reply structure
  const transformPostsToComments = useCallback((posts: TopicData['posts']): Comment[] => {
    // Create a map of post numbers to post IDs for quick lookup
    const postNumberToIdMap = new Map<number, string>();
    posts.forEach(post => {
      postNumberToIdMap.set(post.number, post.id.toString());
    });

    return posts.slice(1).map((post) => {
      const comment: Comment = {
        id: post.id.toString(),
        author: {
          name: post.author.name,
          avatar: post.author.avatar,
        },
        content: post.content.replace(/<[^>]*>/g, ''), // Strip HTML tags
        createdAt: new Date(post.createdAt).toLocaleDateString(),
        likes: post.likeCount,
        replyToPostNumber: post.reply_to_post_number,
      };

      // Set parentId based on reply_to_post_number
      if (post.reply_to_post_number) {
        const parentId = postNumberToIdMap.get(post.reply_to_post_number);
        if (parentId) {
          comment.parentId = parentId;
        }
      }

      return comment;
    });
  }, []);

  // Memoize comment list computation (merge real comments with optimistic ones)
  const commentList = useMemo(() => {
    if (!topic) return [];

    const comments = transformPostsToComments(topic.posts);
    const parents: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      const isReply = !!(comment.parentId || comment.replyToPostNumber);
      if (!isReply) {
        parents.push({ ...comment, isReply: false });
        return;
      }

      if (comment.parentId) {
        const existing = replyMap.get(comment.parentId) || [];
        existing.push({ ...comment, isReply: true });
        replyMap.set(comment.parentId, existing);
      } else {
        parents.push({ ...comment, isReply: false });
      }
    });

    // Compose a flat list of items: parent, then its replies indented
    const realComments = parents.flatMap((parent) => [
      parent,
      ...(replyMap.get(parent.id) || []),
    ]);

    // Merge with optimistic comments
    return [...realComments, ...optimisticComments];
  }, [topic, transformPostsToComments, optimisticComments]);

  // Open comments sheet on mount if initialCommentsVisible is true
  useEffect(() => {
    if (initialCommentsVisible) {
      setTimeout(() => {
        commentSheetRef.current?.present();
      }, 50);
    }
  }, [initialCommentsVisible]);

  // Handle sending comments with optimistic updates
  const handleSendComment = useCallback(async (content: string, replyToPostNumber?: number) => {
    // Create optimistic comment
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      author: {
        name: user?.name || 'You',
        avatar: user?.avatar || '',
      },
      content: content,
      createdAt: 'Just now',
      likes: 0,
      replyToPostNumber,
      isReply: !!replyToPostNumber,
      isNew: true,
    };

    // Add to optimistic list immediately
    setOptimisticComments(prev => [...prev, optimisticComment]);
    
    // Store scroll position before API call
    const storedScrollOffset = scrollOffsetRef.current;
    
    try {
      const success = await createComment(content, replyToPostNumber);
      if (success) {
        // Remove optimistic comment
        setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
        
        // ✅ FIXED: Use refetch to always reload topic data (not retry, which only works on errors)
        await refetch();
        
        // Restore scroll position after a brief delay to let the list update
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: storedScrollOffset, animated: false });
        }, 200);
        
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        
        // Clear reply state after successful send
        if (replyToPostNumber) {
          setReplyTo(null);
        }
      } else {
        // Remove failed optimistic comment
        setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
        // Note: createComment returns false on error, error details are in the hook state
        // Get error from actionsError and show user-friendly message
        const errorMsg = actionsError || 'Failed to post comment';
        const friendlyMessage = getCommentErrorMessage(errorMsg);
        
        // Check if error is authentication-related and redirect to sign in
        const isAuthError = errorMsg.toLowerCase().includes('authentication') || 
                           errorMsg.toLowerCase().includes('sign in') ||
                           errorMsg.toLowerCase().includes('please sign in');
        
        // Check if error is about consecutive replies
        const isConsecutiveReply = isConsecutiveReplyError(errorMsg);
        
        if (isAuthError) {
          Alert.alert(
            'Sign in required',
            'Please sign in to post a comment.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Sign in', 
                onPress: () => router.push('/(auth)/signin' as any)
              }
            ]
          );
        } else if (isConsecutiveReply) {
          Alert.alert(
            'Too Many Replies',
            friendlyMessage,
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Error', friendlyMessage);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } catch (error) {
      // Remove failed optimistic comment
      setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
      const errorMessage = error instanceof Error ? error.message : 'Failed to post comment';
      console.error('❌ handleSendComment error:', error);
      
      // Check if error is authentication-related and redirect to sign in
      const isAuthError = errorMessage.toLowerCase().includes('authentication') || 
                         errorMessage.toLowerCase().includes('sign in') ||
                         errorMessage.toLowerCase().includes('please sign in');
      
      // Check if error is about consecutive replies
      const isConsecutiveReply = isConsecutiveReplyError(errorMessage);
      
      if (isAuthError) {
        Alert.alert(
          'Sign in required',
          'Please sign in to post a comment.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign in', 
              onPress: () => router.push('/(auth)/signin' as any)
            }
          ]
        );
      } else if (isConsecutiveReply) {
        const friendlyMessage = getCommentErrorMessage(errorMessage);
        Alert.alert(
          'Too Many Replies',
          friendlyMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Show user-friendly message for "too short" errors
        const friendlyMessage = getCommentErrorMessage(errorMessage);
        Alert.alert('Error', friendlyMessage);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [createComment, refetch, user, actionsError, scrollOffsetRef, flatListRef]);

  // Handle liking individual comments
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      const postId = parseInt(commentId, 10);
      if (isNaN(postId)) {
        Alert.alert('Error', 'Invalid comment ID');
        return;
      }
      
      // Use discourseApi directly for individual comment likes
      const response = await discourseApi.likeComment(postId);
      if (response.success) {
        // ✅ FIXED: Use refetch to always reload topic data
        await refetch();
      } else {
        Alert.alert('Error', response.error || 'Failed to like comment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to like comment');
    }
  }, [refetch]);

  // Handle replying to comments - BARE BONES: Only top-level comments
  const handleReplyToComment = useCallback((commentId: string) => {
    console.log('🔍 Reply attempt:', { commentId, commentListLength: commentList.length });
    
    // Find the comment in commentList
    const comment = commentList.find(c => c.id === commentId);
    if (!comment) {
      console.warn('❌ Comment not found:', commentId);
      Alert.alert('Error', 'Comment not found');
      return;
    }
    
    // BARE BONES: Only allow replying to top-level comments (not replies)
    // This prevents the "@node" error when trying to reply to nested replies
    // Check if it's a reply by looking for parentId or replyToPostNumber
    if (comment.parentId || comment.replyToPostNumber) {
      console.log('⚠️ Attempted to reply to nested comment:', { 
        commentId, 
        parentId: comment.parentId, 
        replyToPostNumber: comment.replyToPostNumber 
      });
      Alert.alert('Info', 'You can only reply to top-level comments for now.');
      return;
    }
    
    // Find the post from topic posts
    const post = topic?.posts?.find(p => p.id.toString() === commentId);
    if (!post) {
      console.error('❌ Post not found for comment:', { 
        commentId, 
        comment, 
        postsCount: topic?.posts?.length,
        availablePostIds: topic?.posts?.slice(0, 5).map(p => p.id.toString())
      });
      Alert.alert('Error', 'Could not find the comment to reply to.');
      return;
    }
    
    // CRITICAL: Validate post.number exists and is a valid number
    if (!post.number || typeof post.number !== 'number' || post.number <= 0) {
      console.error('❌ Invalid post number:', { 
        post, 
        commentId, 
        postNumber: post.number,
        postNumberType: typeof post.number
      });
      Alert.alert('Error', 'Invalid comment structure. Please refresh and try again.');
      return;
    }
    
    console.log('✅ Setting reply state:', { 
      postNumber: post.number, 
      username: comment.author.name 
    });
    
    // Set reply state
    setReplyTo({
      postNumber: post.number,
      username: comment.author.name,
    });
    
    // Immediately snap sheet to full screen (index 1)
    commentSheetRef.current?.snapToIndex(1);
    
    // After 120ms delay, focus the input (allows sheet animation to complete)
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 120);
  }, [commentList, topic]);

  return {
    commentList,
    replyTo,
    setReplyTo,
    handleSendComment,
    handleLikeComment,
    handleReplyToComment,
    commentSheetRef,
    commentInputRef,
  };
}
