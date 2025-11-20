import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellSlash,
  Check,
  Heart,
  ChatCircle,
  Share,
  UserPlus,
  At,
  Star,
  Bookmark,
  Gear,
  PencilSimple,
  Envelope,
  Calendar,
  Clock,
  CheckCircle,
  Smiley,
  Users,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { useNotifications, Notification } from '../../shared/useNotifications';
import { useAuth } from '../../shared/useAuth';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';
import {
  formatRelativeTime,
  groupNotificationsByTime,
  filterNotificationsByType,
  filterNotificationsByPreferences,
  getNotificationTitle,
  getNotificationSnippet,
  getNotificationTypeCategory,
  getNotificationNavigationTarget,
  NotificationSection,
} from '../../lib/utils/notifications';
import { Skeleton } from '@/components/shared/loading';
import { cn } from '@/lib/utils/cn';

// Notification type filter
type TypeFilter = 'all' | 'replies' | 'mentions' | 'system';

// UI Spec: NotificationItem — Clean, scannable notification row
// - Left icon (type-based, colored background)
// - Title line (bold if unread)
// - Snippet line (Byte title or excerpt, truncated)
// - Right: relative time + unread dot
// - Subtle background highlight for unread
// - Tap to navigate + mark as read
function NotificationItem({
  notification,
  onPress,
  onMarkRead,
}: {
  notification: Notification;
  onPress: () => void;
  onMarkRead: () => void;
}) {
  const { isDark, isAmoled } = useTheme();

  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
    unreadBackground: isAmoled ? '#0a0a0a' : isDark ? '#374151' : '#f8fafc',
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
    warning: isDark ? '#f59e0b' : '#d97706',
    success: isDark ? '#10b981' : '#059669',
  };

  const getNotificationIcon = () => {
    const iconSize = 20;
    const iconColor = '#ffffff';
    switch (notification.type) {
      case 'liked':
      case 'liked_consolidated':
        return <Heart size={iconSize} color={iconColor} weight="fill" />;
      case 'replied':
        return <ChatCircle size={iconSize} color={iconColor} weight="fill" />;
      case 'mentioned':
      case 'group_mentioned':
        return <At size={iconSize} color={iconColor} weight="fill" />;
      case 'invited_to_private_message':
      case 'private_message':
        return <Envelope size={iconSize} color={iconColor} weight="fill" />;
      case 'bookmark_reminder':
      case 'topic_reminder':
        return <Clock size={iconSize} color={iconColor} weight="fill" />;
      case 'quoted':
        return <Share size={iconSize} color={iconColor} weight="fill" />;
      case 'granted_badge':
        return <Star size={iconSize} color={iconColor} weight="fill" />;
      case 'edited':
        return <PencilSimple size={iconSize} color={iconColor} weight="fill" />;
      case 'post_approved':
        return <CheckCircle size={iconSize} color={iconColor} weight="fill" />;
      case 'reaction':
        return <Smiley size={iconSize} color={iconColor} weight="fill" />;
      case 'event_reminder':
      case 'event_invitation':
        return <Calendar size={iconSize} color={iconColor} weight="fill" />;
      case 'membership_request_accepted':
      case 'membership_request_consolidated':
        return <Users size={iconSize} color={iconColor} weight="fill" />;
      default:
        return <Bell size={iconSize} color={iconColor} weight="regular" />;
    }
  };

  const getIconBackgroundColor = () => {
    switch (notification.type) {
      case 'liked':
      case 'liked_consolidated':
        return colors.error;
      case 'replied':
      case 'quoted':
      case 'edited':
        return colors.accent;
      case 'mentioned':
      case 'group_mentioned':
      case 'reaction':
        return colors.warning;
      case 'invited_to_private_message':
      case 'private_message':
      case 'post_approved':
        return colors.success;
      case 'bookmark_reminder':
      case 'granted_badge':
      case 'topic_reminder':
        return colors.accent;
      case 'event_reminder':
      case 'event_invitation':
        return colors.warning;
      case 'membership_request_accepted':
      case 'membership_request_consolidated':
        return colors.success;
      default:
        return colors.secondary;
    }
  };

  const title = getNotificationTitle(notification);
  const snippet = getNotificationSnippet(notification);
  const relativeTime = formatRelativeTime(notification.createdAt);

  const handlePress = () => {
    // Mark as read immediately (optimistic update)
    if (!notification.isRead) {
      onMarkRead();
    }

    // Navigate to content
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn('flex-row items-start px-4 py-3 border-b')}
      style={{
        backgroundColor: notification.isRead
          ? colors.background
          : colors.unreadBackground,
        borderBottomColor: colors.border,
      }}
      android_ripple={{
        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}
    >
      {/* Icon */}
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: getIconBackgroundColor() }}
      >
        {getNotificationIcon()}
      </View>

      {/* Content */}
      <View className="flex-1 mr-2">
        <Text
          className="text-base mb-1"
          style={{
            color: colors.text,
            fontWeight: notification.isRead ? '500' : '600',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {snippet ? (
          <Text
            className="text-sm mb-1"
            style={{ color: colors.secondary }}
            numberOfLines={2}
          >
            {snippet}
          </Text>
        ) : null}
        <Text className="text-xs" style={{ color: colors.secondary }}>
          {relativeTime}
        </Text>
      </View>

      {/* Unread indicator */}
      {!notification.isRead && (
        <View
          className="w-2 h-2 rounded-full mt-2"
          style={{ backgroundColor: colors.accent }}
        />
      )}
    </Pressable>
  );
}

// UI Spec: NotificationSkeleton — Loading placeholder
function NotificationSkeleton() {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View
      className="flex-row items-start px-4 py-3 border-b"
      style={{ backgroundColor: colors.background, borderBottomColor: colors.border }}
    >
      <Skeleton width={40} height={40} borderRadius={20} />
      <View className="flex-1 ml-3">
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

// UI Spec: EmptyState — Calm, helpful empty states
function EmptyState({
  type,
  onSignIn,
}: {
  type: 'empty' | 'logged-out' | 'filtered';
  onSignIn?: () => void;
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
  };

  if (type === 'logged-out') {
    return (
      <View className="flex-1 justify-center items-center px-8 py-16">
        <BellSlash size={64} color={colors.secondary} weight="regular" />
        <Text
          className="text-xl font-semibold mt-6 mb-2 text-center"
          style={{ color: colors.text }}
        >
          Sign in to see notifications
        </Text>
        <Text
          className="text-base text-center mb-8"
          style={{ color: colors.secondary }}
        >
          When someone replies to your Bytes or mentions you, they'll show up
          here.
        </Text>
        {onSignIn && (
          <TouchableOpacity
            onPress={onSignIn}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (type === 'filtered') {
    return (
      <View className="flex-1 justify-center items-center px-8 py-16">
        <BellSlash size={64} color={colors.secondary} weight="regular" />
        <Text
          className="text-xl font-semibold mt-6 mb-2 text-center"
          style={{ color: colors.text }}
        >
          No notifications match this filter
        </Text>
        <Text
          className="text-base text-center"
          style={{ color: colors.secondary }}
        >
          Try selecting a different filter or check back later.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center px-8 py-16">
      <BellSlash size={64} color={colors.secondary} weight="regular" />
      <Text
        className="text-xl font-semibold mt-6 mb-2 text-center"
        style={{ color: colors.text }}
      >
        You're all caught up ✨
      </Text>
      <Text
        className="text-base text-center"
        style={{ color: colors.secondary }}
      >
        When someone replies to your Bytes or mentions you, they'll show up
        here.
      </Text>
    </View>
  );
}

export default function NotificationsScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    notifications,
    isLoading: isNotificationsLoading,
    hasError,
    errorMessage,
    loadNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { preferences } = useNotificationPreferences();

  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#18181b' : '#ffffff',
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Step 1: Filter by preferences ONCE (reused for counts and display)
  const preferenceFiltered = useMemo(
    () => filterNotificationsByPreferences(notifications, preferences),
    [notifications, preferences]
  );

  // Step 2: Apply UI type filter
  const typeFiltered = useMemo(
    () => filterNotificationsByType(preferenceFiltered, typeFilter),
    [preferenceFiltered, typeFilter]
  );

  // Step 3: Group by time
  const processedNotifications = useMemo(
    () => groupNotificationsByTime(typeFiltered),
    [typeFiltered]
  );

  // Load notifications on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      fetchNotifications();
    }
  }, [isAuthenticated, isAuthLoading, fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    const navigationTarget = getNotificationNavigationTarget(notification);

    if (!navigationTarget) {
      console.log('No navigation target for notification:', notification.type, notification.id);
      return;
    }

    // Build URL with query params if needed
    let url = navigationTarget.path;
    if (navigationTarget.params) {
      const queryString = Object.entries(navigationTarget.params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url = `${url}?${queryString}`;
    }

    router.push(url as any);
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert('Mark All as Read', 'Mark all notifications as read?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Read',
        onPress: async () => {
          await markAllAsRead();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        },
      },
    ]);
  };

  const handleSettingsPress = () => {
    router.push('/(profile)/notification-settings' as any);
  };

  // Render filter chip
  const renderFilterChip = (
    filter: TypeFilter,
    label: string,
    count?: number
  ) => {
    const isActive = typeFilter === filter;
    return (
      <TouchableOpacity
        onPress={() => {
          setTypeFilter(filter);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }}
        className={cn(
          'px-4 py-2 rounded-full border',
          isActive && 'bg-opacity-20'
        )}
        style={{
          backgroundColor: isActive ? `${colors.primary}20` : 'transparent',
          borderColor: isActive ? colors.primary : colors.border,
          marginRight: 8,
        }}
      >
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.primary : colors.text }}
        >
          {label}
          {count !== undefined && count > 0 && (
            <Text style={{ color: colors.secondary }}> ({count})</Text>
          )}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View className="px-4 py-2" style={{ backgroundColor: colors.background }}>
      <Text
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: colors.secondary }}
      >
        {section.title}
      </Text>
    </View>
  );

  // Render notification item
  const renderItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkRead={() => handleMarkRead(item.id)}
    />
  );

  // Count notifications by type for filter chips (use preferenceFiltered)
  const repliesCount = preferenceFiltered.filter(
    (n) => getNotificationTypeCategory(n.type) === 'replies'
  ).length;
  const mentionsCount = preferenceFiltered.filter(
    (n) => getNotificationTypeCategory(n.type) === 'mentions'
  ).length;
  const systemCount = preferenceFiltered.filter(
    (n) => getNotificationTypeCategory(n.type) === 'system'
  ).length;

  // Loading state
  if (isNotificationsLoading && notifications.length === 0) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <AppHeader
          title="Notifications"
          canGoBack={false}
          withSafeTop={false}
          tone="bg"
        />
        <View>
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Error state (full screen only when no data)
  if (hasError && notifications.length === 0) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <AppHeader
          title="Notifications"
          canGoBack={false}
          withSafeTop={false}
          tone="bg"
        />
        <View className="flex-1 justify-center items-center px-8">
          <Text
            className="text-lg font-semibold mb-2 text-center"
            style={{ color: colors.error }}
          >
            Error loading notifications
          </Text>
          <Text
            className="text-base mb-6 text-center"
            style={{ color: colors.secondary }}
          >
            {errorMessage || 'Something went wrong'}
          </Text>
          <TouchableOpacity
            onPress={fetchNotifications}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Logged out state
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <AppHeader
          title="Notifications"
          canGoBack={false}
          withSafeTop={false}
          tone="bg"
        />
        <EmptyState
          type="logged-out"
          onSignIn={() => router.push('/(auth)/signin' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <AppHeader
        title="Notifications"
        canGoBack={false}
        withSafeTop={false}
        tone="bg"
        rightActions={[
          unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              className="p-2 rounded-full"
              style={{
                backgroundColor: `${colors.primary}20`,
              }}
              android_ripple={{
                color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderless: true,
                radius: 20,
              }}
            >
              <Check size={20} color={colors.primary} weight="bold" />
            </Pressable>
          ) : null,
          <Pressable
            onPress={handleSettingsPress}
            className="p-2 rounded-full"
            style={{
              backgroundColor: `${colors.secondary}20`,
            }}
            android_ripple={{
              color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderless: true,
              radius: 20,
            }}
          >
            <Gear size={20} color={colors.secondary} weight="regular" />
          </Pressable>,
        ].filter(Boolean)}
      />

      {/* Error banner (when data exists) */}
      {hasError && notifications.length > 0 && (
        <View className="px-4 py-2 border-b" style={{ borderBottomColor: colors.border }}>
          <Text
            className="text-xs"
            style={{ color: colors.error }}
          >
            Couldn't refresh notifications. Pull to refresh to try again.
          </Text>
        </View>
      )}

      {/* Filter chips */}
      <View className="flex-row px-4 py-3 border-b" style={{ borderBottomColor: colors.border }}>
        {renderFilterChip('all', 'All', preferenceFiltered.length)}
        {renderFilterChip('replies', 'Replies', repliesCount)}
        {renderFilterChip('mentions', 'Mentions', mentionsCount)}
        {renderFilterChip('system', 'System', systemCount)}
      </View>

      {/* Notifications list */}
      {processedNotifications.length === 0 ? (
        <EmptyState
          type={typeFilter === 'all' ? 'empty' : 'filtered'}
        />
      ) : (
        <SectionList
          sections={processedNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
