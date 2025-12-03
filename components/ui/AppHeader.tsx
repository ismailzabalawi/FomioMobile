// UI Spec: AppHeader — Enhanced, zero-layer header for Fomio
// - Visual: Tone variants (bg/card/transparent), scroll-aware elevation, symmetric slots
// - Zero-layer: rightActions array, ReactNode title, progress bar
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

import React, { ReactNode, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { Platform, Pressable, View, Text, StyleSheet, Animated, LayoutChangeEvent, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'phosphor-react-native';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { useSafeNavigation } from '@/shared/hooks/useSafeNavigation';
import { useHeader } from '@/components/ui/header';

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
  /** Custom icon color (overrides auto-calculated color) */
  iconColor?: string;
  /** Backdrop variant for transparent tone: 'blur' (iOS-style), 'gradient' (fade), or 'none' */
  transparentBackdrop?: 'blur' | 'gradient' | 'none';
  /** Compact mode - shorter bar height for feed/list screens (default: false) */
  compact?: boolean;
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
    | 'progress'
    | 'iconColor'
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
  extendToStatusBar: false,
  largeTitle: false,
  transparentBackdrop: 'blur',
  compact: false,
};

// UI Spec: Header dimensions
// - iOS: 40px (standard), 32px (compact)
// - Android: 44px (standard), 36px (compact)
// - Slot width: 44px minimum (touch-safe target per platform guidelines)
const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
const COMPACT_BAR_HEIGHT = Platform.OS === 'ios' ? 32 : 36; // Shorter for feed/list screens
const LARGE_TITLE_HEIGHT = 52; // Additional height for large title
const SLOT_MIN_WIDTH = 44; // Symmetric slots prevent title jump (touch-safe target)
// Accessibility: Larger hitSlop for better touch targets (iOS: 44x44, Android: 48x48 minimum)
const DEFAULT_HIT_SLOP = Platform.OS === 'ios' ? 16 : 20; // Provides ~44-48px total touch target

export const AppHeader = memo(function AppHeader({
  title,
  subtitle,
  canGoBack = APP_HEADER_DEFAULTS.canGoBack,
  onBackPress,
  leftNode,
  rightActions,
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
  iconColor: customIconColor,
  transparentBackdrop = APP_HEADER_DEFAULTS.transparentBackdrop,
  compact = APP_HEADER_DEFAULTS.compact,
  testID = 'app-header',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, isDark } = useTheme();
  const { header, setMeasuredHeight } = useHeader();
  const { safeBack } = useSafeNavigation();
  
  // Memoize colors with proper dependencies - ensures theme updates trigger re-renders
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  // Animation values for large title and progress
  const titleOpacity = useRef(new Animated.Value(largeTitle && !isScrolled ? 0 : 1)).current;
  const largeTitleOpacity = useRef(new Animated.Value(largeTitle && !isScrolled ? 1 : 0)).current;
  const progressWidth = useRef(new Animated.Value(progress ?? 0)).current;
  
  // Animation value for elevation fade-in on scroll (for transparent tone)
  const elevationOpacity = useRef(new Animated.Value(tone === 'transparent' && isScrolled ? 1 : 0)).current;
  
  // Animation values for right actions entrance (staggered)
  const rightActionsOpacity = useRef<Animated.Value[]>([]).current;
  const rightActionsTranslateY = useRef<Animated.Value[]>([]).current;
  
  // Initialize animation values for right actions
  useEffect(() => {
    const actionCount = rightActions?.length ?? 0;
    
    // Create animation values if they don't exist or count has changed
    if (rightActionsOpacity.length !== actionCount) {
      rightActionsOpacity.length = 0;
      rightActionsTranslateY.length = 0;
      
      for (let i = 0; i < actionCount; i++) {
        rightActionsOpacity.push(new Animated.Value(0));
        rightActionsTranslateY.push(new Animated.Value(-10));
      }
      
      // Stagger entrance animation
      const animations = rightActionsOpacity.map((opacity, idx) => {
        return Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            delay: idx * 50, // Stagger by 50ms
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rightActionsTranslateY[idx], {
            toValue: 0,
            duration: 250,
            delay: idx * 50,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
      });
      
      Animated.stagger(50, animations).start();
    }
  }, [rightActions?.length, rightActionsOpacity, rightActionsTranslateY]);

  // Animate title fade on scroll with smooth easing
  useEffect(() => {
    if (largeTitle) {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: isScrolled ? 1 : 0,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(largeTitleOpacity, {
          toValue: isScrolled ? 0 : 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isScrolled, largeTitle, titleOpacity, largeTitleOpacity]);

  // Animate progress bar with smooth easing
  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressWidth, {
        toValue: Math.max(0, Math.min(1, progress)),
        duration: 400,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design easing
        useNativeDriver: false, // width animation requires layout
      }).start();
    }
  }, [progress, progressWidth]);

  // Animate elevation opacity on scroll (for transparent tone)
  useEffect(() => {
    if (tone === 'transparent') {
      Animated.timing(elevationOpacity, {
        toValue: isScrolled ? 1 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isScrolled, tone, elevationOpacity]);

  // Header container is already positioned after status bar, add small padding for visual spacing
  // Compact mode removes the extra padding for a tighter bar
  const paddingTop = compact ? 0 : (withSafeTop ? (Platform.OS === 'ios' ? 4 : 2) : 0);
  
  // Use compact height when compact mode is enabled
  const barHeight = compact ? COMPACT_BAR_HEIGHT : BASE_BAR_HEIGHT;

  // Auto-elevate when scrolled (with fade-in animation for transparent tone)
  const shouldElevate = elevated || (isScrolled && tone !== 'transparent');
  const shouldFadeElevate = isScrolled && tone === 'transparent';

  // Determine backdrop for transparent tone
  const hasBackdrop = tone === 'transparent' && transparentBackdrop !== 'none';
  const useBlur = hasBackdrop && transparentBackdrop === 'blur' && Platform.OS === 'ios';
  const useGradient = hasBackdrop && (transparentBackdrop === 'gradient' || (transparentBackdrop === 'blur' && Platform.OS === 'android'));

  // Gradient colors for backdrop (fades from opaque at top to transparent at bottom)
  const gradientColors = useMemo((): [string, string, string] => {
    if (isDark) {
      return ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)'];
    }
    return ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'];
  }, [isDark]);

  function handleBack() {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    // Use onBackPress from props first, then from header state, then safeBack
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (header.onBackPress) {
      header.onBackPress();
      return;
    }
    safeBack();
  }

  // Backgrounds and borders follow ThemeProvider colors (future theme engine safe)
  const backgroundColor =
    tone === 'transparent'
      ? 'transparent'
      : tone === 'bg'
      ? colors.background
      : colors.card;
  const borderColor = colors.border;

  // Auto-calculate status bar style based on background color contrast
  const resolvedStatusBarStyle = useMemo(() => {
    // If explicitly set, use it
    if (statusBarStyle !== 'auto') {
      return statusBarStyle;
    }

    // Auto-determine based on background color
    if (tone === 'transparent') {
      // For transparent, use opposite of theme
      return isDark ? 'light' : 'dark';
    }

    // For bg/card tones, determine based on background color brightness
    // Light backgrounds need dark content, dark backgrounds need light content
    return isDark ? 'light' : 'dark';
  }, [statusBarStyle, tone, isDark]);

  // Icon color calculation - ensure contrast with background
  // For transparent tone, use contrasting color based on theme
  // For bg/card tones, use foreground (which already contrasts)
  const iconColor = useMemo(() => {
    // Use custom icon color if provided
    if (customIconColor) return customIconColor;
    
    // Otherwise compute based on tone
    if (tone === 'transparent') {
      // For transparent backgrounds, use opposite of theme
      return isDark ? '#FFFFFF' : '#000000';
    }
    // For bg and card tones, foreground already provides proper contrast
    return colors.foreground;
  }, [customIconColor, tone, isDark, colors.foreground]);

  // Resolve right actions and ensure accessibility
  const resolvedRightActions = useMemo(() => {
    if (!rightActions || rightActions.length === 0) return [];
    
    return rightActions.map((action, idx) => {
      // If action is already a React element, clone it with enhanced accessibility
      if (React.isValidElement(action)) {
        const existingProps = (action.props as any) || {};
        const testID = existingProps.testID || `app-header-action-${idx}`;
        
        // Ensure accessibility props are present
        const enhancedProps: any = {
          ...existingProps,
          testID,
          // Ensure hitSlop is at least DEFAULT_HIT_SLOP if not provided
          hitSlop: existingProps.hitSlop || DEFAULT_HIT_SLOP,
          // Ensure accessibility props
          accessible: existingProps.accessible !== false ? true : false,
          accessibilityRole: existingProps.accessibilityRole || 'button',
          accessibilityLabel: existingProps.accessibilityLabel || `Action ${idx + 1}`,
          accessibilityHint: existingProps.accessibilityHint || existingProps.accessibilityLabel || undefined,
        };
        
        return React.cloneElement(action, enhancedProps);
      }
      
      // If it's not a React element, wrap it
      return (
        <View
          key={idx}
          testID={`app-header-action-${idx}`}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Action ${idx + 1}`}
        >
          {action}
        </View>
      );
    });
  }, [rightActions]);

  // Measure header height and report to context
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (setMeasuredHeight && height > 0) {
      setMeasuredHeight(height);
    }
  }, [setMeasuredHeight]);

  return (
    <>
      {/* StatusBar - Expo's component handles updates automatically */}
      <StatusBar
        key={`status-bar-${resolvedStatusBarStyle}-${backgroundColor}`}
        style={resolvedStatusBarStyle}
        backgroundColor={Platform.OS === 'android' && tone !== 'transparent' ? backgroundColor : undefined}
        translucent={Platform.OS === 'android' && extendToStatusBar}
        />

      <View
        testID={testID}
        accessibilityRole="header"
        className={cn('w-full')}
        onLayout={onLayout}
        style={{
          // When extendToStatusBar is true, extend padding to cover status bar area
          paddingTop: extendToStatusBar ? (insets.top + paddingTop) : paddingTop,
          backgroundColor: tone === 'transparent' && !hasBackdrop ? 'transparent' : backgroundColor,
          borderBottomColor: borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          // iOS subtle shadow parity - fade in for transparent tone
          ...(shouldElevate
            ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }
            : {}),
          ...(shouldFadeElevate
            ? {
                shadowColor: '#000',
                shadowOpacity: elevationOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.05],
                }) as any,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }
            : {}),
          ...(Platform.OS === 'android' && shouldElevate
            ? { elevation: 2 }
            : {}),
          ...(Platform.OS === 'android' && shouldFadeElevate
            ? {
                elevation: elevationOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2],
                }) as any,
              }
            : {}),
        }}
      >
        {/* Blur backdrop for transparent tone (iOS) */}
        {useBlur && (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Gradient backdrop for transparent tone (Android or when gradient is specified) */}
        {useGradient && (
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}

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
        style={{ height: barHeight }}
      >
        {/* Left slot (always reserves space to prevent title jump) */}
        <View
          style={{ minWidth: SLOT_MIN_WIDTH }}
          className="flex-row items-center justify-start"
        >
          {canGoBack ? (
            <Pressable
              onPress={handleBack}
              hitSlop={DEFAULT_HIT_SLOP}
              android_ripple={{
                color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderless: true,
                radius: 20,
              }}
              className="rounded-full p-1 active:opacity-70"
              accessible
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
          {resolvedRightActions.map((action, idx) => {
            const hasAnimation = idx < rightActionsOpacity.length;
            
            if (!hasAnimation) {
              return (
                <View key={idx} className="ml-1">
                  {action}
                </View>
              );
            }
            
            return (
              <Animated.View
                key={idx}
                className="ml-1"
                style={{
                  opacity: rightActionsOpacity[idx],
                  transform: [{ translateY: rightActionsTranslateY[idx] }],
                }}
              >
                {action}
              </Animated.View>
            );
          })}
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
      </View>
    </>
  );
});
