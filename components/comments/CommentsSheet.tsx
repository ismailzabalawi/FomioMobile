import React, { useCallback, useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, Platform, BackHandler, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFooter } from '@gorhom/bottom-sheet';
import { ThemedBottomSheet, BottomSheetModalRef, BottomSheetFlatList } from '@/components/ui/bottom-sheet';
import { CommentItem } from '@/components/feed/CommentItem';
import { NewCommentInput, NewCommentInputRef } from '@/components/feed/NewCommentInput';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { Comment } from '@/components/feed/CommentItem';

interface CommentsSheetProps {
  byteId: number; // Byte/topic ID (for potential future use: analytics, context, etc.)
  comments: Comment[];
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onSend?: (text: string, replyToPostNumber?: number) => void;
  replyTo?: {
    postNumber: number;
    username: string;
  } | null;
  isAuthenticated?: boolean; // Pass through for NewCommentInput when used in BottomSheetModal
  inputRef?: React.RefObject<NewCommentInputRef | null>; // Ref for programmatic focus control
  onRefresh?: () => Promise<void>; // Pull-to-refresh callback
  onClose?: () => void; // Callback when sheet is dismissed/closed
}

export interface CommentsSheetRef {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
}

// Constants for spacing and layout
const FOOTER_PADDING_BOTTOM_DEFAULT = 12; // Default padding when no safe area inset
const FOOTER_PADDING_TOP = 8;
const CONTENT_PADDING_BOTTOM = 120; // Account for footer height (input bar ~60-80px + padding + safe area)
const HORIZONTAL_PADDING_IOS = 12;
const HORIZONTAL_PADDING_ANDROID = 16;
const CONTENT_PADDING_TOP_IOS = 8;
const CONTENT_PADDING_TOP_ANDROID = 4;

/**
 * CommentsSheet - Premium bottom sheet for viewing and writing comments
 * 
 * UI Spec: CommentsSheet
 * - Opens at 60% height (medium) for viewing comments
 * - Expands to 100% (full screen) when input is focused for writing
 * - Handles Android back button: full → medium → closed
 * - Uses BottomSheetScrollView for smooth scrolling
 * - Integrates NewCommentInput with focus handler to expand sheet
 * - Respects Light + AMOLED Dark themes
 * - Features: detached mode, pull-to-refresh, enhanced gestures, dynamic sizing
 */
export const CommentsSheet = forwardRef<CommentsSheetRef, CommentsSheetProps>(
  ({ byteId, comments, onLike, onReply, onSend, replyTo, isAuthenticated, inputRef, onRefresh, onClose }, ref) => {
    const sheetRef = useRef<BottomSheetModalRef>(null);
    const currentSnapIndexRef = useRef<number>(-1); // Track current snap index
    const { isDark, isAmoled } = useTheme();
    const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
    const tokens = React.useMemo(() => getTokens(mode), [mode]);
    const insets = useSafeAreaInsets();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present();
        // Start at medium snap point (index 0)
        currentSnapIndexRef.current = 0;
        sheetRef.current?.snapToIndex(0);
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
        currentSnapIndexRef.current = -1;
      },
      snapToIndex: (index: number) => {
        currentSnapIndexRef.current = index;
        sheetRef.current?.snapToIndex(index);
      },
    }));

    // Handle snap point changes to track current index and notify on close
    const handleSnapPointChange = useCallback((index: number) => {
      currentSnapIndexRef.current = index;
      // Notify parent when sheet closes
      if (index === -1) {
        onClose?.();
      }
    }, [onClose]);

    // Handle input focus - expand to full screen
    // This ensures the sheet expands when user taps input to add a new comment
    const handleInputFocus = useCallback(() => {
      // Always expand to full screen when input is focused
      if (currentSnapIndexRef.current !== 1) {
        currentSnapIndexRef.current = 1;
        sheetRef.current?.snapToIndex(1); // Full screen (index 1)
      }
    }, []);

    // Handle back button on Android
    useEffect(() => {
      if (Platform.OS !== 'android') return;

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        const currentIndex = currentSnapIndexRef.current;
        
        if (currentIndex === -1) {
          return false; // Sheet is closed, allow default back behavior
        }
        
        if (currentIndex === 1) {
          // If full screen, collapse to medium
          currentSnapIndexRef.current = 0;
          sheetRef.current?.snapToIndex(0);
          return true; // Prevent default back behavior
        }
        
        if (currentIndex === 0) {
          // If medium, close sheet
          currentSnapIndexRef.current = -1;
          sheetRef.current?.dismiss();
          return true; // Prevent default back behavior
        }
        
        return false; // Allow default back behavior
      });

      return () => backHandler.remove();
    }, []);

    // Handle pull-to-refresh with error handling
    const handleRefresh = useCallback(async () => {
      if (!onRefresh) return;
      
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        // Error is logged for debugging, user can retry by pulling again
        console.error('Failed to refresh comments:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, [onRefresh]);

    // Snap points: 60% (medium) and 100% (full screen)
    // Using fixed percentages for now - can be enhanced with dynamic sizing if needed
    const snapPoints = React.useMemo(() => ['60%', '100%'], []);

    // Footer style memoized for performance
    // Use background (solid) instead of surfaceFrost (semi-transparent) for proper dark mode support
    const footerStyle = React.useMemo(
      () => ({
        backgroundColor: tokens.colors.background,
        borderColor: tokens.colors.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom : FOOTER_PADDING_BOTTOM_DEFAULT,
        paddingTop: FOOTER_PADDING_TOP,
        paddingHorizontal: Platform.OS === 'ios' ? HORIZONTAL_PADDING_IOS : HORIZONTAL_PADDING_ANDROID,
      }),
      [tokens.colors.background, tokens.colors.border, insets.bottom]
    );

    const renderCommentItem = useCallback(
      ({ item }: { item: Comment }) => (
        <CommentItem
          comment={item}
          isReply={item.isReply}
          shouldAnimate={item.isNew}
          onLike={onLike}
          onReply={onReply}
          isDark={isDark}
          mode={mode}
        />
      ),
      [onLike, onReply, isDark, mode]
    );

    const renderEmptyState = useCallback(
      () => (
        <View className="py-12 px-5 items-center">
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: tokens.colors.text }}>
            Be the first to reply
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: tokens.colors.muted }}>
            Start the conversation by adding a comment below.
          </Text>
        </View>
      ),
      [tokens.colors.muted, tokens.colors.text]
    );

    // Render footer with input bar using BottomSheetFooter (correct @gorhom/bottom-sheet pattern)
    const renderFooter = useCallback(
      ({ animatedFooterPosition }: { animatedFooterPosition: any }) => (
        <BottomSheetFooter animatedFooterPosition={animatedFooterPosition}>
          <View className="border-t" style={footerStyle}>
            <NewCommentInput
              ref={inputRef}
              onSend={onSend}
              replyTo={replyTo || undefined}
              onFocus={handleInputFocus}
              isAuthenticated={isAuthenticated}
            />
          </View>
        </BottomSheetFooter>
      ),
      [footerStyle, inputRef, onSend, replyTo, handleInputFocus, isAuthenticated]
    );

    return (
      <ThemedBottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={-1} // Hidden by default until .present() is called
        enablePanDownToClose
        enableDismissOnClose
        enableContentPanningGesture={true} // ✅ CRITICAL: Allows scroll view to scroll properly
        enableHandlePanningGesture={true}
        enableOverDrag={false}
        activeOffsetY={[10, -10]}
        failOffsetX={[-5, 5]}
        overDragResistanceFactor={2}
        detached={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={handleSnapPointChange}
        footerComponent={renderFooter}
        accessibilityLabel="Comments sheet"
      >
        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item: Comment) => item.id}
          renderItem={renderCommentItem}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Platform.OS === 'ios' ? CONTENT_PADDING_TOP_IOS : CONTENT_PADDING_TOP_ANDROID,
            paddingBottom: CONTENT_PADDING_BOTTOM,
            paddingHorizontal: Platform.OS === 'ios' ? HORIZONTAL_PADDING_IOS : HORIZONTAL_PADDING_ANDROID,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={tokens.colors.text}
                colors={[tokens.colors.accent]}
              />
            ) : undefined
          }
          ListEmptyComponent={renderEmptyState}
        />
      </ThemedBottomSheet>
    );
  }
);

CommentsSheet.displayName = 'CommentsSheet';
