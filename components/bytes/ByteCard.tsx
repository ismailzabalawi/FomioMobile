import React, { useRef, useCallback, memo, useState } from 'react';
import { Pressable, View, Text, Animated, PanResponder, Easing } from 'react-native';
import type { Byte } from '@/types/byte';
import { ByteCardHeader } from './ByteCardHeader';
import { ByteCardContent } from './ByteCardContent';
import { ByteCardMedia } from './ByteCardMedia';
import { useByteCardActions } from './useByteCardActions';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { Heart, ChatCircle, BookmarkSimple, CaretDown } from 'phosphor-react-native';

export interface ByteCardProps {
  byte: Byte;
  showSeparator?: boolean;
  onPress?: () => void;
}

/**
 * ByteCard - Content-first feed card (Twitter + Reddit + Threads hybrid)
 * 
 * UI Spec:
 * - Zero-layer navigation: entire card is tappable
 * - Content-first: cooked HTML rendered as markdown
 * - Media-aware: images, link previews, future video support
 * - Teret badge: colored pill for category context
 * - Footer actions: like, comment, bookmark, share
 * - Separator: subtle divider between cards
 * - Themed: uses Fomio semantic tokens (Light + AMOLED Dark)
 * - Renders byte as-is (summary or full content)
 */
function ByteCardComponent({ 
  byte, 
  showSeparator = true,
  onPress,
}: ByteCardProps) {
  const { themeMode, isAmoled } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  // Guard against invalid bytes
  if (!byte || !byte.id || !byte.title) {
    if (__DEV__) {
      console.warn('⚠️ [ByteCard] Invalid byte prop:', { 
        hasByte: !!byte, 
        hasId: !!byte?.id, 
        hasTitle: !!byte?.title 
      });
    }
    return null;
  }

  const { onCardPress } = useByteCardActions(byte);
  const actions = useByteCardActions(byte);

  const translateX = useRef(new Animated.Value(0)).current;
  const likeThreshold = 28;
  const trayThreshold = -28;
  const maxDrag = 96;
  const panActiveRef = useRef(false);
  const actionPadding = useRef(new Animated.Value(4)).current;
  const arrowRotation = useRef(new Animated.Value(0)).current;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 150,
      friction: 18,
    }).start();
  }, [translateX]);

  // Track if header area was pressed to prevent parent Pressable from handling
  const headerPressedRef = useRef(false);

  const handlePress = () => {
    if (panActiveRef.current) {
      return;
    }
    // If header was pressed, skip card navigation
    if (headerPressedRef.current) {
      headerPressedRef.current = false;
      return;
    }
    
    if (onPress) {
      onPress();
    } else {
      onCardPress();
    }
  };

  const handlePressIn = () => {
    // Reset flag on press start to allow new presses
    headerPressedRef.current = false;
  };

  const handleHeaderPress = useCallback(() => {
    headerPressedRef.current = true;
    // Reset after navigation completes
    setTimeout(() => {
      headerPressedRef.current = false;
    }, 200);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onMoveShouldSetPanResponder: (_, gesture) => {
        const { dx, dy } = gesture;
        return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: (_, gesture) => {
        panActiveRef.current = true;
        if (actions.loadingLike || actions.loadingBookmark) return;
        const clamped = Math.max(-maxDrag, Math.min(maxDrag, gesture.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        const performReset = () => {
          panActiveRef.current = false;
          resetPosition();
        };

        if (actions.loadingLike || actions.loadingBookmark) {
          performReset();
          return;
        }

        if (gesture.dx > likeThreshold) {
          actions.toggleLike();
          setIsTrayOpen(false);
          performReset();
          return;
        }

        if (gesture.dx < trayThreshold) {
          setIsTrayOpen(true);
          performReset();
          return;
        }

        setIsTrayOpen(false);
        performReset();
      },
      onPanResponderTerminate: () => {
        panActiveRef.current = false;
        resetPosition();
      },
    })
  ).current;

  const handleToggleTray = () => {
    setIsTrayOpen(prev => !prev);
    resetPosition();
  };

  // Animate padding around the action row and arrow rotation when tray toggles
  React.useEffect(() => {
    Animated.timing(actionPadding, {
      toValue: isTrayOpen ? 12 : 4,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    Animated.timing(arrowRotation, {
      toValue: isTrayOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [actionPadding, arrowRotation, isTrayOpen]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      className="px-4 pt-4 active:opacity-90"
      android_ripple={{ color: 'rgba(0,0,0,0.06)', foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Byte by ${byte.author.name}`}
      style={{ width: '100%' }}
    >
      <Animated.View
        style={{
          width: '100%',
          minWidth: 0,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          transform: [{ translateX }],
        }}
        {...panResponder.panHandlers}
      >
        {/* Remove flex-1 - FlatList items should use natural height */}
        {/* Title first */}
        {byte.title && (
          <Text className="text-title font-bold text-fomio-foreground dark:text-fomio-foreground-dark mb-2">
            {byte.title}
          </Text>
        )}

        {/* Author row: avatar | name | username */}
        <ByteCardHeader byte={byte} onHeaderPress={handleHeaderPress} />
        
        {/* Content, media */}
        <View>
          <ByteCardContent byte={byte} />
          <ByteCardMedia byte={byte} />

          {/* Inline metrics + tray toggle (arrow inline with icons) */}
          <Animated.View className="flex-row items-center gap-4 mt-3" style={{ paddingVertical: actionPadding }}>
            <View className="flex-row items-center gap-1">
              <Heart
                size={22}
                weight={actions.isLiked ? 'fill' : 'regular'}
                color={actions.isLiked ? colors.like : colors.comment}
              />
              <Text className="text-base font-semibold text-fomio-muted dark:text-fomio-muted-dark">
                {actions.likeCount}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <ChatCircle size={22} weight="bold" color={colors.comment} />
              <Text className="text-base font-semibold text-fomio-muted dark:text-fomio-muted-dark">
                {byte.stats.replies}
              </Text>
            </View>
            <Pressable
              onPress={handleToggleTray}
              hitSlop={10}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Show actions"
              accessibilityState={{ expanded: isTrayOpen }}
              className="rounded-full"
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: arrowRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                }}
              >
                <CaretDown
                  size={22}
                  weight="bold"
                  color={isTrayOpen ? colors.accent : colors.comment}
                />
              </Animated.View>
            </Pressable>
          </Animated.View>

          {isTrayOpen && (
            <View
              className="flex-row items-center justify-between mt-3"
              style={{
                backgroundColor: `${colors.muted}33`,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Pressable
                onPress={actions.toggleLike}
                disabled={actions.loadingLike}
                className="flex-row items-center gap-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Like"
                accessibilityState={{ disabled: actions.loadingLike, selected: actions.isLiked }}
              >
                <Heart
                  size={20}
                  weight={actions.isLiked ? 'fill' : 'regular'}
                  color={actions.isLiked ? colors.like : colors.comment}
                />
                <Text className="text-sm font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                  {actions.isLiked ? 'Liked' : 'Like'}
                </Text>
              </Pressable>

              <Pressable
                onPress={actions.onCommentPress}
                className="flex-row items-center gap-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Reply"
              >
                <ChatCircle size={20} weight="regular" color={colors.comment} />
                <Text className="text-sm font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                  Reply
                </Text>
              </Pressable>

              <Pressable
                onPress={actions.toggleBookmark}
                disabled={actions.loadingBookmark}
                className="flex-row items-center gap-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Bookmark"
                accessibilityState={{ disabled: actions.loadingBookmark, selected: actions.isBookmarked }}
              >
                <BookmarkSimple
                  size={20}
                  weight={actions.isBookmarked ? 'fill' : 'regular'}
                  color={actions.isBookmarked ? colors.bookmark : colors.comment}
                />
                <Text className="text-sm font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                  {actions.isBookmarked ? 'Saved' : 'Save'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        
        {showSeparator && (
          <View className="h-[1px] bg-fomio-border-soft dark:bg-fomio-border-soft-dark opacity-20 mt-3 mb-1" />
        )}
      </Animated.View>
    </Pressable>
  );
}

const arePropsEqual = (prev: ByteCardProps, next: ByteCardProps) => {
  return (
    prev.byte.id === next.byte.id &&
    prev.showSeparator === next.showSeparator &&
    prev.onPress === next.onPress
  );
};

export const ByteCard = memo(ByteCardComponent, arePropsEqual);
ByteCard.displayName = 'ByteCard';
