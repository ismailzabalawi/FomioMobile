/**
 * useNotifications Hook - Notifications data fetching with TanStack Query
 * 
 * Uses useQuery for notifications data with short stale time since
 * notifications are time-sensitive.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discourseApi } from './discourseApi';
import { onAuthEvent } from './auth-events';
import { queryKeys } from './query-client';

/**
 * Notification type matching Discourse API structure
 */
export interface Notification {
  id: number;
  type: string;
  isRead: boolean;
  createdAt: string;
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
    [key: string]: any;
  };
  message?: string;
  title?: string;
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
 * Normalize Discourse notification_type to string type
 */
function normalizeNotificationType(notificationType: number | string | undefined): string {
  if (typeof notificationType === 'string') {
    return notificationType;
  }

  if (typeof notificationType !== 'number') {
    return 'unknown';
  }

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
 * Fetch notifications from API
 */
async function fetchNotifications(): Promise<Notification[]> {
  const response = await discourseApi.getNotifications();

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load notifications');
  }

  // Handle different Discourse response formats
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

  return transformed;
}

/**
 * useNotifications hook with TanStack Query
 * 
 * Provides notifications data with caching and short stale time.
 * Notifications are time-sensitive so we refetch frequently.
 */
export function useNotifications(): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const notificationsQueryKey = queryKeys.notifications();

  const {
    data: notifications = [],
    isLoading: isQueryLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    staleTime: 30 * 1000, // 30 seconds - notifications are time-sensitive
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchInterval: 60 * 1000, // Poll every minute when app is active
  });

  // Mark as read mutation with optimistic update
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await discourseApi.markNotificationAsRead(notificationId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationsQueryKey);

      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)) ?? []
      );

      return { previousNotifications };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationsQueryKey, context.previousNotifications);
      }
    },
  });

  // Mark all as read mutation with optimistic update
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await discourseApi.markAllNotificationsAsRead();
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationsQueryKey);

      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (old) =>
        old?.map((n) => ({ ...n, isRead: true })) ?? []
      );

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationsQueryKey, context.previousNotifications);
      }
    },
  });

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'auth:signed-in' || event === 'auth:refreshed') {
        queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, notificationsQueryKey]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        await markAsReadMutation.mutateAsync(notificationId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [markAsReadMutation]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [markAllAsReadMutation]);

  // Calculate unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Compute states for backward compatibility
  const isLoading = isQueryLoading && notifications.length === 0;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    notifications,
    isLoading,
    hasError: !!error,
    errorMessage,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}
