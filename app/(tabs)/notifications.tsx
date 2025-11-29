import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useHeader } from '@/components/ui/header';
import { SettingSection } from '@/components/settings';
import { useNotifications, Notification } from '../../shared/useNotifications';
import { useAuth } from '@/shared/auth-context';
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
import { getThemeColors } from '@/shared/theme-constants';

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
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

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
        return colors.destructive;
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

  const unreadBackground = isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(14, 165, 233, 0.08)';

  return (
    <Pressable
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        minHeight: 60,
        backgroundColor: notification.isRead ? colors.card : unreadBackground,
        borderBottomColor: colors.border,
      }}
      android_ripple={{
        color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        borderless: true,
        radius: 20,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: getIconBackgroundColor(),
        }}
      >
        {getNotificationIcon()}
      </View>

      {/* Content */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: notification.isRead ? '500' : '600',
            color: colors.foreground,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {snippet ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: colors.secondary,
              marginBottom: 2,
            }}
            numberOfLines={2}
          >
            {snippet}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: colors.secondary,
          }}
        >
          {relativeTime}
        </Text>
      </View>

      {/* Unread indicator */}
      {!notification.isRead && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            marginLeft: 8,
          }}
        />
      )}
    </Pressable>
  );
}

// UI Spec: NotificationSkeleton — Loading placeholder
function NotificationSkeleton() {
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  return (
    <View
      className="flex-row items-start px-4 py-3 border-b"
      style={{ backgroundColor: colors.card, borderBottomColor: colors.border }}
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
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  if (type === 'logged-out') {
    return (
      <View className="flex-1 justify-center items-center px-8 py-16">
        <BellSlash size={64} color={colors.secondary} weight="regular" />
        <Text
          className="text-xl font-semibold mt-6 mb-2 text-center"
          style={{ color: colors.foreground }}
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
            style={{ backgroundColor: colors.accent }}
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
          style={{ color: colors.foreground }}
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
        style={{ color: colors.foreground }}
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
  const { themeMode, isDark } = useTheme();
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

  // Memoize theme colors - dark mode always uses AMOLED
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

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

  // Configure header
  useScreenHeader({
    title: "Notifications",
    canGoBack: false,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, []);

  // Get setActions from useHeader for dynamic updates
  const { setActions } = useHeader();

  // Define handlers before they're used in useEffect
  const handleMarkAllRead = useCallback(() => {
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
  }, [markAllAsRead]);

  const handleSettingsPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/(profile)/notification-settings' as any);
  }, [router]);

  // Use ref to track previous action keys to prevent infinite loops
  const prevActionKeysRef = useRef<string>('');

  // Update header actions when unreadCount or theme changes
  useEffect(() => {
    const themeColors = getThemeColors(themeMode, isDark);
    const accentColor = themeColors.accent;
    const secondaryColor = themeColors.secondary;
    
    // Create action key string for comparison (avoids React element reference issues)
    const actionKeys = `${unreadCount > 0}-${themeMode}-${isDark}`;
    
    // Only update if keys have actually changed
    if (prevActionKeysRef.current === actionKeys) {
      return;
    }
    
    prevActionKeysRef.current = actionKeys;
    
    const newActions = [
      unreadCount > 0 ? (
        <Pressable
          key="mark-all-read"
          onPress={handleMarkAllRead}
          className="p-2 rounded-full"
          style={{
            backgroundColor: `${accentColor}20`,
          }}
          android_ripple={{
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderless: true,
            radius: 20,
          }}
        >
          <Check size={20} color={accentColor} weight="bold" />
        </Pressable>
      ) : null,
      <Pressable
        key="settings"
        onPress={handleSettingsPress}
        className="p-2 rounded-full"
        style={{
          backgroundColor: `${secondaryColor}20`,
        }}
        android_ripple={{
          color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderless: true,
          radius: 20,
        }}
      >
        <Gear size={20} color={secondaryColor} weight="regular" />
      </Pressable>,
    ].filter(Boolean);
    
    setActions(newActions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // setActions is stable from useHeader() and doesn't need to be in deps
  }, [unreadCount, themeMode, isDark, handleMarkAllRead, handleSettingsPress]);

  // Load notifications on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      fetchNotifications();
    }
  }, [isAuthenticated, isAuthLoading, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback((notification: Notification) => {
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
  }, [router]);

  const handleMarkRead = useCallback(async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [markAsRead]);

  // Render filter chip
  const renderFilterChip = useCallback((
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
          backgroundColor: isActive ? `${colors.accent}20` : 'transparent',
          borderColor: isActive ? colors.accent : colors.border,
          marginRight: 8,
        }}
      >
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.accent : colors.foreground }}
        >
          {label}
          {count !== undefined && count > 0 && (
            <Text style={{ color: colors.secondary }}> ({count})</Text>
          )}
        </Text>
      </TouchableOpacity>
    );
  }, [typeFilter, colors]);

  // Render section header
  const renderSectionHeader = useCallback(({ section }: { section: NotificationSection }) => (
    <View className="px-4 py-2" style={{ backgroundColor: colors.background }}>
      <Text
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: colors.secondary }}
      >
        {section.title}
      </Text>
    </View>
  ), [colors]);

  // Render notification item
  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkRead={() => handleMarkRead(item.id)}
    />
  ), [handleNotificationPress, handleMarkRead]);

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
        style={[styles.container, { backgroundColor: colors.background }]}
      >
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
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View className="flex-1 justify-center items-center px-8">
          <Text
            className="text-lg font-semibold mb-2 text-center"
            style={{ color: colors.destructive }}
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
            style={{ backgroundColor: colors.accent }}
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
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <EmptyState
          type="logged-out"
          onSignIn={() => router.push('/(auth)/signin' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >

      {/* Error banner (when data exists) */}
      {hasError && notifications.length > 0 && (
        <View className="px-4 py-2 border-b" style={{ borderBottomColor: colors.border }}>
          <Text
            className="text-xs"
            style={{ color: colors.destructive }}
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
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
