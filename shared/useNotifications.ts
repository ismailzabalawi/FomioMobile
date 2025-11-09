import { useState, useEffect, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';
import { onAuthEvent } from './auth-events';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  data: any;
  postNumber?: number;
  topicId?: number;
  userId?: number;
}

export interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  unreadCount: number;
  totalCount: number;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    isLoading: false,
    hasError: false,
    unreadCount: 0,
    totalCount: 0,
  });

  const loadNotifications = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
      }));

      const response = await discourseApi.getNotifications();
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load notifications');
      }

      const notifications = response.data.notifications.map((notif: any) => ({
        id: notif.id,
        type: notif.notification_type,
        title: notif.data?.title || 'Notification',
        message: notif.data?.message || '',
        createdAt: notif.created_at,
        isRead: notif.read,
        data: notif.data,
        postNumber: notif.post_number,
        topicId: notif.topic_id,
        userId: notif.user_id,
      }));

      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

      setState(prev => ({
        ...prev,
        notifications,
        isLoading: false,
        unreadCount,
        totalCount: notifications.length,
      }));

    } catch (error) {
      logger.error('Failed to load notifications', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to load notifications',
      }));
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await discourseApi.markNotificationAsRead(notificationId);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await discourseApi.markAllNotificationsAsRead();
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      }
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to auth events for auto-refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((e) => {
      if (e === 'auth:signed-in' || e === 'auth:refreshed') {
        loadNotifications();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  return {
    ...state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
} 