import React, { useCallback, useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, Platform, BackHandler, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFooter } from '@gorhom/bottom-sheet';
import { ThemedBottomSheet, BottomSheetModalRef, BottomSheetScrollView } from '@/components/ui/bottom-sheet';
import { CommentSection } from '@/components/feed/CommentSection';
import { NewCommentInput, NewCommentInputRef } from '@/components/feed/NewCommentInput';
import { useTheme } from '@/components/theme';
import type { Comment } from '@/components/feed/CommentItem';

interface CommentsSheetProps {
  byteId: number;
  comments: Comment[];
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onSend?: (text: string, replyToPostNumber?: number) => void;
  replyTo?: {
    postNumber: number;
    username: string;
  } | null;
  isAuthenticated?: boolean; // Pass through for NewCommentInput when used in BottomSheetModal
  inputRef?: React.RefObject<NewCommentInputRef>; // Ref for programmatic focus control
  onRefresh?: () => Promise<void>; // Pull-to-refresh callback
}

export interface CommentsSheetRef {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
}

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
  ({ byteId, comments, onLike, onReply, onSend, replyTo, isAuthenticated, inputRef, onRefresh }, ref) => {
    const sheetRef = useRef<BottomSheetModalRef>(null);
    const currentSnapIndexRef = useRef<number>(-1); // Track current snap index
    const { isDark, isAmoled } = useTheme();
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

    // Handle snap point changes to track current index
    const handleSnapPointChange = useCallback((index: number) => {
      currentSnapIndexRef.current = index;
    }, []);

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

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
      if (!onRefresh) return;
      
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Failed to refresh comments:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, [onRefresh]);

    // Snap points: 60% (medium) and 100% (full screen)
    // Using fixed percentages for now - can be enhanced with dynamic sizing if needed
    const snapPoints = React.useMemo(() => ['60%', '100%'], []);

    // Render footer with input bar using BottomSheetFooter (correct @gorhom/bottom-sheet pattern)
    const renderFooter = useCallback(
      ({ animatedFooterPosition }: any) => (
        <BottomSheetFooter animatedFooterPosition={animatedFooterPosition}>
          <View
            className="border-t border-fomio-border-soft dark:border-fomio-border-soft-dark"
            style={{
              backgroundColor: isAmoled ? '#000000' : (isDark ? '#0A0A0A' : '#FFFFFF'),
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              paddingTop: 8,
              paddingHorizontal: Platform.OS === 'ios' ? 12 : 16,
            }}
          >
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
      [isDark, isAmoled, insets.bottom, inputRef, onSend, replyTo, handleInputFocus, isAuthenticated]
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
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={handleSnapPointChange}
        footerComponent={renderFooter}
        accessibilityLabel="Comments sheet"
        accessibilityHint="Swipe down to close, pull down to refresh comments"
      >
        {/* ✅ BottomSheetScrollView must be direct child - no wrapper View */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: Platform.OS === 'ios' ? 8 : 4,
            paddingBottom: 120, // ✅ Increased to account for footer height (input bar ~60-80px + padding + safe area)
            paddingHorizontal: Platform.OS === 'ios' ? 12 : 16,
            backgroundColor: isAmoled ? '#000000' : (isDark ? '#0A0A0A' : '#FFFFFF'),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={isDark ? '#FFFFFF' : '#000000'}
                colors={isDark ? ['#FFFFFF'] : ['#000000']}
              />
            ) : undefined
          }
        >
          <CommentSection
            comments={comments}
            onLike={onLike}
            onReply={onReply}
            onSend={onSend}
          />
        </BottomSheetScrollView>
      </ThemedBottomSheet>
    );
  }
);

CommentsSheet.displayName = 'CommentsSheet';

