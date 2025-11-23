/**
 * User helper utilities for building user maps and extracting user data
 */

export interface UserData {
  id: number;
  name: string;
  username: string;
  avatar: string;
  verified?: boolean;
  admin?: boolean;
  moderator?: boolean;
  groups?: Array<{ id: number; name: string; flair_url?: string }>;
}

/**
 * Build a user map from Discourse users array
 * @param users - Array of Discourse user objects from API response
 * @param baseUrl - Base URL for building avatar URLs
 */
export function buildUserMap(users: any[], baseUrl: string = ''): Map<number, UserData> {
  const userMap = new Map<number, UserData>();
  
  if (!users || !Array.isArray(users)) {
    return userMap;
  }

  for (const user of users) {
    if (!user || !user.id) continue;
    
    const roles = extractUserRoles(user.groups || []);
    
    userMap.set(user.id, {
      id: user.id,
      name: user.name || user.username || 'Unknown User',
      username: user.username || 'unknown',
      avatar: user.avatar_template
        ? buildAvatarUrl(user.avatar_template, 120, baseUrl)
        : '',
      verified: roles.verified,
      admin: roles.admin,
      moderator: roles.moderator,
      groups: user.groups?.map((g: any) => ({
        id: g.id,
        name: g.name,
        flair_url: g.flair_url,
      })),
    });
  }

  return userMap;
}

/**
 * Extract user IDs from topics array (from posters field)
 * @param topics - Array of topic objects from Discourse API
 */
export function extractUserIdsFromTopics(topics: any[]): number[] {
  const userIds = new Set<number>();
  
  if (!topics || !Array.isArray(topics)) {
    return [];
  }

  for (const topic of topics) {
    if (topic?.posters && Array.isArray(topic.posters)) {
      for (const poster of topic.posters) {
        if (poster?.user_id) {
          userIds.add(poster.user_id);
        }
      }
    }
    // Also check for created_by or last_poster
    if (topic?.details?.created_by?.id) {
      userIds.add(topic.details.created_by.id);
    }
    if (topic?.last_poster?.id) {
      userIds.add(topic.last_poster.id);
    }
  }

  return Array.from(userIds);
}

/**
 * Enrich user data with avatar URL and role information
 * @param user - Discourse user object
 * @param baseUrl - Base URL for building avatar URLs
 */
export function enrichUserData(user: any, baseUrl: string = ''): UserData {
  if (!user) {
    return {
      id: 0,
      name: 'Unknown User',
      username: 'unknown',
      avatar: '',
    };
  }

  const roles = extractUserRoles(user.groups || []);

  return {
    id: user.id || 0,
    name: user.name || user.username || 'Unknown User',
    username: user.username || 'unknown',
    avatar: user.avatar_template
      ? buildAvatarUrl(user.avatar_template, 120, baseUrl)
      : '',
    verified: roles.verified,
    admin: roles.admin,
    moderator: roles.moderator,
    groups: user.groups?.map((g: any) => ({
      id: g.id,
      name: g.name,
      flair_url: g.flair_url,
    })),
  };
}

/**
 * Extract user roles from Discourse groups array
 * Maps group names to role flags (admin, moderator, verified)
 */
export function extractUserRoles(
  groups: any[]
): { admin: boolean; moderator: boolean; verified: boolean } {
  if (!groups || !Array.isArray(groups)) {
    return { admin: false, moderator: false, verified: false };
  }

  const groupNames = groups.map((g) => (g.name || '').toLowerCase());
  
  return {
    admin: groupNames.includes('admins'),
    moderator: groupNames.includes('moderators'),
    verified: groupNames.includes('verified'),
  };
}

/**
 * Build avatar URL (re-exported from content-helpers for convenience)
 */
function buildAvatarUrl(template: string, size: number = 120, baseUrl: string = ''): string {
  if (!template) return '';
  const url = template.replace('{size}', size.toString());
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return baseUrl ? `${baseUrl}${url}` : url;
}

