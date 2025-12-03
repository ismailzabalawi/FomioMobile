import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTopic, TopicData } from '../../shared/useTopic';
import { usePostActions } from '../../shared/usePostActions';
import { useScreenBackBehavior } from '@/shared/hooks/useScreenBackBehavior';
import { useByteBlogHeader } from './hooks/useByteBlogHeader';
import { useByteBlogComments } from './hooks/useByteBlogComments';
import { StickyActionBar } from './StickyActionBar';
import { ByteBlogPageHeader } from './ByteBlogPageHeader';
import { ByteBlogPageLoading, ByteBlogPageError, ByteBlogPageNotFound } from './ByteBlogPageStates';
import { useAuth } from '@/shared/auth-context';
import { useBookmarkStore } from '@/shared/useBookmarkSync';
import { CommentsSheet } from '../comments/CommentsSheet';

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
  const { topic, isLoading, hasError, errorMessage, retry, refetch } = useTopic(topicId);
  
  // FlatList ref for scrolling
  const flatListRef = React.useRef<FlatList>(null);
  const scrollOffsetRef = React.useRef<number>(0);
  
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
  
  // Comments handling hook
  const {
    commentList,
    replyTo,
    setReplyTo,
    handleSendComment,
    handleLikeComment,
    handleReplyToComment,
    commentSheetRef,
    commentInputRef,
  } = useByteBlogComments({
    topicId,
    topic,
    refetch,
    user,
    isAuthenticated,
    createComment,
    actionsError,
    scrollOffsetRef,
    flatListRef,
    initialCommentsVisible,
  });
  
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    commentSheetRef.current?.present();
  }, [commentSheetRef]);

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


  // Configure header and get scroll handler for automatic scroll-aware behavior
  const { onScroll: headerAwareScroll } = useByteBlogHeader(topic, isDark, onShare, retry);

  // Track scroll position for comments scroll offset and call header-aware scroll
  const handleScrollWithTracking = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Store scroll position for comment scrolling
      if (event?.nativeEvent) {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      }
      // Call header-aware scroll handler (handles scroll state automatically)
      headerAwareScroll(event);
    },
    [headerAwareScroll]
  );

  useScreenBackBehavior({}, []);


  // FlatList data - no comments in list anymore (they're in the sheet)
  const flatListData = useMemo(() => [], []);

  // Handle empty avatar URLs
  const avatarSource = useMemo(() => {
    if (!topic || !topic.author.avatar || topic.author.avatar.trim() === '') {
      return undefined;
    }
    return { uri: topic.author.avatar };
  }, [topic]);

  // Header section component
  const renderHeaderSection = useMemo(() => {
    if (!topic) return null;
    return (
      <ByteBlogPageHeader
        topic={topic}
        avatarSource={avatarSource}
        isDark={isDark}
        isAmoled={isAmoled}
        formatTimeAgo={formatTimeAgo}
        flatListRef={flatListRef}
      />
    );
  }, [topic, avatarSource, isDark, isAmoled, formatTimeAgo, flatListRef]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: any, index: number) => {
    return item.id || `item-${index}`;
  }, []);

  // Render item for FlatList - empty since comments are in sheet
  const renderItem = useCallback(() => null, []);

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
    return <ByteBlogPageLoading isDark={isDark} />;
  }

  if (hasError) {
    return <ByteBlogPageError errorMessage={errorMessage} retry={retry} isDark={isDark} />;
  }

  if (!topic) {
    return <ByteBlogPageNotFound isDark={isDark} />;
  }

  // Main render - MINIMAL VERSION
  return (
    <>
      {/* Main Screen */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <SafeAreaView 
          className={`flex-1 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}
          edges={['bottom']}
        >
          <FlatList
            ref={flatListRef}
            ListHeaderComponent={renderHeaderSection}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={undefined}
            data={flatListData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onScroll={handleScrollWithTracking}
            scrollEventThrottle={16}
            onScrollToIndexFailed={(info) => {
              // Handle scrollToIndex failures safely
              const offset = info.index * info.averageItemLength;
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({
                  offset: Math.max(0, offset),
                  animated: true,
                });
              }, 100);
            }}
            contentContainerStyle={{ 
              paddingBottom: 12,
              backgroundColor: isAmoled ? '#000000' : (isDark ? '#000000' : '#F7F7F8')
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Comments Bottom Sheet - OUTSIDE main layout to appear above everything */}
      <CommentsSheet
        ref={commentSheetRef}
        byteId={topicId}
        comments={commentList}
        onLike={handleLikeComment}
        onReply={handleReplyToComment}
        onSend={handleSendComment}
        replyTo={replyTo}
        isAuthenticated={isAuthenticated}
        inputRef={commentInputRef}
      />
    </>
  );
}
