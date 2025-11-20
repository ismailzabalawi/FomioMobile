import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { House, MagnifyingGlass, Plus, Bell, User } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { View, StyleSheet } from 'react-native';
import { useNotifications } from '../../shared/useNotifications';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';
import { filterNotificationsByPreferences } from '../../lib/utils/notifications';

export default function TabLayout(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { isDark, isAmoled } = useTheme();
  const { notifications } = useNotifications();
  const { preferences } = useNotificationPreferences();

  // Filter notifications by preferences, then count unread
  // Both hooks called at UI level - no nesting
  const preferenceFiltered = useMemo(
    () => filterNotificationsByPreferences(notifications, preferences),
    [notifications, preferences]
  );

  const unreadCount = useMemo(
    () => preferenceFiltered.filter(n => !n.isRead).length,
    [preferenceFiltered]
  );

  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    border: isAmoled ? '#000000' : (isDark ? '#374151' : '#e2e8f0'),
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    primaryGradient: isDark ? '#0ea5e9' : '#0284c7',
    shadow: isAmoled ? 'rgba(14, 165, 233, 0.15)' : (isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.2)'),
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#64748b',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isAmoled ? 0 : (isDark ? 0.3 : 0.06),
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <House
              color={color}
              size={focused ? size + 2 : size}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <MagnifyingGlass
              color={color}
              size={focused ? size + 2 : size}
              weight="bold"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.composeButton,
              {
                backgroundColor: focused ? colors.primaryGradient : colors.primary,
                shadowColor: colors.primary,
                shadowOpacity: focused ? 0.4 : 0.2,
                transform: [{ scale: focused ? 1.1 : 1 }],
              }
            ]}>
              <Plus
                color="#ffffff"
                size={focused ? 28 : 24}
                weight="bold"
              />
            </View>
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <Bell
              color={color}
              size={focused ? size + 2 : size}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User
              color={color}
              size={focused ? size + 2 : size}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  composeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
});

