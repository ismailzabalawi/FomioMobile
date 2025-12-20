/**
 * Tab Bar Components
 * 
 * Reusable components and hooks for the navigation tab bar.
 * Includes TabIcon, FluidTabItem, and useTabBarColors hook.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { getThemeColors } from '@/shared/theme-constants';
import { getTokens } from '@/shared/design/tokens';
import {
  TAB_ITEM_ICON_SIZE,
  TAB_HIT_SLOP,
  BAR_CAP_RADIUS,
  BADGE_TOP,
  BADGE_RIGHT,
  BADGE_MIN_WIDTH,
  BADGE_HEIGHT,
  BADGE_BORDER_RADIUS,
  BADGE_PADDING_HORIZONTAL,
  BADGE_FONT_SIZE,
  BADGE_FONT_WEIGHT,
  BADGE_LINE_HEIGHT,
} from '@/shared/navigation/tabBarConstants';

// ============================================================================
// TAB ICON COMPONENT
// ============================================================================

/**
 * Memoized tab button icon with haptics and press feedback
 * Provides smooth scale and opacity animations when focused
 */
export function TabIcon({
  isFocused,
  children,
}: {
  isFocused: boolean;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        { scale: withSpring(isFocused ? 1.12 : 1, { damping: 16, stiffness: 210 }) },
      ],
      opacity: withSpring(isFocused ? 1 : 0.65, { damping: 18, stiffness: 180 }),
    }),
    [isFocused]
  );

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// ============================================================================
// FLUID TAB ITEM COMPONENT
// ============================================================================

/**
 * Tab item with optional fluid ripple animation (for search tab)
 * Supports badge display and theme-aware styling
 */
export function FluidTabItem({
  routeName,
  routeKey,
  isFocused,
  activeColor,
  inactiveColor,
  accessibilityLabel,
  onPress,
  renderIcon,
  showBadge,
  badgeCount,
  badgeBg,
  badgeText,
  isDark,
}: {
  routeName: string;
  routeKey: string;
  isFocused: boolean;
  activeColor: string;
  inactiveColor: string;
  accessibilityLabel?: string;
  onPress: () => void;
  renderIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  showBadge?: boolean;
  badgeCount?: number;
  badgeBg: string;
  badgeText: string;
  isDark: boolean;
}) {
  const isSearchTab = routeName === 'search';
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  // Shared values for search tab ripple animation
  const searchPressProgress = useSharedValue(0);
  const searchRippleScale = useSharedValue(0);

  const handlePressIn = () => {
    if (isSearchTab) {
      searchPressProgress.value = withSpring(1, tokens.motion.liquidSpring);
      searchRippleScale.value = withSpring(1.5, tokens.motion.snapSpring);
    }
  };

  const handlePressOut = () => {
    if (isSearchTab) {
      searchPressProgress.value = withSpring(0, tokens.motion.liquidSpring);
      searchRippleScale.value = withSpring(0, tokens.motion.liquidSpring);
    }
  };

  // Animated ripple style for search tab
  const searchRippleStyle = useAnimatedStyle(() => {
    if (!isSearchTab) return { opacity: 0 };

    const opacity = interpolate(
      searchPressProgress.value,
      [0, 0.3, 0.7, 1],
      [0, 0.25, 0.15, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ scale: searchRippleScale.value }],
    };
  }, [isSearchTab]);

  const color = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      key={routeKey}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabPressable}
      hitSlop={TAB_HIT_SLOP}
    >
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Fluid ripple effect for search tab */}
        {isSearchTab && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 44,
                height: 44,
                borderRadius: BAR_CAP_RADIUS,
                backgroundColor: activeColor,
              },
              searchRippleStyle,
            ]}
          />
        )}
        <TabIcon isFocused={isFocused}>
          {renderIcon?.({
            focused: isFocused,
            color,
            size: TAB_ITEM_ICON_SIZE,
          })}
        </TabIcon>
      </View>
      {showBadge && badgeCount !== undefined && badgeCount > 0 && (
        <View style={[styles.badgeContainer, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeText }]}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// TAB BAR COLORS HOOK
// ============================================================================

/**
 * Hook to centralize tab bar color logic using theme tokens
 * Uses getThemeColors for comprehensive color palette and getTokens for UI-specific values
 */
export function useTabBarColors(isDark: boolean, isAmoled: boolean) {
  return useMemo(() => {
    const colors = getThemeColors(isDark ? 'dark' : 'light', isAmoled);
    const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');

    return {
      bg: isAmoled ? colors.background : colors.card,
      border: colors.border,
      active: colors.accent,
      inactive: colors.mutedForeground,
      // Use shadow color from tokens (already theme-aware)
      shadow: tokens.colors.shadow,
      fab: colors.accent,
      fabGradient: colors.ring,
      badgeBg: colors.destructive,
      badgeText: colors.destructiveForeground,
    };
  }, [isDark, isAmoled]);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: BADGE_TOP,
    right: BADGE_RIGHT,
    minWidth: BADGE_MIN_WIDTH,
    height: BADGE_HEIGHT,
    borderRadius: BADGE_BORDER_RADIUS,
    paddingHorizontal: BADGE_PADDING_HORIZONTAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: BADGE_FONT_SIZE,
    fontWeight: BADGE_FONT_WEIGHT,
    lineHeight: BADGE_LINE_HEIGHT,
  },
});



