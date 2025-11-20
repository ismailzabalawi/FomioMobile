import type { Notification } from '../../shared/useNotifications';
import type { NotificationPreferences } from '../../shared/useNotificationPreferences';

export interface NotificationSection {
  title: string;
  data: Notification[];
}

/**
 * Format relative time (e.g., "Just now", "3m", "2h", "Yesterday", "3d", "2w", "Nov 20")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks}w`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Group notifications by time period (Today, Yesterday, This week, Earlier)
 */
export function groupNotificationsByTime(
  notifications: Notification[] | undefined
): NotificationSection[] {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const sections: NotificationSection[] = [
    { title: 'Today', data: [] },
    { title: 'Yesterday', data: [] },
    { title: 'This week', data: [] },
    { title: 'Earlier', data: [] },
  ];

  notifications.forEach((notification) => {
    const notificationDate = new Date(notification.createdAt);
    const notificationDay = new Date(
      notificationDate.getFullYear(),
      notificationDate.getMonth(),
      notificationDate.getDate()
    );

    if (notificationDay.getTime() === today.getTime()) {
      sections[0].data.push(notification);
    } else if (notificationDay.getTime() === yesterday.getTime()) {
      sections[1].data.push(notification);
    } else if (notificationDate.getTime() >= thisWeek.getTime()) {
      sections[2].data.push(notification);
    } else {
      sections[3].data.push(notification);
    }
  });

  // Remove empty sections
  return sections.filter((section) => section.data.length > 0);
}

/**
 * Filter notifications by type
 */
export function filterNotificationsByType(
  notifications: Notification[],
  typeFilter: 'all' | 'replies' | 'mentions' | 'system'
): Notification[] {
  if (typeFilter === 'all') {
    return notifications;
  }

  const typeMap: Record<string, string[]> = {
    replies: ['replied', 'quoted'],
    mentions: ['mentioned', 'group_mentioned'],
    system: [
      'bookmark_reminder',
      'granted_badge',
      'group_message_summary',
      'admin_message',
      'post_approved',
    ],
  };

  const types = typeMap[typeFilter] || [];
  return notifications.filter((n) => types.includes(n.type));
}

/**
 * Get notification type category for filtering
 */
export function getNotificationTypeCategory(
  type: string
): 'replies' | 'mentions' | 'system' | 'other' {
  if (['replied', 'quoted'].includes(type)) {
    return 'replies';
  }
  if (['mentioned', 'group_mentioned'].includes(type)) {
    return 'mentions';
  }
  if (
    [
      'bookmark_reminder',
      'granted_badge',
      'group_message_summary',
      'admin_message',
      'post_approved',
    ].includes(type)
  ) {
    return 'system';
  }
  return 'other';
}

/**
 * Filter notifications based on user preferences
 * Returns only notifications that match enabled categories
 * Unknown types are always included (never hidden)
 */
export function filterNotificationsByPreferences(
  notifications: Notification[],
  preferences: NotificationPreferences
): Notification[] {
  return notifications.filter(({ type }) => {
    // Replies & Quotes
    if (['replied', 'quoted'].includes(type)) {
      return preferences.replies;
    }

    // Mentions
    if (['mentioned', 'group_mentioned'].includes(type)) {
      return preferences.mentions;
    }

    // Private Messages
    if (['private_message', 'invited_to_private_message'].includes(type)) {
      return preferences.privateMessages;
    }

    // Likes
    if (['liked', 'liked_consolidated'].includes(type)) {
      return preferences.likes;
    }

    // Badges
    if (type === 'granted_badge') {
      return preferences.badges;
    }

    // System notifications
    if (
      [
        'bookmark_reminder',
        'group_message_summary',
        'admin_message',
        'post_approved',
      ].includes(type)
    ) {
      return preferences.system;
    }

    // Unknown notification types: Always allowed
    return true;
  });
}

/**
 * Get notification display title based on type and data
 * Uses Discourse notification data structure: display_username, topic_title, etc.
 */
export function getNotificationTitle(notification: Notification): string {
  const { type, data } = notification;
  const username = data?.display_username || 'Someone';
  const topicTitle = data?.topic_title;

  // Build contextual titles based on notification type
  switch (type) {
    case 'replied':
      return topicTitle
        ? `${username} replied to "${topicTitle}"`
        : `${username} replied to your Byte`;

    case 'mentioned':
      return topicTitle
        ? `${username} mentioned you in "${topicTitle}"`
        : `${username} mentioned you`;

    case 'quoted':
      return topicTitle
        ? `${username} quoted you in "${topicTitle}"`
        : `${username} quoted you`;

    case 'liked':
      return topicTitle
        ? `${username} liked "${topicTitle}"`
        : `${username} liked your Byte`;

    case 'liked_consolidated':
      return topicTitle
        ? `Multiple people liked "${topicTitle}"`
        : 'Multiple people liked your Byte';

    case 'group_mentioned':
      return topicTitle
        ? `You were mentioned in "${topicTitle}"`
        : 'You were mentioned in a group';

    case 'invited_to_private_message':
      return `${username} invited you to a private message`;

    case 'private_message':
      return topicTitle ? `New message: "${topicTitle}"` : 'New private message';

    case 'bookmark_reminder':
      return topicTitle ? `Reminder: "${topicTitle}"` : 'Bookmark reminder';

    case 'granted_badge':
      const badgeName = data?.badge_name || 'a badge';
      return `You earned ${badgeName}`;

    case 'group_message_summary':
      return `New messages in ${data?.group_name || 'group'}`;

    case 'admin_message':
      return data?.topic_title || 'Admin message';

    case 'invited_to_topic':
      return topicTitle
        ? `${username} invited you to "${topicTitle}"`
        : `${username} invited you to a topic`;

    case 'post_approved':
      return topicTitle
        ? `Your post in "${topicTitle}" was approved`
        : 'Your post was approved';

    case 'invitee_accepted':
      return `${username} accepted your invitation`;

    case 'posted':
      return topicTitle
        ? `${username} posted in "${topicTitle}"`
        : `${username} posted`;

    case 'moved_post':
      return topicTitle ? `Post moved: "${topicTitle}"` : 'Post was moved';

    case 'linked':
      return topicTitle
        ? `${username} linked to "${topicTitle}"`
        : `${username} linked to your post`;

    case 'watching_first_post':
      return topicTitle
        ? `New topic: "${topicTitle}"`
        : 'New topic in watched category';

    case 'code_review_commit_approved':
      return 'Code review commit approved';

    case 'membership_request_accepted':
      return `Membership request accepted for ${data?.group_name || 'group'}`;

    case 'membership_request_consolidated':
      return `Membership requests in ${data?.group_name || 'group'}`;

    case 'votes_released':
      return topicTitle
        ? `Votes released for "${topicTitle}"`
        : 'Votes released';

    case 'custom':
      return data?.title || data?.topic_title || 'Custom notification';

    default:
      // Fallback: try to construct from available data
      if (topicTitle) {
        return topicTitle;
      }
      if (username && username !== 'Someone') {
        return `${username} notified you`;
      }
      return 'Notification';
  }
}

/**
 * Get notification snippet (secondary line)
 * Extracts from Discourse data structure
 */
export function getNotificationSnippet(notification: Notification): string {
  const { data, type, message } = notification;

  // For most notifications, show excerpt or topic title
  if (data?.excerpt) {
    // Clean HTML tags if present (Discourse may return HTML)
    const cleanExcerpt = data.excerpt
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    return cleanExcerpt.length > 100
      ? cleanExcerpt.substring(0, 100) + '...'
      : cleanExcerpt;
  }

  // For badge notifications, show badge description
  if (type === 'granted_badge' && data?.badge_description) {
    return data.badge_description;
  }

  // For group messages, show group name
  if (type === 'group_message_summary' && data?.group_name) {
    return `Messages from ${data.group_name}`;
  }

  // Fallback to topic title
  if (data?.topic_title) {
    return data.topic_title;
  }

  // Last resort: use message if available (clean HTML)
  if (message) {
    const cleanMessage = message
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    return cleanMessage.length > 100
      ? cleanMessage.substring(0, 100) + '...'
      : cleanMessage;
  }

  return '';
}

/**
 * Get navigation target for a notification based on its type
 * Returns the route path and any query parameters
 * Maps notification types to appropriate screens in the app
 */
export function getNotificationNavigationTarget(
  notification: Notification
): { path: string; params?: Record<string, string | number> } | null {
  const { type, topicId, postNumber, userId, data } = notification;

  switch (type) {
    // Byte/Topic-related notifications → navigate to Byte
    case 'replied':
    case 'quoted':
    case 'mentioned':
    case 'group_mentioned':
    case 'liked':
    case 'liked_consolidated':
    case 'linked':
    case 'votes_released':
      if (topicId) {
        const path = `/feed/${topicId}`;
        const params = postNumber ? { postNumber: postNumber.toString() } : undefined;
        return { path, params };
      }
      return null;

    // Private messages → navigate to message/Byte
    case 'private_message':
    case 'invited_to_private_message':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // User-related notifications → navigate to profile
    case 'invitee_accepted':
      // Navigate to profile of user who accepted
      // Prefer username from data (display_username or original_username) as it's more reliable
      const acceptedUsername = data?.display_username || data?.original_username;
      if (acceptedUsername) {
        return { path: '/(profile)/index', params: { username: acceptedUsername } };
      }
      // Fallback to userId if username not available
      if (userId) {
        return { path: '/(profile)/index', params: { userId: userId.toString() } };
      }
      return null;

    // Badge notifications → navigate to current user's profile (to see badges)
    case 'granted_badge':
      return { path: '/(profile)/index' }; // Current user's profile to see badges

    // Group-related notifications → navigate to profile or could be category
    case 'membership_request_accepted':
    case 'membership_request_consolidated':
      // For now, navigate to current user's profile
      // Could navigate to group/category page if it exists in the future
      return { path: '/(profile)/index' };

    // System/Admin notifications
    case 'new_features':
      // Navigate to settings (could create a dedicated "What's new" page later)
      return { path: '/(profile)/settings' };

    case 'admin_message':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      // Fallback to settings if no topic
      return { path: '/(profile)/settings' };

    // Topic/Byte reminders → navigate to Byte
    case 'bookmark_reminder':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Event notifications → navigate to Byte (event topic)
    case 'event_reminder':
    case 'event_invitation':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Invitation to topic → navigate to Byte
    case 'invited_to_topic':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Post approval → navigate to approved Byte
    case 'post_approved':
      if (topicId) {
        return {
          path: `/feed/${topicId}`,
          params: postNumber ? { postNumber: postNumber.toString() } : undefined,
        };
      }
      return null;

    // Watching notifications → navigate to Byte
    case 'watching_first_post':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Code review → navigate to Byte
    case 'code_review_commit_approved':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Custom notifications → try to navigate to topic if available
    case 'custom':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Posted, moved_post, etc. → navigate to Byte
    case 'posted':
    case 'moved_post':
      if (topicId) {
        return { path: `/feed/${topicId}` };
      }
      return null;

    // Default: try topicId, then username/userId, then null
    default:
      if (topicId) {
        return {
          path: `/feed/${topicId}`,
          params: postNumber ? { postNumber: postNumber.toString() } : undefined,
        };
      }
      // Try username first (more reliable), then userId
      const defaultUsername = data?.display_username;
      if (defaultUsername) {
        return { path: '/(profile)/index', params: { username: defaultUsername } };
      }
      if (userId) {
        return { path: '/(profile)/index', params: { userId: userId.toString() } };
      }
      return null;
  }
}

