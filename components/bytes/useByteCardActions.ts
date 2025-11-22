import { useState, useCallback, useEffect, useRef } from 'react';
import { Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { discourseApi } from '@/shared/discourseApi';
import { useAuth } from '@/shared/useAuth';
import { useBookmarkStore } from '@/shared/useBookmarkSync';
import { useToast } from '@/shared/form-validation';
import { logger } from '@/shared/logger';
import type { Byte } from '@/types/byte';

export interface UseByteCardActionsReturn {
  // State
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  replyCount: number;
  loadingLike: boolean;
  loadingBookmark: boolean;
  
  // Actions
  toggleLike: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
  onCommentPress: () => void;
  onCardPress: () => void;
  onSharePress: () => Promise<void>;
}

/**
 * useByteCardActions - Encapsulates all user-action logic for ByteCard
 * 
 * Handles:
 * - Like/unlike with optimistic updates (uses post-level API)
 * - Bookmark/unbookmark with store sync (uses topic-level API)
 * - Share via React Native Share API
 * - Comment navigation
 * - Auth gating
 * - Error handling with toast notifications
 * - Initial state loading
 * 
 * ByteCard stays pure UI - all side effects live here.
 */
export function useByteCardActions(byte: Byte): UseByteCardActionsReturn {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showError } = useToast();
  
  // Extract bookmark functions using selectors (avoids dependency issues)
  const toggleBookmarkInStore = useBookmarkStore(state => state.toggleBookmark);
  const isBookmarked = useBookmarkStore(state => state.isBookmarked(Number(byte.id)));
  
  // Local state for optimistic UI
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(byte.stats.likes);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  
  // Track if we've loaded initial states to avoid unnecessary API calls
  const hasLoadedInitialState = useRef(false);
  // Store first post ID for like/unlike actions (post-level API)
  const firstPostIdRef = useRef<number | null>(null);
  
  /**
   * Lazy load initial like/bookmark states from Discourse
   * Only loads when user first interacts (like/bookmark) or when explicitly needed
   * This prevents rate limiting from loading states for all cards on mount
   */
  const loadInitialStates = useCallback(async (): Promise<void> => {
    if (hasLoadedInitialState.current || !isAuthenticated) return;
    
    try {
      const topicResponse = await discourseApi.getTopic(Number(byte.id), {
        includePostActions: true,
      });
      
      if (topicResponse.success && topicResponse.data) {
        const topic = topicResponse.data;
        
        // Extract first post ID for like/unlike actions (post-level API)
        if (topic.post_stream?.posts?.[0]?.id) {
          firstPostIdRef.current = topic.post_stream.posts[0].id;
        }
        
        // Check like status from first post's actions_summary
        // When includePostActions=true, Discourse returns actions_summary array
        if (topic.post_stream?.posts?.[0]?.actions_summary) {
          const likeAction = topic.post_stream.posts[0].actions_summary.find(
            (a: any) => a.id === 2 // Like action type ID (from Discourse API)
          );
          if (likeAction?.acted) {
            setIsLiked(true);
          }
        }
        
        // Sync bookmark state to store
        if (topic.details?.bookmarked) {
          toggleBookmarkInStore(Number(byte.id), true);
        }
      }
      
      hasLoadedInitialState.current = true;
    } catch (error) {
      logger.warn('Failed to load initial action states for byte', { byteId: byte.id, error });
      // Don't block UI - continue with defaults
      hasLoadedInitialState.current = true;
    }
  }, [byte.id, isAuthenticated, toggleBookmarkInStore]);
  
  /**
   * Auth guard - shows alert if not authenticated
   */
  const requireAuth = useCallback((): boolean => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'Please sign in to perform this action.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign in', 
            onPress: () => router.push('/(auth)/signin' as any)
          }
        ]
      );
      return false;
    }
    return true;
  }, [isAuthenticated, router]);
  
  /**
   * Get first post ID (for like/unlike actions)
   * Falls back to fetching topic if not cached
   */
  const getFirstPostId = useCallback(async (): Promise<number | null> => {
    // Use cached post ID if available
    if (firstPostIdRef.current) {
      return firstPostIdRef.current;
    }
    
    // Fallback: fetch topic to get first post ID
    try {
      const topicResponse = await discourseApi.getTopic(Number(byte.id));
      if (topicResponse.success && topicResponse.data?.post_stream?.posts?.[0]?.id) {
        const postId = topicResponse.data.post_stream.posts[0].id;
        firstPostIdRef.current = postId; // Cache it
        return postId;
      }
    } catch (error) {
      logger.error('Failed to get first post ID', error);
    }
    
    return null;
  }, [byte.id]);
  
  /**
   * Toggle like with optimistic updates
   * Uses post-level API: likePost(postId) / unlikePost(postId)
   * Lazy loads initial state on first interaction
   */
  const toggleLike = useCallback(async () => {
    if (!requireAuth()) return;
    if (loadingLike) return;
    
    // Lazy load initial states on first interaction (prevents rate limiting on mount)
    if (!hasLoadedInitialState.current) {
      await loadInitialStates();
    }
    
    setLoadingLike(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      // Get first post ID (cached or fetched)
      const postId = await getFirstPostId();
      
      if (!postId) {
        // Rollback optimistic update
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
        throw new Error('Failed to find post');
      }
      
      // Use post-level API: likePost or unlikePost
      // Discourse API: POST /post_actions.json (like) or DELETE /post_actions/{postId} (unlike)
      const response = previousLiked
        ? await discourseApi.unlikePost(postId)
        : await discourseApi.likePost(postId);
      
      if (!response.success) {
        // Rollback optimistic update
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
        
        throw new Error(response.error || 'Failed to update like status');
      }
      
      // Success - state already updated optimistically
      logger.info(
        `Byte ${byte.id} ${previousLiked ? 'unliked' : 'liked'} successfully`
      );
    } catch (error) {
      // Rollback optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      
      logger.error('Failed to toggle like', error);
      showError(
        'Failed to update like',
        'Please try again later.'
      );
    } finally {
      setLoadingLike(false);
    }
  }, [byte.id, isLiked, likeCount, loadingLike, requireAuth, getFirstPostId, showError, loadInitialStates]);
  
  /**
   * Toggle bookmark with store sync
   * Uses topic-level API: toggleTopicBookmark(topicId)
   * Lazy loads initial state on first interaction
   */
  const toggleBookmark = useCallback(async () => {
    if (!requireAuth()) return;
    if (loadingBookmark) return;
    
    // Lazy load initial states on first interaction (prevents rate limiting on mount)
    if (!hasLoadedInitialState.current) {
      await loadInitialStates();
    }
    
    setLoadingBookmark(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    // Optimistic update
    const previousBookmarked = isBookmarked;
    toggleBookmarkInStore(Number(byte.id), !isBookmarked);
    
    try {
      // Use topic-level API: toggleTopicBookmark handles both bookmark/unbookmark
      // Discourse API: PUT /t/{topicId}/bookmark.json (bookmark) or DELETE (unbookmark)
      const response = await discourseApi.toggleTopicBookmark(Number(byte.id));
      
      if (!response.success) {
        // Rollback optimistic update
        toggleBookmarkInStore(Number(byte.id), previousBookmarked);
        
        throw new Error(response.error || 'Failed to update bookmark status');
      }
      
      // Success - state already updated optimistically
      logger.info(
        `Byte ${byte.id} ${previousBookmarked ? 'unbookmarked' : 'bookmarked'} successfully`
      );
    } catch (error) {
      // Rollback optimistic update
      toggleBookmarkInStore(Number(byte.id), previousBookmarked);
      
      logger.error('Failed to toggle bookmark', error);
      showError(
        'Failed to update bookmark',
        'Please try again later.'
      );
    } finally {
      setLoadingBookmark(false);
    }
  }, [byte.id, isBookmarked, loadingBookmark, requireAuth, toggleBookmarkInStore, showError, loadInitialStates]);
  
  /**
   * Navigate to comment view
   */
  const onCommentPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/feed/${byte.id}?showComments=true` as any);
  }, [byte.id, router]);
  
  /**
   * Navigate to byte detail
   */
  const onCardPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/feed/${byte.id}`);
  }, [byte.id, router]);
  
  /**
   * Share byte via React Native Share API
   */
  const onSharePress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    try {
      // Build share URL - future-proof with byte.url if available
      const baseUrl = discourseApi.getBaseUrl();
      const shareUrl = (byte as any).url ?? byte.linkPreview?.url ?? `${baseUrl}/t/${byte.id}`;
      const shareMessage = `Check out this post on Fomio: ${shareUrl}`;
      
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl, // iOS will prefer URL if provided
      });
      
      if (result.action === Share.sharedAction) {
        logger.info('Byte shared successfully', byte.id);
      }
    } catch (error) {
      // User cancelled share - don't show error
      if ((error as any)?.message === 'User did not share') {
        return;
      }
      
      logger.error('Failed to share byte', error);
      showError(
        'Failed to share',
        'Please try again later.'
      );
    }
  }, [byte.id, byte.linkPreview?.url, showError]);
  
  return {
    // State
    isLiked,
    isBookmarked,
    likeCount,
    replyCount: byte.stats.replies,
    loadingLike,
    loadingBookmark,
    
    // Actions
    toggleLike,
    toggleBookmark,
    onCommentPress,
    onCardPress,
    onSharePress,
  };
}

