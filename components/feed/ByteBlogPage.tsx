import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, NativeSyntheticEvent, NativeScrollEvent, RefreshControl, Share } from 'react-native';
// SafeAreaView removed - parent screen handles safe areas, StickyActionBar handles bottom insets
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
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
import { ReadingProgressBar } from './ReadingProgressBar';
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
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const insets = useSafeAreaInsets();
  
  // Calculate header height for content inset (to prevent header overlap during pull-to-refresh)
  const COMPACT_HEADER_HEIGHT = Platform.OS === 'ios' ? 32 : 36;
  const headerHeight = insets.top + COMPACT_HEADER_HEIGHT;
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ScrollView ref for scrolling
  const scrollViewRef = React.useRef<ScrollView>(null);
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
    scrollViewRef,
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

  // Default share handler
  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare();
      return;
    }
    
    // Default share implementation
    if (!topic) return;
    
    try {
      const shareUrl = `https://fomio.app/byte/${topicId}`;
      const shareMessage = `Check out "${topic.title}" on Fomio\n\n${shareUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: topic.title,
        url: shareUrl, // iOS only
      });
    } catch (error) {
      // User cancelled or share failed - silently handle
      console.log('Share cancelled or failed:', error);
    }
  }, [topic, topicId, onShare]);

  // Configure header and get scroll handler for automatic scroll-aware behavior
  const { onScroll: headerAwareScroll } = useByteBlogHeader(topic, isDark, handleShare, retry);

  // Reading progress state (0 to 1)
  const [readingProgress, setReadingProgress] = useState(0);
  
  // Scroll Y for parallax effect
  const scrollY = useSharedValue(0);
  
  // Fade-in animation
  const fadeOpacity = useSharedValue(0);
  
  // Trigger fade-in when topic loads
  useEffect(() => {
    if (topic) {
      fadeOpacity.value = withTiming(1, { duration: 300 });
    } else {
      fadeOpacity.value = 0;
    }
  }, [topic, fadeOpacity]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity.value,
    };
  });
  
  // Track scroll position for comments scroll offset and call header-aware scroll
  const handleScrollWithTracking = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Store scroll position for comment scrolling
      if (event?.nativeEvent) {
        let offsetY = event.nativeEvent.contentOffset.y;
        
        // On Android, contentContainerStyle has paddingTop, so offsetY already accounts for header
        // We need to adjust for parallax calculation
        scrollOffsetRef.current = offsetY;
        
        // Update scrollY for parallax effect
        // On Android, offsetY includes the paddingTop, so we use it directly
        // On iOS, offsetY is negative initially due to contentOffset, so we use Math.max(0, offsetY)
        const parallaxOffset = Platform.OS === 'android' 
          ? Math.max(0, offsetY) 
          : Math.max(0, offsetY);
        scrollY.value = parallaxOffset;
        
        // Calculate reading progress
        const contentHeight = event.nativeEvent.contentSize.height;
        const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
        const maxScroll = Math.max(0, contentHeight - scrollViewHeight);
        const progress = maxScroll > 0 ? Math.min(1, Math.max(0, offsetY / maxScroll)) : 0;
        setReadingProgress(progress);
      }
      // Call header-aware scroll handler (handles scroll state automatically)
      headerAwareScroll(event);
    },
    [headerAwareScroll, scrollY]
  );

  useScreenBackBehavior({}, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

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
        scrollY={scrollY}
      />
    );
  }, [topic, avatarSource, isDark, isAmoled, formatTimeAgo, scrollY]);

  // Simplified footer - just the action bar
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
        onShare={handleShare}
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
  // Note: No SafeAreaView needed here - parent handles top safe area,
  // StickyActionBar handles bottom safe area internally
  return (
    <>
      {/* Main Screen */}
      <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
        {/* Reading Progress Bar */}
        {topic && <ReadingProgressBar scrollProgress={readingProgress} />}
        
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            onScroll={handleScrollWithTracking}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ 
              backgroundColor: tokens.colors.background,
              // On Android, add padding to prevent content from scrolling under header during pull-to-refresh
              paddingTop: Platform.OS === 'android' ? headerHeight : 0,
            }}
            {...(Platform.OS === 'ios' && {
              contentInset: { top: headerHeight },
              contentOffset: { x: 0, y: -headerHeight },
              contentInsetAdjustmentBehavior: 'never' as const,
            })}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={tokens.colors.text}
                colors={[tokens.colors.accent]}
                progressViewOffset={headerHeight}
              />
            }
          >
              {renderHeaderSection}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
        {/* Sticky Action Bar - Now truly sticky at bottom */}
        {renderFooter}
      </View>

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
