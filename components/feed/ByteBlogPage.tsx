import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, NativeSyntheticEvent, NativeScrollEvent, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { CommentItem, Comment } from './CommentItem';
import { useTopic, TopicData } from '../../shared/useTopic';
import { usePostActions } from '../../shared/usePostActions';
import { discourseApi } from '../../shared/discourseApi';
import { useHeader } from '../ui/header';
import { StatusChipsRow } from './StatusChipsRow';
import { OverflowMenu } from './OverflowMenu';
import { ShareButton } from './ShareButton';
import { StickyActionBar } from './StickyActionBar';
import { MarkdownContent } from './MarkdownContent';
import { useAuth } from '@/shared/useAuth';
import { useBookmarkStore } from '@/shared/useBookmarkSync';

export interface ByteBlogPageProps {
  topicId: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  initialCommentsVisible?: boolean;
}

// UI Spec: ByteBlogPage — Blog-style Byte details page with author, title, content, cover image, and action bar. Themed and accessible.
export function ByteBlogPage({
  topicId,
  onLike,
  onComment,
  onShare,
  onBookmark,
  initialCommentsVisible = false,
}: ByteBlogPageProps) {
  const { isDark, isAmoled } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { setHeader, resetHeader, setSubHeader, setActions, setBackBehavior, registerScrollHandler } = useHeader();
  const { topic, isLoading, hasError, errorMessage, retry, refetch } = useTopic(topicId);
  const [isCommentsVisible, setIsCommentsVisible] = useState(initialCommentsVisible);
  const [replyTo, setReplyTo] = useState<{ postNumber: number; username: string } | null>(null);
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const flatListRef = useRef<import('react-native').FlatList>(null);
  const scrollOffsetRef = useRef<number>(0);
  
  // Add simple text state for the input
  const [commentText, setCommentText] = useState('');
  
  // Helper to detect if error is about comment being too short
  const isCommentTooShortError = useCallback((error: string | Error | undefined): boolean => {
    if (!error) return false;
    const errorStr = error instanceof Error ? error.message : String(error);
    const lowerError = errorStr.toLowerCase();
    return lowerError.includes('too short') || 
           lowerError.includes('minimum') || 
           lowerError.includes('at least') ||
           lowerError.includes('body is too short') ||
           lowerError.includes('post is too short') ||
           lowerError.includes('raw is too short');
  }, []);

  // Helper to get user-friendly error message
  const getCommentErrorMessage = useCallback((error: string | Error | undefined): string => {
    if (!error) return 'Failed to send comment. Please try again.';
    const errorStr = error instanceof Error ? error.message : String(error);
    
    if (isCommentTooShortError(errorStr)) {
      return 'Your comment is too short. Please write a bit more before sending.';
    }
    
    return errorStr;
  }, [isCommentTooShortError]);
  
  // Extract first post ID for like/bookmark actions
  const firstPostId = topic?.posts?.[0]?.id || 0;
  const firstPost = topic?.posts?.[0];
  
  // Use the post actions hook for the first post (main topic)
  const {
    isLiked: currentIsLiked,
    isBookmarked: currentIsBookmarked,
    likeCount: currentLikeCount,
    isLoading: actionsLoading,
    error: actionsError,
    toggleLike,
    toggleBookmark,
    createComment,
    updateState,
  } = usePostActions(
    firstPostId || topicId, // Post ID for like/bookmark, fallback to topicId
    topicId,                 // Topic ID for comments
    topic?.likeCount || 0,
    firstPost?.isLiked || false,
    false
  );
  
  // Sync state when topic loads
  useEffect(() => {
    if (topic && firstPost) {
      updateState({
        isLiked: firstPost.isLiked || false,
        likeCount: topic.likeCount || 0,
      });
      
      // Sync bookmark state to global store
      // FIXED: Handle undefined bookmarked value safely
      if (topic.bookmarked !== undefined) {
        useBookmarkStore.getState().toggleBookmark(topic.id, topic.bookmarked);
      }
    }
  }, [topic, firstPost, updateState]);

  // Format time ago helper
  const formatTimeAgo = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInHours < 168) { // 7 days
        const days = Math.floor(diffInHours / 24);
        return `${days}d ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Unknown time';
    }
  }, []);

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
    const parents = comments.filter(c => !c.parentId && !c.replyToPostNumber);
    const replies = comments.filter(c => c.parentId || c.replyToPostNumber);
    
    function getReplies(parentId: string) {
      return replies.filter(r => r.parentId === parentId);
    }

    // Compose a flat list of items: parent, then its replies indented
    const realComments = parents.flatMap(parent => [
      { ...parent, isReply: false },
      ...getReplies(parent.id).map(reply => ({ ...reply, isReply: true })),
    ]);

    // Merge with optimistic comments
    return [...realComments, ...optimisticComments];
  }, [topic, transformPostsToComments, optimisticComments]);

  // Scroll to comments on mount if initialCommentsVisible is true
  useEffect(() => {
    if (initialCommentsVisible && flatListRef.current && commentList.length > 0) {
      // Wait for the FlatList to render and then scroll to comments section
      setTimeout(() => {
        // FIXED: Add error handling for scrollToIndex
        // Comments start at index 0 (header is in ListHeaderComponent)
        try {
          flatListRef.current?.scrollToIndex({ 
            index: 0, 
            animated: true,
            viewPosition: 0.1 // Position comments near the top
          });
        } catch (error) {
          // Fallback: scroll to top using offset
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      }, 500); // Increased delay to ensure content is rendered
    }
  }, [initialCommentsVisible, commentList.length]);

  // Memoized event handlers
  const handleLike = useCallback(async () => {
    try {
      await toggleLike();
      if (onLike) onLike();
    } catch (error) {
      Alert.alert('Error', 'Failed to update like status');
    }
  }, [toggleLike, onLike]);

  const handleToggleComments = useCallback(() => {
    setIsCommentsVisible(v => !v);
  }, []);

  const handleBookmark = useCallback(async () => {
    try {
      await toggleBookmark();
      
      // Sync bookmark state to global store
      if (topic) {
        useBookmarkStore.getState().toggleBookmark(topic.id, !currentIsBookmarked);
      }
      
      // Provide haptic feedback for bookmark success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      if (onBookmark) onBookmark();
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark status');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [toggleBookmark, onBookmark, topic, currentIsBookmarked]);

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
      } else {
        // Remove failed optimistic comment
        setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
        // Note: createComment returns false on error, error details are in the hook state
        // Get error from actionsError and show user-friendly message
        const errorMsg = actionsError || 'Failed to post comment';
        const friendlyMessage = getCommentErrorMessage(errorMsg);
        Alert.alert('Error', friendlyMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } catch (error) {
      // Remove failed optimistic comment
      setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
      const errorMessage = error instanceof Error ? error.message : 'Failed to post comment';
      console.error('❌ handleSendComment error:', error);
      
      // Show user-friendly message for "too short" errors
      const friendlyMessage = getCommentErrorMessage(errorMessage);
      Alert.alert('Error', friendlyMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [createComment, refetch, user, getCommentErrorMessage, actionsError]);

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
    
    // Don't scroll - input is already visible at bottom
  }, [commentList, topic]);
  
  // Clear reply state after sending
  const handleSendCommentWithReply = useCallback(async (content: string, replyToPostNumber?: number) => {
    await handleSendComment(content, replyToPostNumber);
    setReplyTo(null); // Clear reply state after sending
  }, [handleSendComment]);

  // Simple send handler for minimal input - BARE BONES with error handling
  const handleSimpleSend = useCallback(async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    
    // Frontend validation for minimum length
    if (commentText.trim().length < 2) {
      Alert.alert('Comment too short', 'Your comment must be at least 2 characters long. Please write a bit more.');
      return;
    }
    
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in to comment');
      return;
    }
    
    // CRITICAL: Validate replyToPostNumber if replyTo exists
    if (replyTo) {
      if (!replyTo.postNumber || typeof replyTo.postNumber !== 'number' || replyTo.postNumber <= 0) {
        console.error('❌ Invalid replyToPostNumber:', { 
          replyTo, 
          postNumber: replyTo.postNumber,
          postNumberType: typeof replyTo.postNumber
        });
        Alert.alert('Error', 'Invalid reply target. Please try again.');
        setReplyTo(null); // Clear invalid state
        return;
      }
    }
    
    try {
      const replyToPostNumber = replyTo?.postNumber;
      console.log('📤 Sending comment:', { 
        hasReply: !!replyTo, 
        replyToPostNumber,
        commentLength: commentText.trim().length,
        topicId
      });
      
      await handleSendComment(commentText.trim(), replyToPostNumber);
      console.log('✅ Comment sent successfully');
      setCommentText('');
      setReplyTo(null);
    } catch (error) {
      console.error('❌ Send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', { error, errorMessage, replyTo });
      
      // Show user-friendly message for "too short" errors
      const friendlyMessage = getCommentErrorMessage(errorMessage);
      Alert.alert('Error', friendlyMessage);
    }
  }, [commentText, handleSendComment, replyTo, isAuthenticated, topicId, getCommentErrorMessage]);

  // Simple debounce utility
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Handle scroll to track position and read status
  // ✅ FIXED: Extract values synchronously before debouncing to prevent event pooling issues
  const handleScrollDebounced = useMemo(
    () =>
      debounce((scrollData: { 
        contentOffset: { x: number; y: number }; 
        contentSize: { width: number; height: number }; 
        layoutMeasurement: { width: number; height: number } 
      }) => {
        const { contentOffset, contentSize, layoutMeasurement } = scrollData;
        const scrollHeight = contentSize.height - layoutMeasurement.height;
        if (scrollHeight > 0 && topic) {
          const scrollPercentage = contentOffset.y / scrollHeight;
          // If scrolled near bottom (80%), Discourse will track read position automatically
          // via track_visit=1 parameter in getTopic calls
          // No explicit API call needed - Discourse tracks this on topic view
        }
      }, 1000),
    [debounce, topic]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // ✅ FIXED: Extract values synchronously before debouncing
      // This prevents "Cannot read property 'contentOffset' of null" error
      // React Native events are pooled and may be null when accessed asynchronously
      if (!event?.nativeEvent) {
        return; // Safety check
      }
      
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      
      // Store scroll position immediately (synchronous)
      scrollOffsetRef.current = contentOffset.y;
      
      // Pass extracted values to debounced function, not the event object
      handleScrollDebounced({
        contentOffset,
        contentSize,
        layoutMeasurement,
      });
    },
    [handleScrollDebounced]
  );

  // Configure header
  useEffect(() => {
    if (topic) {
      setHeader({
        title: topic.category.name || 'Byte',
        canGoBack: true,
        tone: "bg",
        withSafeTop: false,
        titleFontSize: 24,
        statusBarStyle: isDark ? 'light' : 'dark',
        extendToStatusBar: true,
      });
      setBackBehavior({
        canGoBack: true,
      });
      setActions([
        <ShareButton 
          key="share" 
          title={topic.title || ''} 
          url={topic.url || ''} 
          onPress={onShare}
        />,
        <OverflowMenu 
          key="menu"
          topic={topic}
          onWatch={onShare}
          onMute={onShare}
          onPin={onShare}
          onClose={onShare}
          onShare={onShare}
          onRefresh={retry}
        />
      ]);
      setSubHeader(
        <StatusChipsRow
          isPinned={topic.isPinned}
          isLocked={topic.isClosed}
          isArchived={topic.isArchived}
          isStaff={isStaff}
        />
      );
    }
    return () => resetHeader();
  }, [topic, isDark, isStaff, formatTimeAgo, setHeader, resetHeader, setBackBehavior, setActions, setSubHeader, onShare, retry]);

  // Register scroll handler
  useEffect(() => {
    const unregister = registerScrollHandler(handleScroll);
    return unregister;
  }, [registerScrollHandler, handleScroll]);


  // Empty states for comments
  const renderEmptyComments = useCallback(() => {
    return (
      <View className="py-12 px-5 items-center">
        <Text className="text-lg font-semibold mb-2 text-fomio-foreground dark:text-fomio-foreground-dark">
          Be the first to reply
        </Text>
        <Text className="text-sm text-center text-fomio-muted dark:text-fomio-muted-dark">
          Start the conversation by adding a comment below.
        </Text>
      </View>
    );
  }, []);

  const renderCommentsError = useCallback(() => {
    return (
      <TouchableOpacity
        onPress={retry}
        className="py-12 px-5 items-center"
      >
        <Text className="text-base font-medium mb-2 text-fomio-danger dark:text-fomio-danger-dark">
          Failed to load comments
        </Text>
        <Text className="text-sm text-fomio-muted dark:text-fomio-muted-dark">
          Tap to retry
        </Text>
      </TouchableOpacity>
    );
  }, [retry]);

  // FlatList data - footer is now handled by ListFooterComponent
  const flatListData = useMemo(() => [
    // Comments section (only if visible)
    ...(isCommentsVisible ? commentList.map(item => ({ ...item, type: 'comment' })) : []),
  ], [isCommentsVisible, commentList]);

  // Handle empty avatar URLs
  const avatarSource = useMemo(() => {
    if (!topic || !topic.author.avatar || topic.author.avatar.trim() === '') {
      return undefined;
    }
    return { uri: topic.author.avatar };
  }, [topic]);

  // Memoized header section - MOVED BEFORE EARLY RETURNS
  const renderHeaderSection = useMemo(() => {
    // Return null if topic doesn't exist yet (will be handled by early return)
    if (!topic) return null;

    return (
    <View className={`px-5 pt-5 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}> 
      {/* Author & Category Information */}
      <View className="flex-row items-center mb-5">
        {avatarSource ? (
          <Image 
            source={avatarSource} 
            className="w-14 h-14 rounded-full mr-4"
            accessibilityLabel={`${topic.author.name}'s avatar`}
          />
        ) : (
          <View className="w-14 h-14 rounded-full mr-4 justify-center items-center bg-fomio-muted dark:bg-fomio-muted-dark">
            <Text className={`text-xl font-semibold ${isAmoled ? 'text-fomio-bg-dark' : isDark ? 'text-fomio-bg-dark' : 'text-fomio-bg'}`}>
              {topic.author.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-bold mb-0.5 text-fomio-foreground dark:text-fomio-foreground-dark">
            {topic.author.name}
          </Text>
          <Text className="text-sm font-normal mb-2 text-fomio-muted dark:text-fomio-muted-dark">
            @{topic.author.username}
          </Text>
          <View className="mt-1">
            <View 
              className="self-start px-3 py-1.5 rounded-full"
              style={{ backgroundColor: topic.category.color + '20' }}
            >
              <Text 
                className="text-xs font-semibold"
                style={{ color: topic.category.color }}
              >
                {topic.category.name}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Tags */}
      {topic.tags && topic.tags.length > 0 && (
        <View className="flex-row flex-wrap items-center gap-2 mb-4">
          {topic.tags.slice(0, 3).map((tag, index) => (
            <TouchableOpacity
              key={index}
              className="px-2 py-1 rounded-xl"
              style={{ backgroundColor: (isDark ? '#60a5fa' : '#2563EB') + '20' }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`View posts tagged with ${tag}`}
            >
              <Text 
                className="text-xs font-medium"
                style={{ color: isDark ? '#60a5fa' : '#2563EB' }}
              >
                #{tag}
              </Text>
            </TouchableOpacity>
          ))}
          {topic.tags.length > 3 && (
            <Text className="text-xs font-normal text-fomio-muted dark:text-fomio-muted-dark">
              +{topic.tags.length - 3} more
            </Text>
          )}
        </View>
      )}
      
      {/* Title - Limited to 1-2 lines */}
      <Text 
        className="text-[24px] font-bold mb-3 text-fomio-foreground dark:text-fomio-foreground-dark"
        numberOfLines={2}
        style={{ lineHeight: 32 }}
      >
        {topic.title}
      </Text>

      {/* Meta row: Author, Time, Read time estimate */}
      <View className="flex-row items-center mb-3">
        <Text className="text-sm font-normal text-fomio-muted dark:text-fomio-muted-dark">
          {formatTimeAgo(topic.createdAt)}
        </Text>
        {topic.content && (
          <>
            <Text className="text-sm font-normal mx-2 text-fomio-muted dark:text-fomio-muted-dark">•</Text>
            <Text className="text-sm font-normal text-fomio-muted dark:text-fomio-muted-dark">
              {Math.max(1, Math.ceil(topic.content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200))} min read
            </Text>
          </>
        )}
      </View>

      {/* Hub/Teret chips row */}
      <View className="flex-row items-center gap-2 mb-3">
        <TouchableOpacity
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`View ${topic.category.name} hub`}
        >
          <Text className="text-xs font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
            {topic.category.name}
          </Text>
        </TouchableOpacity>
        {/* Teret chip would go here if we had teret data */}
      </View>

      {/* Stats row */}
      <View className="flex-row items-center mb-4">
        <Text className="text-sm font-normal text-fomio-muted dark:text-fomio-muted-dark">
          {topic.likeCount} likes • {topic.replyCount} comments • {topic.views} views
        </Text>
      </View>

      {/* Unread indicator */}
      {topic.unreadCount > 0 && (
        <TouchableOpacity
          className="self-start px-3 py-1.5 rounded-full mb-4"
          style={{ backgroundColor: isDark ? '#3b82f6' : '#2563eb' }}
          onPress={() => {
            // FIXED: Add error handling for scrollToIndex
            const firstUnreadIndex = topic.posts.findIndex(p => p.number > topic.lastReadPostNumber);
            if (firstUnreadIndex > 0 && flatListRef.current) {
              try {
                flatListRef.current.scrollToIndex({ 
                  index: firstUnreadIndex - 1, 
                  animated: true,
                  viewPosition: 0.1
                });
              } catch (error) {
                // Fallback: scroll to approximate offset
                const approximateOffset = (firstUnreadIndex - 1) * 150; // ~150px per item
                flatListRef.current.scrollToOffset({ 
                  offset: approximateOffset, 
                  animated: true 
                });
              }
            }
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Jump to first unread comment (${topic.unreadCount} unread)`}
        >
          <Text className="text-xs font-semibold text-white">
            Jump to first unread ({topic.unreadCount})
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Content */}
      <View className="mb-8">
        <MarkdownContent 
          content={topic.content} 
          isRawMarkdown={false} 
        />
      </View>
      
    </View>
    );
  }, [
    topic,
    avatarSource,
    isDark,
    isAmoled,
    currentIsLiked,
    currentIsBookmarked,
    currentLikeCount,
    isCommentsVisible,
    actionsLoading,
    handleLike,
    handleToggleComments,
    handleBookmark,
    formatTimeAgo,
    flatListRef,
  ]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: any, index: number) => {
    return item.id || `item-${index}`;
  }, []);

  // Handle scrollToIndex failures safely
  const handleScrollToIndexFailed = useCallback((info: { 
    index: number; 
    highestMeasuredFrameIndex: number; 
    averageItemLength: number 
  }) => {
    // Calculate approximate offset based on average item length
    const offset = info.index * info.averageItemLength;
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ 
        offset: Math.max(0, offset), 
        animated: true 
      });
    }, 100);
  }, []);

  // Render item for FlatList - only handles comments now
  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'comment') {
      return (
        <CommentItem 
          comment={item} 
          isReply={item.isReply}
          onLike={handleLikeComment}
          onReply={handleReplyToComment}
        />
      );
    }
    return null;
  }, [handleLikeComment, handleReplyToComment]);

  // Simplified footer - just the action bar (input is outside FlatList now)
  const renderFooter = useMemo(() => {
    return (
      <StickyActionBar
        isLiked={currentIsLiked}
        isBookmarked={currentIsBookmarked}
        likeCount={currentLikeCount}
        replyCount={topic?.replyCount || 0}
        onLike={handleLike}
        onComment={handleToggleComments}
        onBookmark={handleBookmark}
        onShare={onShare || (() => {})}
      />
    );
  }, [currentIsLiked, currentIsBookmarked, currentLikeCount, topic?.replyCount, handleLike, handleToggleComments, handleBookmark, onShare]);

  // NOW early returns come AFTER all hooks
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-fomio-bg dark:bg-fomio-bg-dark">
        <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#2563EB'} />
        <Text className="mt-2.5 text-base text-fomio-foreground dark:text-fomio-foreground-dark">
          Loading topic...
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-fomio-bg dark:bg-fomio-bg-dark">
        <Text className="text-base text-center mb-5 text-fomio-danger dark:text-fomio-danger-dark">
          {errorMessage || 'Failed to load topic'}
        </Text>
        <TouchableOpacity 
          onPress={retry} 
          className="bg-fomio-primary dark:bg-fomio-primary-dark py-2.5 px-5 rounded-lg"
        >
          <Text className="text-white text-base font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!topic) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-fomio-bg dark:bg-fomio-bg-dark">
        <Text className="text-base text-fomio-foreground dark:text-fomio-foreground-dark">
          Topic not found
        </Text>
      </View>
    );
  }

  // Check if author has Staff badge
  const isStaff = topic?.authorBadges?.some(badge => badge.name === 'Staff') || false;

  // Main render - MINIMAL VERSION
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView className={`flex-1 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}>
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            ListHeaderComponent={renderHeaderSection}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              isCommentsVisible && commentList.length === 0 && !isLoading
                ? renderEmptyComments
                : hasError && isCommentsVisible
                ? renderCommentsError
                : undefined
            }
            data={flatListData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            contentContainerStyle={{ 
              paddingBottom: 12,
              backgroundColor: isAmoled ? '#000000' : (isDark ? '#000000' : '#F7F7F8')
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
          />
          
          {/* Simple input box - outside FlatList */}
          {isCommentsVisible && (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? '#374151' : '#e2e8f0',
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isAmoled ? '#000000' : (isDark ? '#23232b' : '#f8fafc'),
              }}
            >
              {replyTo && (
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: isDark ? '#60a5fa' : '#2563EB' }}>
                    Replying to @{replyTo.username}
                  </Text>
                </View>
              )}
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment…"}
                placeholderTextColor={isDark ? '#a1a1aa' : '#5C5D67'}
                multiline
                blurOnSubmit={false}
                style={{
                  maxHeight: 120,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#374151' : '#ffffff',
                  color: isDark ? '#f4f4f5' : '#17131B',
                  fontSize: 15,
                  marginBottom: 8,
                }}
              />
              <Pressable 
                onPress={handleSimpleSend}
                disabled={!commentText.trim() || !isAuthenticated}
                style={{
                  alignSelf: 'flex-end',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: (!commentText.trim() || !isAuthenticated) 
                    ? (isDark ? '#374151' : '#e2e8f0')
                    : (isDark ? '#3b82f6' : '#2563eb'),
                }}
              >
                <Text style={{
                  color: (!commentText.trim() || !isAuthenticated)
                    ? (isDark ? '#6b7280' : '#9ca3af')
                    : '#ffffff',
                  fontWeight: '600',
                }}>
                  Send
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
