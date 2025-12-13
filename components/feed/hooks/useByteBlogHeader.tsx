import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { useHeader } from '@/components/ui/header';
import { TopicData } from '@/shared/useTopic';
import { OverflowMenu } from '../OverflowMenu';
import { StatusChipsRow } from '../StatusChipsRow';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

/**
 * Hook for managing header configuration in ByteBlogPage
 * Handles header actions, screen header setup, and scroll-aware behavior
 * Returns a scroll handler that should be attached to the ScrollView/FlatList
 */
export function useByteBlogHeader(
  topic: TopicData | null,
  _isDark: boolean,
  onShare?: () => void,
  retry?: () => void
): {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const { registerScrollHandler } = useHeader();
  const { isDark, themeMode } = useTheme();
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);
  const meltProgress = useRef(new Animated.Value(0)).current;
  const lastTargetRef = useRef(0);

  // Determine if author has Staff badge
  const isStaff = useMemo(() => {
    return topic?.authorBadges?.some((badge) => badge.name === 'Staff') ?? false;
  }, [topic]);

  // Status chips (replaces prior subheader; now sits in the right action area)
  const statusChips = useMemo(() => {
    if (!topic) return undefined;
    return (
      <StatusChipsRow
        key="status-chips"
        isPinned={topic.isPinned}
        isLocked={topic.isClosed}
        isArchived={topic.isArchived}
        isStaff={isStaff}
      />
    );
  }, [topic, isStaff]);

  // Configure header actions (status chips + overflow menu)
  const headerActions = useMemo(() => {
    if (!topic) return undefined;
    const actions: React.ReactNode[] = [];
    if (statusChips) {
      actions.push(statusChips);
    }
    actions.push(
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
    );
    return actions;
  }, [topic, statusChips, onShare, retry]);

  // Derive a stable key for header updates without putting React nodes in deps
  const headerStatusKey = useMemo(() => {
    if (!topic) return 'no-topic';
    return [
      topic.id,
      topic.isPinned ? 'p1' : 'p0',
      topic.isClosed ? 'c1' : 'c0',
      topic.isArchived ? 'a1' : 'a0',
      isStaff ? 's1' : 's0',
      onShare ? 'share' : 'no-share',
    ].join('-');
  }, [topic, isStaff, onShare]);

  // Configure header with a fluid, melting title
  useScreenHeader(
    {
      title: (
        <FluidHeaderTitle
          key={`fluid-title-${topic?.id ?? 'byte'}`}
          brandLabel="Byte"
          articleTitle={topic?.title ?? 'Byte'}
          progress={meltProgress}
          mode={themeMode === 'dark' || isDark ? 'dark' : 'light'}
        />
      ),
      rightActions: headerActions,
      canGoBack: true,
      tone: 'bg',
      compact: true,
      statusBarStyle: isDark ? 'light' : 'dark',
      extendToStatusBar: true,
      titleNumberOfLines: 1,
      titleFontSize: 20,
    },
    // Avoid React nodes in deps; use stable keys only
    [headerStatusKey, isDark, topic?.title]
  );

  // Reset melt progress when topic changes (smooth settle)
  useEffect(() => {
    lastTargetRef.current = 0;
    Animated.timing(meltProgress, {
      toValue: 0,
      duration: tokens.motion.durations.medium,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [meltProgress, tokens.motion.durations.medium, topic?.id]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
      const target = Math.max(0, Math.min(1, offsetY / 96)); // Smoothly reach 1 around ~96px scroll

      // Skip tiny changes to reduce animation churn
      if (Math.abs(target - lastTargetRef.current) < 0.02) {
        return;
      }

      lastTargetRef.current = target;

      Animated.spring(meltProgress, {
        toValue: target,
        damping: tokens.motion.liquidSpring.damping,
        stiffness: tokens.motion.liquidSpring.stiffness,
        mass: 1,
        useNativeDriver: true,
      }).start();
    },
    [meltProgress, tokens.motion.liquidSpring.damping, tokens.motion.liquidSpring.stiffness]
  );

  // Register scroll handler for automatic scroll-aware header behavior
  // This updates the header's isScrolled state and drives the melt animation
  const { onScroll } = useMemo(
    () =>
      registerScrollHandler(handleScroll, {
        threshold: 18, // Slightly sooner so melt starts early
      }),
    [registerScrollHandler, handleScroll]
  );

  return { onScroll };
}

interface FluidHeaderTitleProps {
  brandLabel: string;
  articleTitle: string;
  progress: Animated.Value;
  mode: 'light' | 'dark';
}

function FluidHeaderTitle({ brandLabel, articleTitle, progress, mode }: FluidHeaderTitleProps) {
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const resolvedTitle = articleTitle?.trim() || brandLabel;
  const clampedTitle = resolvedTitle.length > 68 ? `${resolvedTitle.slice(0, 68)}…` : resolvedTitle;

  const brandOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 0.25, 0.7, 1],
        outputRange: [1, 0.6, 0.2, 0],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  const brandTranslateY = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [2, -6],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  const titleOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 0.15, 0.6, 1],
        outputRange: [0, 0.25, 0.9, 1],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  const titleTranslateY = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  const bridgeScale = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  const bridgeOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [0, 0.2, 0.7, 1],
        extrapolate: 'clamp',
      }),
    [progress]
  );

  return (
    <View style={{ height: 26, justifyContent: 'center' }}>
      <Animated.Text
        numberOfLines={1}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          fontSize: 18,
          fontWeight: '700',
          color: tokens.colors.muted,
          opacity: brandOpacity,
          transform: [{ translateY: brandTranslateY }],
        }}
      >
        {brandLabel}
      </Animated.Text>

      <Animated.Text
        numberOfLines={1}
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: tokens.colors.text,
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}
      >
        {clampedTitle}
      </Animated.Text>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -2,
          height: 2,
          borderRadius: 999,
          backgroundColor: tokens.colors.accent,
          opacity: bridgeOpacity,
          transform: [{ scaleX: bridgeScale }],
        }}
      />
    </View>
  );
}
