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

import React, { ReactNode, memo, useMemo } from 'react';
import { Platform, Pressable, View, Text, StyleSheet } from 'react-native';
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
  /** Test ID for E2E testing */
  testID?: string;
}

// UI Spec: Header dimensions
// - iOS: 44px (native standard)
// - Android: 48px (Material Design touch target)
// - Slot width: 44px minimum (touch-safe target per platform guidelines)
const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 48;
const SLOT_MIN_WIDTH = 44; // Symmetric slots prevent title jump (touch-safe target)

export const AppHeader = memo(function AppHeader({
  title,
  subtitle,
  canGoBack = false,
  onBackPress,
  leftNode,
  rightActions,
  subHeader,
  tone = 'card',
  elevated = false,
  isScrolled = false,
  withSafeTop = true,
  enableHaptics = true,
  progress,
  centerTitle = false,
  titleNumberOfLines = 1,
  subtitleNumberOfLines = 1,
  titleFontSize = 22,
  statusBarStyle = 'auto',
  extendToStatusBar = true,
  testID = 'app-header',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

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

  // Icon color uses semantic foreground token
  const iconColor = colors.foreground;

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

      {/* Progress bar (thin line at top) */}
      {progress !== undefined && (
        <View
          className="h-0.5"
          style={{
            backgroundColor: colors.accent,
            width: `${Math.max(0, Math.min(100, progress * 100))}%`,
          }}
        />
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

        {/* Title block */}
        <View className={cn('flex-1 px-fomio-sm', centerTitle ? 'items-center' : 'items-start')}>
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
