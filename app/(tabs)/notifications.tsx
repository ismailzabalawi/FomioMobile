import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Star,
  Bookmark,
  ArrowRight,
  Clock
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { useNotifications, Notification } from '../../shared/useNotifications';
import { useAuth } from '../../shared/useAuth';
import { getNotifications } from '../../lib/discourse';
import { useEffect, useState } from 'react';

interface NotificationSection {
  title: string;
  data: Notification[];
}

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
    accent: isDark ? '#3b82f6' : '#0ea5e9',
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

function NotificationSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    text: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function NotificationsScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { 
    notifications, 
    isLoading: isNotificationsLoading, 
    hasError, 
    errorMessage, 
    loadNotifications: fetchNotifications, 
    markAsRead 
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Load notifications if authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      getNotifications()
        .then((data) => {
          // Map Discourse notifications to app format if needed
          console.log('Notifications loaded:', data);
        })
        .catch((err) => {
          console.error('Failed to load notifications:', err);
        });
    }
  }, [isAuthenticated, isAuthLoading]);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('Notification pressed:', notification.id);
    // Navigate to the relevant content
    if (notification.data?.postId) {
      // Navigate to post
      console.log('Navigate to post:', notification.data.postId);
    } else if (notification.data?.userId) {
      // Navigate to user profile
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
            // TODO: Implement delete functionality
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
            // In a real app, you'd call a clear all endpoint
            // For now, we'll just reset the local state
            // setNotifications([]); 
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

  if (isNotificationsLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title="Notifications" 
          canGoBack={false}
          withSafeTop={false}
          tone="bg"
        />
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
        <AppHeader 
          title="Notifications" 
          canGoBack={false}
          withSafeTop={false}
          tone="bg"
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Error loading notifications: {errorMessage}</Text>
          <TouchableOpacity onPress={fetchNotifications} style={styles.retryButton}>
            <Text style={[styles.retryButtonText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader 
        title="Notifications" 
        canGoBack={false}
        withSafeTop={false}
      />
      
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 16,
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
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 