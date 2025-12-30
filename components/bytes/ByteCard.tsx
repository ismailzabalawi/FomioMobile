import React, { useRef, useCallback, memo, useState, useMemo } from 'react';
import { Pressable, View, Text, Animated, PanResponder, ActivityIndicator } from 'react-native';
import type { Byte } from '@/types/byte';
import { ByteCardHeader } from './ByteCardHeader';
import { ByteCardContent } from './ByteCardContent';
import { ByteCardMedia } from './ByteCardMedia';
import { ByteCardActionTray } from './ByteCardActionTray';
import { useByteCardActions } from './useByteCardActions';
import { useByteCardTokens } from './useByteCardTokens';
import { createTextStyle } from '@/shared/design-system';
import { Heart, ChatCircle, CaretDown } from 'phosphor-react-native';
import { logger } from '@/shared/logger';

export interface ByteCardProps {
  byte: Byte;
  showSeparator?: boolean;
  onPress?: () => void;
  onPressByteId?: (byteId: number | string) => void;
  hideHeader?: boolean; // Hide author header (useful in profile context)
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
  onPressByteId,
  hideHeader = false,
}: ByteCardProps) {
  const { tokens, colors, spacing, borderRadius, shadows } = useByteCardTokens();
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  // Always call hooks unconditionally (Rules of Hooks)
  // Use a safe fallback byte for hooks when byte is invalid
  const isValidByte = !!(byte && byte.id && byte.title);
  const safeByte = isValidByte ? byte : { id: 0, title: '', author: { id: 0, name: '', username: '', avatar: '' }, raw: '', cooked: '', createdAt: '', stats: { likes: 0, replies: 0 } } as Byte;
  
  const actions = useByteCardActions(safeByte);
  const { onCardPress } = actions;

  // All hooks must be called unconditionally (Rules of Hooks)
  const translateX = useRef(new Animated.Value(0)).current;
  const LIKE_THRESHOLD = 28;
  const TRAY_THRESHOLD = -28;
  const MAX_DRAG = 96;
  const panActiveRef = useRef(false);
  const actionPadding = useRef(new Animated.Value(4)).current; // spacing.xs = 4
  const arrowRotation = useRef(new Animated.Value(0)).current;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      ...tokens.motion.liquidSpring,
    }).start();
  }, [translateX, tokens.motion.liquidSpring]);

  // Track if header area was pressed to prevent parent Pressable from handling
  const headerPressedRef = useRef(false);

  const handleHeaderPress = useCallback(() => {
    headerPressedRef.current = true;
    // Reset after navigation completes
    setTimeout(() => {
      headerPressedRef.current = false;
    }, 200);
  }, []);

  const panResponder = useMemo(
    () => PanResponder.create({
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
        const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, gesture.dx));
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

        if (gesture.dx > LIKE_THRESHOLD) {
          actions.toggleLike();
          setIsTrayOpen(false);
          performReset();
          return;
        }

        if (gesture.dx < TRAY_THRESHOLD) {
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
    }),
    [actions.loadingLike, actions.loadingBookmark, actions.toggleLike, resetPosition, MAX_DRAG, LIKE_THRESHOLD, TRAY_THRESHOLD, translateX]
  );

  // Animate padding around the action row and arrow rotation when tray toggles
  React.useEffect(() => {
    Animated.spring(actionPadding, {
      toValue: isTrayOpen ? spacing.sm : spacing.xs,
      useNativeDriver: false,
      damping: tokens.motion.liquidSpring.damping,
      stiffness: tokens.motion.liquidSpring.stiffness,
    }).start();

    Animated.spring(arrowRotation, {
      toValue: isTrayOpen ? 1 : 0,
      useNativeDriver: true,
      damping: tokens.motion.snapSpring.damping,
      stiffness: tokens.motion.snapSpring.stiffness,
    }).start();
  }, [actionPadding, arrowRotation, isTrayOpen, spacing, tokens.motion]);

  // Guard against invalid bytes - AFTER all hooks
  if (!isValidByte) {
    if (__DEV__) {
      logger.warn('⚠️ [ByteCard] Invalid byte prop:', { 
        hasByte: !!byte, 
        hasId: !!byte?.id, 
        hasTitle: !!byte?.title 
      });
    }
    return null;
  }

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
    } else if (onPressByteId) {
      onPressByteId(byte.id);
    } else {
      onCardPress();
    }
  };

  const handlePressIn = () => {
    // Reset flag on press start to allow new presses
    headerPressedRef.current = false;
  };

  const handleToggleTray = () => {
    setIsTrayOpen(prev => !prev);
    resetPosition();
  };

  const actionRowStyle = useMemo(() => ({ 
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: actionPadding,
  }), [spacing.md, spacing.sm, actionPadding]);

  const cardStyle = useMemo(() => ({
    width: '100%' as const,
    minWidth: 0,
    backgroundColor: tokens.colors.surfaceFrost,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    borderRadius: tokens.radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...tokens.shadows.soft,
    transform: [{ translateX }],
  }), [tokens, spacing, translateX]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={{ 
        width: '100%',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
      }}
      android_ripple={{ color: tokens.colors.shadow + '20', foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Byte by ${byte.author.name}`}
    >
      <Animated.View
        style={cardStyle}
        {...panResponder.panHandlers}
      >
        {/* Title first */}
        {byte.title && (
          <Text style={[createTextStyle('title', colors.foreground), { marginBottom: spacing.sm }]}>
            {byte.title}
          </Text>
        )}

        {/* Author row: avatar | name | username */}
        {!hideHeader && <ByteCardHeader byte={byte} onHeaderPress={handleHeaderPress} />}
        
        {/* Content, media */}
        <View>
          <ByteCardContent byte={byte} />
          <ByteCardMedia byte={byte} />

          {/* Inline metrics + tray toggle (arrow inline with icons) */}
          <Animated.View 
            style={actionRowStyle}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {actions.loadingLike ? (
                <ActivityIndicator size="small" color={colors.like} />
              ) : (
                <Heart
                  size={22}
                  weight={actions.isLiked ? 'fill' : 'regular'}
                  color={actions.isLiked ? colors.like : colors.comment}
                />
              )}
              <Text style={[createTextStyle('body', colors.mutedForeground), { fontWeight: '600' }]}>
                {actions.likeCount}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <ChatCircle size={22} weight="bold" color={colors.comment} />
              <Text style={[createTextStyle('body', colors.mutedForeground), { fontWeight: '600' }]}>
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
              style={{ borderRadius: borderRadius.full }}
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

          <ByteCardActionTray isOpen={isTrayOpen} actions={actions} />
        </View>
        
        {showSeparator && (
          <View 
            style={{ 
              height: 1,
              backgroundColor: tokens.colors.border,
              opacity: 0.2,
              marginTop: spacing.sm,
              marginBottom: spacing.xs,
            }} 
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const arePropsEqual = (prev: ByteCardProps, next: ByteCardProps) => {
  // Compare by ID first (most stable identifier)
  if (prev.byte.id !== next.byte.id) return false;
  
  // Compare critical fields that affect rendering
  if (prev.byte.title !== next.byte.title) return false;
  if (prev.byte.author?.username !== next.byte.author?.username) return false;
  if (prev.byte.stats?.likes !== next.byte.stats?.likes) return false;
  if (prev.byte.stats?.replies !== next.byte.stats?.replies) return false;
  if (prev.byte.isLiked !== next.byte.isLiked) return false;
  if (prev.byte.isBookmarked !== next.byte.isBookmarked) return false;
  if (prev.byte.cooked !== next.byte.cooked) return false;
  if (prev.byte.excerpt !== next.byte.excerpt) return false;
  
  // Compare teret/hub (category badges)
  if (prev.byte.teret?.id !== next.byte.teret?.id) return false;
  if (prev.byte.hub?.id !== next.byte.hub?.id) return false;
  
  // Compare callbacks (reference equality)
  if (prev.onPress !== next.onPress) return false;
  if (prev.onPressByteId !== next.onPressByteId) return false;
  if (prev.showSeparator !== next.showSeparator) return false;
  if (prev.hideHeader !== next.hideHeader) return false;
  
  return true; // All fields match, skip re-render
};

export const ByteCard = memo(ByteCardComponent, arePropsEqual);
ByteCard.displayName = 'ByteCard';
