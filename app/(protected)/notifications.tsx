import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { 
  Bell, 
  BellSlash, 
  Check, 
  Trash, 
  Heart, 
  ChatCircle, 
  Share, 
  UserPlus,
  At,
  Bookmark
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useNotifications, Notification } from '../../shared/useNotifications';
import { onAuthEvent } from '../../shared/auth-events';

function NotificationItem({ 
  notification, 
  onPress, 
  onMarkRead, 
  onDelete 
}: { 
  notification: Notification; 
  onPress: () => void; 
  onMarkRead: () => void; 
  onDelete: () => void; 
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    unreadBackground: isAmoled ? '#0a0a0a' : (isDark ? '#374151' : '#f8fafc'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#26A69A' : '#009688',
    success: isDark ? '#10b981' : '#059669',
    warning: isDark ? '#f59e0b' : '#d97706',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'liked':
        return <Heart size={20} color={colors.error} weight="fill" />;
      case 'replied':
        return <ChatCircle size={20} color={colors.accent} weight="fill" />;
      case 'mentioned':
        return <At size={20} color={colors.warning} weight="fill" />;
      case 'invited_to_private_message':
        return <UserPlus size={20} color={colors.success} weight="fill" />;
      case 'bookmark_reminder':
        return <Bookmark size={20} color={colors.accent} weight="fill" />;
      case 'quoted':
        return <Share size={20} color={colors.warning} weight="fill" />;
      default:
        return <Bell size={20} color={colors.secondary} weight="regular" />;
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'liked':
        return colors.error;
      case 'replied':
        return colors.accent;
      case 'mentioned':
        return colors.warning;
      case 'invited_to_private_message':
        return colors.success;
      case 'bookmark_reminder':
        return colors.accent;
      case 'quoted':
        return colors.warning;
      default:
        return colors.secondary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: notification.isRead ? colors.background : colors.unreadBackground,
          borderColor: colors.border 
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor()}20` }]}>
          {getNotificationIcon()}
        </View>
        
        <View style={styles.notificationText}>
          <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={[styles.notificationMessage, { color: colors.secondary }]} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={[styles.timestamp, { color: colors.secondary }]}>
            {new Date(notification.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.notificationActions}>
          {!notification.isRead && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={onMarkRead}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Mark as read"
            >
              <Check size={16} color="#ffffff" weight="bold" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={onDelete}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Delete notification"
          >
            <Trash size={16} color="#ffffff" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { 
    notifications, 
    isLoading: loading, 
    hasError: hasError, 
    errorMessage, 
    loadNotifications: fetchNotifications, 
    markAsRead 
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [permission, setPermission] = useState<string | null>(null);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#26A69A' : '#009688',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        fetchNotifications();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [fetchNotifications]);

  // Check push permissions
  useEffect(() => {
    (async () => {
      const settings = await Notifications.getPermissionsAsync();
      setPermission(settings.status);
    })();
  }, []);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Configure header
  useScreenHeader({
    title: "Notifications",
    canGoBack: false,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  async function requestPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status);
  }

  const handleNotificationPress = (notification: Notification) => {
    console.log('Notification pressed:', notification.id);
    if (notification.data?.postId) {
      console.log('Navigate to post:', notification.data.postId);
    } else if (notification.data?.userId) {
      console.log('Navigate to user:', notification.data.userId);
    }
  };

  const handleMarkRead = (notificationId: number) => {
    markAsRead(notificationId);
  };

  const handleDelete = (notificationId: number) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            console.log('Delete notification:', notificationId);
          }
        },
      ]
    );
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark Read', 
          onPress: () => {
            notifications.forEach(notification => markAsRead(notification.id));
          }
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive', 
          onPress: () => {
            // TODO: Implement clear all functionality
          }
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderFilterButton = (filterType: 'all' | 'unread' | 'read', label: string, count?: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: filter === filterType ? colors.primary : 'transparent',
          borderColor: colors.border 
        }
      ]}
      onPress={() => setFilter(filterType)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label} filter`}
    >
      <Text style={[
        styles.filterButtonText,
        { color: filter === filterType ? '#ffffff' : colors.text }
      ]}>
        {label}
        {count !== undefined && count > 0 && (
          <Text style={[styles.filterCount, { color: filter === filterType ? '#ffffff' : colors.primary }]}>
            {' '}({count})
          </Text>
        )}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BellSlash size={64} color={colors.secondary} weight="regular" />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filter === 'all' ? 'No notifications yet' : 
         filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.secondary }]}>
        {filter === 'all' ? 'When you receive notifications, they\'ll appear here' :
         filter === 'unread' ? 'All caught up! No unread notifications' : 'No read notifications to show'}
      </Text>
    </View>
  );

  // Show push permission prompt if not granted
  if (permission !== null && permission !== 'granted') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Bell size={64} color={colors.primary} weight="duotone" />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Enable notifications
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.secondary }]}>
            Turn on push notifications to get mentions, replies, and likes in real time.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.permissionButtonText}>Allow Notifications</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load notifications</Text>
          <Text style={[styles.errorText, { color: colors.secondary }]}>
            {errorMessage || 'Something went wrong. Please try again.'}
          </Text>
          <TouchableOpacity 
            onPress={fetchNotifications} 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Retry loading notifications"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Actions */}
      {(unreadCount > 0 || notifications.length > 0) && (
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleMarkAllRead}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Check size={20} color={colors.primary} weight="regular" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleClearAll}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear all notifications"
            >
              <Trash size={20} color={colors.error} weight="regular" />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', notifications.length)}
        {renderFilterButton('unread', 'Unread', unreadCount)}
        {renderFilterButton('read', 'Read', notifications.filter(n => n.isRead).length)}
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onMarkRead={() => handleMarkRead(item.id)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  headerAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 8,
  },
  notificationItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
