import { useState, useEffect, useCallback, useMemo } from 'react';
import { discourseApi } from './discourseApi';
import { onAuthEvent } from './auth-events';

/**
 * Notification type matching Discourse API structure
 * Maps Discourse notification data to app-friendly format
 */
export interface Notification {
  id: number;
  type: string; // e.g., 'replied', 'mentioned', 'liked', 'quoted', etc.
  isRead: boolean;
  createdAt: string; // ISO date string
  topicId?: number;
  postNumber?: number;
  userId?: number;
  data?: {
    display_username?: string;
    original_username?: string;
    topic_title?: string;
    excerpt?: string;
    badge_name?: string;
    badge_description?: string;
    group_name?: string;
    [key: string]: any; // Allow other Discourse data fields
  };
  message?: string; // Raw notification message from Discourse
  title?: string; // Optional title (for some notification types)
}

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
  notifications: Notification[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: number;
}

/**
 * Normalize Discourse notification_type (numeric ID) to string type
 * Based on Discourse notification.rb model
 * Maps numeric IDs (1, 2, 3...) to string types ('mentioned', 'replied', etc.)
 */
function normalizeNotificationType(notificationType: number | string | undefined): string {
  // If already a string, return as-is (already normalized)
  if (typeof notificationType === 'string') {
    return notificationType;
  }

  // If undefined or not a number, return 'unknown'
  if (typeof notificationType !== 'number') {
    return 'unknown';
  }

  // Map numeric IDs to string types (from Discourse notification.rb)
  // Reference: https://github.com/discourse/discourse/blob/main/app/models/notification.rb
  const typeMap: Record<number, string> = {
    1: 'mentioned',
    2: 'replied',
    3: 'quoted',
    4: 'edited',
    5: 'liked',
    6: 'private_message',
    7: 'invited_to_private_message',
    8: 'invitee_accepted',
    9: 'posted',
    10: 'moved_post',
    11: 'linked',
    12: 'granted_badge',
    13: 'invited_to_topic',
    14: 'custom',
    15: 'group_mentioned',
    16: 'group_message_summary',
    17: 'watching_first_post',
    18: 'topic_reminder',
    19: 'liked_consolidated',
    20: 'post_approved',
    21: 'code_review_commit_approved',
    22: 'membership_request_accepted',
    23: 'membership_request_consolidated',
    24: 'bookmark_reminder',
    25: 'reaction',
    26: 'votes_released',
    27: 'event_reminder',
    28: 'event_invitation',
    29: 'new_features',
  };

  return typeMap[notificationType] || 'unknown';
}

/**
 * Transform Discourse notification to app Notification format
 */
function transformDiscourseNotification(discourseNotif: any): Notification {
  return {
    id: discourseNotif.id || discourseNotif.notification_id,
    type: normalizeNotificationType(discourseNotif.notification_type || discourseNotif.type),
    isRead: discourseNotif.read || false,
    createdAt: discourseNotif.created_at || discourseNotif.createdAt || new Date().toISOString(),
    topicId: discourseNotif.topic_id,
    postNumber: discourseNotif.post_number,
    userId: discourseNotif.user_id,
    data: discourseNotif.data || {},
    message: discourseNotif.message,
    title: discourseNotif.title,
  };
}

/**
 * useNotifications hook
 * 
 * Fetches and manages notifications from Discourse API
 * Auto-refreshes on auth events (sign-in, token refresh)
 * 
 * Architecture: Pure hook, no preferences filtering
 * Preferences filtering happens at UI layer (see app/(tabs)/notifications.tsx)
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Load notifications from Discourse API
   */
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);

      const response = await discourseApi.getNotifications();

      if (response.success && response.data) {
        // Discourse returns notifications in different formats
        // Handle both array and object with notifications array
        let rawNotifications: any[] = [];
        
        if (Array.isArray(response.data)) {
          rawNotifications = response.data;
        } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
          rawNotifications = response.data.notifications;
        } else if (response.data.notification && Array.isArray(response.data.notification)) {
          rawNotifications = response.data.notification;
        }

        const transformed = rawNotifications.map(transformDiscourseNotification);
        
        // Sort by created date (newest first)
        transformed.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        setNotifications(transformed);
      } else {
        throw new Error(response.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load notifications';
      setHasError(true);
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await discourseApi.markNotificationAsRead(notificationId);

      if (response.success) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      } else {
        console.error('Failed to mark notification as read:', response.error);
        // Revert optimistic update on error
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update on error
      await loadNotifications();
    }
  }, [loadNotifications]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await discourseApi.markAllNotificationsAsRead();

      if (response.success) {
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } else {
        console.error('Failed to mark all notifications as read:', response.error);
        // Revert optimistic update on error
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert optimistic update on error
      await loadNotifications();
    }
  }, [loadNotifications]);

  /**
   * Calculate unread count
   */
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  /**
   * Load notifications on mount
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Auto-refresh on auth events
   */
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'auth:signed-in' || event === 'auth:refreshed') {
        loadNotifications();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  return {
    notifications,
    isLoading,
    hasError,
    errorMessage,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}

