// UI Spec: AppHeader — Enhanced, zero-layer header for Fomio
// - Visual: Tone variants (bg/card/transparent), scroll-aware elevation, symmetric slots
// - Zero-layer: rightActions array, subHeader for chips/filters, ReactNode title, progress bar
// - Uses Fomio semantic tokens: bg-fomio-*, text-fomio-*, border-fomio-*
// - Supports AMOLED Dark mode (true black baseline)
// - Safe-area aware with optional top padding (via withSafeTop prop)
// - Navigation-aware with Expo Router integration
// - Compact height (44-48px) like iOS/Android native bars
// - Clean bottom separator (hairline border)
// - Haptic feedback (optional) on back actions
// - Android ripple support
// - Status bar coordination
// - Large title support (iOS-style)
// - Animated transitions

import React, { ReactNode, memo, useMemo, useEffect, useRef } from 'react';
import { Platform, Pressable, View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'phosphor-react-native';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';

export interface AppHeaderProps {
  /** Title text or custom ReactNode (e.g., search field) */
  title: string | ReactNode;
  /** Optional subtitle text */
  subtitle?: string;
  /** Show back button */
  canGoBack?: boolean;
  /** Custom back handler (defaults to router.back()) */
  onBackPress?: () => void;
  /** Custom left node (used when canGoBack is false) */
  leftNode?: ReactNode;
  /** Array of right-side action buttons/nodes */
  rightActions?: ReactNode[];
  /** Optional sub-header row (chips, filters, tabs) below main bar */
  subHeader?: ReactNode;
  /** Visual tone: 'bg' blends with page, 'card' is surfaced, 'transparent' for overlays */
  tone?: 'bg' | 'card' | 'transparent';
  /** Show elevation shadow (auto-applied when isScrolled is true) */
  elevated?: boolean;
  /** Scroll state - when true, applies elevation automatically */
  isScrolled?: boolean;
  /** Show safe area top padding */
  withSafeTop?: boolean;
  /** Enable haptic feedback on back press */
  enableHaptics?: boolean;
  /** Progress bar value (0-1) for loading states */
  progress?: number;
  /** Center title horizontally */
  centerTitle?: boolean;
  /** Max lines for title text */
  titleNumberOfLines?: number;
  /** Max lines for subtitle text */
  subtitleNumberOfLines?: number;
  /** Title font size in px (defaults to 20 for stronger hierarchy) */
  titleFontSize?: number;
  /** Status bar style */
  statusBarStyle?: 'light' | 'dark' | 'auto';
  /** Visually paint status bar area to match header (default: true) */
  extendToStatusBar?: boolean;
  /** Large title mode (iOS-style, collapses on scroll) */
  largeTitle?: boolean;
  /** Test ID for E2E testing */
  testID?: string;
}

export const APP_HEADER_DEFAULTS: Required<
  Omit<
    AppHeaderProps,
    | 'title'
    | 'subtitle'
    | 'onBackPress'
    | 'leftNode'
    | 'rightActions'
    | 'subHeader'
    | 'progress'
    | 'testID'
  >
> = {
  canGoBack: false,
  tone: 'card',
  elevated: false,
  isScrolled: false,
  withSafeTop: true,
  enableHaptics: true,
  centerTitle: false,
  titleNumberOfLines: 1,
  subtitleNumberOfLines: 1,
  titleFontSize: 22,
  statusBarStyle: 'auto',
  extendToStatusBar: true,
  largeTitle: false,
};

// UI Spec: Header dimensions
// - iOS: 44px (native standard)
// - Android: 48px (Material Design touch target)
// - Slot width: 44px minimum (touch-safe target per platform guidelines)
const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 48;
const LARGE_TITLE_HEIGHT = 52; // Additional height for large title
const SLOT_MIN_WIDTH = 44; // Symmetric slots prevent title jump (touch-safe target)

export const AppHeader = memo(function AppHeader({
  title,
  subtitle,
  canGoBack = APP_HEADER_DEFAULTS.canGoBack,
  onBackPress,
  leftNode,
  rightActions,
  subHeader,
  tone = APP_HEADER_DEFAULTS.tone,
  elevated = APP_HEADER_DEFAULTS.elevated,
  isScrolled = APP_HEADER_DEFAULTS.isScrolled,
  withSafeTop = APP_HEADER_DEFAULTS.withSafeTop,
  enableHaptics = APP_HEADER_DEFAULTS.enableHaptics,
  progress,
  centerTitle = APP_HEADER_DEFAULTS.centerTitle,
  titleNumberOfLines = APP_HEADER_DEFAULTS.titleNumberOfLines,
  subtitleNumberOfLines = APP_HEADER_DEFAULTS.subtitleNumberOfLines,
  titleFontSize = APP_HEADER_DEFAULTS.titleFontSize,
  statusBarStyle = APP_HEADER_DEFAULTS.statusBarStyle,
  extendToStatusBar = APP_HEADER_DEFAULTS.extendToStatusBar,
  largeTitle = APP_HEADER_DEFAULTS.largeTitle,
  testID = 'app-header',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, isDark } = useTheme();
  
  // Memoize colors with proper dependencies - ensures theme updates trigger re-renders
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  // Animation values for large title and progress
  const titleOpacity = useRef(new Animated.Value(largeTitle && !isScrolled ? 0 : 1)).current;
  const largeTitleOpacity = useRef(new Animated.Value(largeTitle && !isScrolled ? 1 : 0)).current;
  const progressWidth = useRef(new Animated.Value(progress ?? 0)).current;

  // Animate title fade on scroll
  useEffect(() => {
    if (largeTitle) {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: isScrolled ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(largeTitleOpacity, {
          toValue: isScrolled ? 0 : 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isScrolled, largeTitle, titleOpacity, largeTitleOpacity]);

  // Animate progress bar
  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressWidth, {
        toValue: Math.max(0, Math.min(1, progress)),
        duration: 300,
        useNativeDriver: false, // width animation requires layout
      }).start();
    }
  }, [progress, progressWidth]);

  // Header container is already positioned after status bar, add small padding for visual spacing
  const paddingTop = withSafeTop ? (Platform.OS === 'ios' ? 8 : 4) : 0;

  // Auto-elevate when scrolled
  const shouldElevate = elevated || isScrolled;

  function handleBack() {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (onBackPress) return onBackPress();
    router.back();
  }

  // Backgrounds and borders follow ThemeProvider colors (future theme engine safe)
  const backgroundColor =
    tone === 'transparent'
      ? 'transparent'
      : tone === 'bg'
      ? colors.background
      : colors.card;
  const borderColor = colors.border;

  // Icon color calculation - ensure contrast with background
  // For transparent tone, use contrasting color based on theme
  // For bg/card tones, use foreground (which already contrasts)
  const iconColor = useMemo(() => {
    if (tone === 'transparent') {
      // For transparent backgrounds, use opposite of theme
      return isDark ? '#FFFFFF' : '#000000';
    }
    // For bg and card tones, foreground already provides proper contrast
    return colors.foreground;
  }, [tone, isDark, colors.foreground]);

  // Resolve right actions
  const resolvedRightActions = rightActions || [];

  return (
    <View
      testID={testID}
      accessibilityRole="header"
      className={cn('w-full')}
      style={{
        paddingTop,
        backgroundColor,
        borderBottomColor: borderColor,
        borderBottomWidth: StyleSheet.hairlineWidth,
        // iOS subtle shadow parity
        ...(shouldElevate
          ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }
          : {}),
        ...(Platform.OS === 'android' && shouldElevate
          ? { elevation: 2 }
          : {}),
      }}
    >
      <StatusBar style={statusBarStyle as any} />

      {/* Progress bar (thin animated line at top) */}
      {progress !== undefined && (
        <View className="h-0.5 overflow-hidden" style={{ backgroundColor: colors.muted }}>
          <Animated.View
            className="h-full"
            style={{
              backgroundColor: colors.accent,
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      )}

      {/* Main bar */}
      <View
        className="flex-row items-center px-fomio-md justify-between"
        style={{ height: BASE_BAR_HEIGHT }}
      >
        {/* Left slot (always reserves space to prevent title jump) */}
        <View
          style={{ minWidth: SLOT_MIN_WIDTH }}
          className="flex-row items-center justify-start"
        >
          {canGoBack ? (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              android_ripple={{
                color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderless: true,
                radius: 20,
              }}
              className="rounded-full p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Go back to previous screen"
              testID="app-header-back"
            >
              <ArrowLeft size={20} color={iconColor} weight="bold" />
            </Pressable>
          ) : (
            leftNode
          )}
        </View>

        {/* Title block - animated for large title mode */}
        <View className={cn('flex-1 px-fomio-sm', centerTitle ? 'items-center' : 'items-start')}>
          {largeTitle ? (
            <>
              {/* Compact title (shown when scrolled) */}
              <Animated.View
                style={{
                  opacity: titleOpacity,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                }}
              >
                {typeof title === 'string' ? (
                  <Text
                    numberOfLines={titleNumberOfLines}
                    className="font-semibold text-title"
                    style={{ color: colors.foreground, fontSize: titleFontSize }}
                  >
                    {title}
                  </Text>
                ) : (
                  title
                )}
              </Animated.View>
              {/* Large title (shown when not scrolled) */}
              <Animated.View
                style={{
                  opacity: largeTitleOpacity,
                }}
              >
                {typeof title === 'string' ? (
                  <Text
                    numberOfLines={titleNumberOfLines}
                    className="font-bold"
                    style={{ 
                      color: colors.foreground, 
                      fontSize: 34,
                      lineHeight: 41,
                    }}
                  >
                    {title}
                  </Text>
                ) : (
                  title
                )}
              </Animated.View>
            </>
          ) : (
            typeof title === 'string' ? (
              <Text
                numberOfLines={titleNumberOfLines}
                className="font-semibold text-title"
                style={{ color: colors.foreground, fontSize: titleFontSize }}
              >
                {title}
              </Text>
            ) : (
              title
            )
          )}
        </View>

        {/* Right actions (always reserves space, supports multiple) */}
        <View
          style={{ minWidth: SLOT_MIN_WIDTH }}
          className="flex-row items-center justify-end gap-1"
        >
          {resolvedRightActions.map((action, idx) => (
            <View key={idx} className="ml-1">
              {action}
            </View>
          ))}
        </View>
      </View>

      {/* Large title area (only visible when largeTitle is true and not scrolled) */}
      {largeTitle && (
        <Animated.View
          style={{
            height: LARGE_TITLE_HEIGHT,
            opacity: largeTitleOpacity,
            paddingHorizontal: 16,
            paddingTop: 8,
            justifyContent: 'flex-end',
          }}
        >
          {subtitle && (
            <Text
              numberOfLines={subtitleNumberOfLines}
              className="text-sm"
              style={{ color: colors.secondary }}
            >
              {subtitle}
            </Text>
          )}
        </Animated.View>
      )}

      {/* Sub-header row (chips, filters, tabs) */}
      {subHeader && (
        <View
          className="px-fomio-md pb-fomio-sm border-t"
          style={{ borderTopColor: borderColor }}
        >
          {subHeader}
        </View>
      )}
    </View>
  );
});
