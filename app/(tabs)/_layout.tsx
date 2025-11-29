import React, { useMemo, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { House, MagnifyingGlass, Plus, Bell, User } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useNotifications } from '../../shared/useNotifications';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';
import { filterNotificationsByPreferences } from '../../lib/utils/notifications';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/shared/theme-constants';
import { BlurView } from 'expo-blur';

// Hook to centralize tab bar color logic using theme tokens
function useTabBarColors(isDark: boolean, isAmoled: boolean) {
  return useMemo(() => {
    const colors = getThemeColors(isDark ? 'dark' : 'light', isAmoled);
    
    return {
      bg: isAmoled ? colors.background : colors.card,
      border: colors.border,
      active: colors.accent,
      inactive: colors.mutedForeground,
      shadow: isAmoled 
        ? 'rgba(96, 165, 250, 0.1)' // Subtle blue glow for AMOLED
        : isDark 
        ? 'rgba(0, 0, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.08)',
      fab: colors.accent,
      fabGradient: colors.ring,
      badgeBg: colors.destructive,
      badgeText: colors.destructiveForeground,
    };
  }, [isDark, isAmoled]);
}

// Memoized tab button with haptics and press feedback
function TabBarButton(props: any) {
  const handlePress = useCallback((e: any) => {
    Haptics.selectionAsync().catch(() => {});
    props.onPress?.(e);
  }, [props.onPress]);

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      hitSlop={12}
      style={({ pressed }) => [
        props.style,
        pressed && { opacity: 0.7 },
      ]}
    />
  );
}

export default function TabLayout(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { isDark, isAmoled } = useTheme();
  const { notifications } = useNotifications();
  const { preferences } = useNotificationPreferences();

  // Filter notifications by preferences, then count unread
  const preferenceFiltered = useMemo(
    () => filterNotificationsByPreferences(notifications, preferences),
    [notifications, preferences]
  );

  const unreadCount = useMemo(
    () => preferenceFiltered.filter(n => !n.isRead).length,
    [preferenceFiltered]
  );

  const colors = useTabBarColors(isDark, isAmoled);

  // Icon size constant - no more size + 2
  const ICON_SIZE = 28;
  const COMPOSE_ICON_SIZE = 30;

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => {
    const baseTabBarStyle = {
      borderTopWidth: 0.5, // Subtle hairline instead of heavy shadow
      borderRadius: 20, // Rounded top corners for floating effect
      marginHorizontal: 4, // Reduced for more spread
      marginBottom: 0, // No margin - sit at bottom
      height: 44 + insets.bottom, // Further reduced height
      paddingBottom: insets.bottom, // Only safe area, no extra padding
      paddingTop: 2, // Minimal top padding
      paddingLeft: Math.max(insets.left, 4), // Reduced for more spread
      paddingRight: Math.max(insets.right, 4), // Reduced for more spread
      // Support for foldables/tablets with long insets
      maxWidth: insets.left + insets.right > 100 ? 600 : undefined,
      alignSelf: insets.left + insets.right > 100 ? 'center' : undefined,
      // Shadow for AMOLED is minimal (handled via shadowColor)
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderTopColor: colors.border,
      shadowColor: colors.shadow,
    };

    // iOS blur effect
    if (Platform.OS === 'ios') {
      return {
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false, // Hide all labels
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          ...baseTabBarStyle,
          position: 'absolute',
          backgroundColor: isAmoled 
            ? 'rgba(0, 0, 0, 0.95)' 
            : isDark 
            ? 'rgba(31, 41, 55, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
        } as any,
        tabBarBackground: () => (
          <BlurView
            intensity={isAmoled ? 20 : isDark ? 30 : 40}
            tint={isAmoled || isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarButton: TabBarButton,
        tabBarBadgeStyle: styles.badge,
        tabBarItemStyle: styles.tabBarItem,
      };
    }

    // Android - solid background with elevation
    return {
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarShowLabel: false, // Hide all labels
      tabBarActiveTintColor: colors.active,
      tabBarInactiveTintColor: colors.inactive,
      tabBarStyle: {
        ...baseTabBarStyle,
        backgroundColor: colors.bg,
      } as any,
      tabBarButton: TabBarButton,
      tabBarBadgeStyle: styles.badge,
      tabBarItemStyle: styles.tabBarItem,
    };
  }, [colors, insets, isDark, isAmoled]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ color, focused }) => (
            <House
              color={color}
              size={ICON_SIZE}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ color, focused }) => (
            <MagnifyingGlass
              color={color}
              size={ICON_SIZE}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          tabBarItemStyle: styles.composeSlot,
          tabBarIcon: ({ focused }) => (
            <View style={styles.composeHitbox}>
              <View
                style={[
                  styles.composeButton,
                  {
                    backgroundColor: focused ? colors.fabGradient : colors.fab,
                    shadowColor: colors.fab,
                    shadowOpacity: focused ? 0.4 : 0.2,
                    transform: [{ translateY: -6 }, { scale: focused ? 1.08 : 1 }],
                  },
                ]}
              >
                <Plus color="#ffffff" size={COMPOSE_ICON_SIZE} weight="bold" />
              </View>
            </View>
          ),
          tabBarButton: (props: any) => (
            <TabBarButton
              {...props}
              accessibilityLabel="Create Byte"
              accessibilityRole="button"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ color, focused }) => (
            <Bell
              color={color}
              size={ICON_SIZE}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
          tabBarBadge: unreadCount > 0 
            ? (unreadCount > 99 ? '99+' : String(unreadCount))
            : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ color, focused }) => (
            <User
              color={color}
              size={ICON_SIZE}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderRadius: 9, // Rounded pill
    paddingHorizontal: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  composeSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  composeHitbox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    marginTop: -16, // Increased lift to account for reduced bar height
  },
  composeButton: {
    width: 60, // Larger radius for true floating pill
    height: 60,
    borderRadius: 30, // True pill shape
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16, // Larger shadow for floating effect
    elevation: 12,
    // Ring/gradient border effect (subtle)
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

