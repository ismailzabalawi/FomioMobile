import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { CommentItem, Comment } from './CommentItem';
import { NewCommentInput } from './NewCommentInput';
import { useTopic, TopicData } from '../../shared/useTopic';
import { usePostActions } from '../../shared/usePostActions';
import { discourseApi } from '../../shared/discourseApi';

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
  const { topic, isLoading, hasError, errorMessage, retry } = useTopic(topicId);
  const [isCommentsVisible, setIsCommentsVisible] = useState(initialCommentsVisible);
  const [replyTo, setReplyTo] = useState<{ postNumber: number; username: string } | null>(null);
  const flatListRef = useRef<import('react-native').FlatList>(null);
  
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
    }
  }, [topic, firstPost, updateState]);

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

  // Memoize comment list computation
  const commentList = useMemo(() => {
    if (!topic) return [];

    const comments = transformPostsToComments(topic.posts);
    const parents = comments.filter(c => !c.parentId && !c.replyToPostNumber);
    const replies = comments.filter(c => c.parentId || c.replyToPostNumber);
    
    function getReplies(parentId: string) {
      return replies.filter(r => r.parentId === parentId);
    }

    // Compose a flat list of items: parent, then its replies indented
    return parents.flatMap(parent => [
      { ...parent, isReply: false },
      ...getReplies(parent.id).map(reply => ({ ...reply, isReply: true })),
    ]);
  }, [topic, transformPostsToComments]);

  // Scroll to comments on mount if initialCommentsVisible is true
  useEffect(() => {
    if (initialCommentsVisible && flatListRef.current && commentList.length > 0) {
      // Wait for the FlatList to render and then scroll to comments section
      setTimeout(() => {
        // Comments start at index 0 (header is in ListHeaderComponent)
        flatListRef.current?.scrollToIndex({ 
          index: 0, 
          animated: true,
          viewPosition: 0.1 // Position comments near the top
        });
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
      
      // Provide haptic feedback for bookmark success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (onBookmark) onBookmark();
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark status');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [toggleBookmark, onBookmark]);

  const handleSendComment = useCallback(async (content: string, replyToPostNumber?: number) => {
    try {
      const success = await createComment(content, replyToPostNumber);
      if (success) {
        // Refresh the topic to show the new comment
        retry();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    }
  }, [createComment, retry]);

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
        // Refresh topic to show updated like count
        retry();
      } else {
        Alert.alert('Error', response.error || 'Failed to like comment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to like comment');
    }
  }, [retry]);

  // Handle replying to comments
  const handleReplyToComment = useCallback((commentId: string) => {
    // Find the comment to get its post number
    const comment = commentList.find(c => c.id === commentId);
    if (!comment) return;
    
    // Find the post number from the original topic posts
    const post = topic?.posts?.find(p => p.id.toString() === commentId);
    if (!post) return;
    
    // Set reply state
    setReplyTo({
      postNumber: post.number,
      username: comment.author.name,
    });
    
    // Scroll to input
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [commentList, topic]);
  
  // Clear reply state after sending
  const handleSendCommentWithReply = useCallback(async (content: string, replyToPostNumber?: number) => {
    await handleSendComment(content, replyToPostNumber);
    setReplyTo(null); // Clear reply state after sending
  }, [handleSendComment]);

  // FlatList data
  const flatListData = useMemo(() => [
    // Comments section (only if visible)
    ...(isCommentsVisible ? commentList.map(item => ({ ...item, type: 'comment' })) : []),
    // Footer section (only if comments visible)
    ...(isCommentsVisible ? [{ type: 'footer', id: 'footer' }] : [])
  ], [isCommentsVisible, commentList]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: any, index: number) => {
    return item.id || `item-${index}`;
  }, []);

  // Render item for FlatList
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
    } else if (item.type === 'footer') {
      return <NewCommentInput onSend={handleSendCommentWithReply} replyTo={replyTo || undefined} />;
    }
    return null;
  }, [handleSendCommentWithReply, handleLikeComment, handleReplyToComment, replyTo]);

  // Handle empty avatar URLs - MOVED BEFORE EARLY RETURNS
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
      
      {/* Title and Timestamp */}
      <Text className="text-[22px] font-bold mb-2 text-fomio-foreground dark:text-fomio-foreground-dark">
        {topic.title}
      </Text>
      <Text className="text-sm font-normal mb-4 text-fomio-muted dark:text-fomio-muted-dark">
        {new Date(topic.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      
      {/* Content */}
      <View className="mb-8">
        <Text className="text-base font-normal leading-[26px] mb-3 text-fomio-muted dark:text-fomio-muted-dark">
          {topic.content.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
        </Text>
      </View>
      
      {/* Action Bar */}
      <View className={`flex-row items-center justify-between border-t pt-4 mt-2 pb-2 border-fomio-border-soft dark:border-fomio-border-soft-dark`}> 
        <TouchableOpacity
          className="flex-row items-center p-2 rounded-lg"
          onPress={handleLike}
          accessible
          accessibilityRole="button"
          accessibilityLabel={currentIsLiked ? 'Unlike' : 'Like'}
          disabled={actionsLoading}
        >
          <Heart 
            size={24} 
            weight={currentIsLiked ? 'fill' : 'regular'} 
            color={isDark ? '#a1a1aa' : '#17131B'} 
          />
          <Text className="text-[15px] ml-1.5 font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
            {currentLikeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center p-2 rounded-lg"
          onPress={handleToggleComments}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isCommentsVisible ? 'Hide comments' : 'Show comments'}
          accessibilityHint={isCommentsVisible ? 'Hides the comment section' : 'Shows the comment section'}
        >
          <ChatCircle 
            size={24} 
            weight={isCommentsVisible ? 'fill' : 'regular'} 
            color={isDark ? '#a1a1aa' : '#17131B'} 
          />
          <Text className="text-[15px] ml-1.5 font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
            {topic.replyCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center p-2 rounded-lg"
          onPress={handleBookmark}
          accessible
          accessibilityRole="button"
          accessibilityLabel={currentIsBookmarked ? 'Remove bookmark' : 'Bookmark'}
          disabled={actionsLoading}
        >
          <BookmarkSimple 
            size={24} 
            weight={currentIsBookmarked ? 'fill' : 'regular'} 
            color={isDark ? '#a1a1aa' : '#17131B'} 
          />
        </TouchableOpacity>
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
  ]);

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

  // Main render - topic is guaranteed to exist here
  return (
    <SafeAreaView className={`flex-1 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}>
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          ListHeaderComponent={renderHeaderSection}
          data={flatListData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ 
            paddingBottom: 32, 
            backgroundColor: isAmoled ? '#000000' : (isDark ? '#000000' : '#F7F7F8')
          }}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
