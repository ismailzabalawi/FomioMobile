import { useCallback, useRef } from 'react';
import { discourseApi } from '../discourseApi';
import { enrichUserData, extractUserRoles, type UserData } from '../utils/user-helpers';

/**
 * User cache hook for batch resolving users with caching
 * Prevents duplicate API calls and extracts user roles from groups
 */
export function useUserCache() {
  const cacheRef = useRef<Map<number, Promise<UserData>>>(new Map());
  const resolvedCacheRef = useRef<Map<number, UserData>>(new Map());

  /**
   * Get a single user by ID (with caching)
   */
  const getUser = useCallback(async (userId: number): Promise<UserData> => {
    // Check resolved cache first
    const cached = resolvedCacheRef.current.get(userId);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    const pending = cacheRef.current.get(userId);
    if (pending) {
      return pending;
    }

    // Create new request
    const userPromise = (async (): Promise<UserData> => {
      try {
        const response = await discourseApi.getUser(userId);
        if (response.success && response.data) {
          const user = response.data;
          const baseUrl = discourseApi.getBaseUrl();
          
          // Extract roles from groups
          const roles = extractUserRoles(user.groups || []);
          
          const userData: UserData = {
            id: user.id,
            name: user.name || user.username || 'Unknown User',
            username: user.username || 'unknown',
            avatar: user.avatar_template
              ? discourseApi.getAvatarUrl(user.avatar_template, 120)
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

          // Store in resolved cache
          resolvedCacheRef.current.set(userId, userData);
          return userData;
        }
      } catch (error: any) {
        // Silently handle 404s (admin endpoint not available) - this is expected
        // Only log if it's not a 404
        if (error?.status !== 404 && error?.message?.includes('404') === false) {
          console.warn('Failed to resolve user', userId, error);
        }
      }

      // Fallback - return minimal user data
      const fallbackUser: UserData = {
        id: userId,
        name: 'Unknown User',
        username: 'unknown',
        avatar: '',
      };
      
      // Store fallback in cache to avoid repeated failed requests
      resolvedCacheRef.current.set(userId, fallbackUser);
      return fallbackUser;
    })();

    // Store pending request
    cacheRef.current.set(userId, userPromise);

    // Clean up after resolution
    userPromise.finally(() => {
      cacheRef.current.delete(userId);
    });

    return userPromise;
  }, []);

  /**
   * Batch resolve multiple users
   */
  const getUsers = useCallback(
    async (userIds: number[]): Promise<Map<number, UserData>> => {
      const userMap = new Map<number, UserData>();
      const uniqueIds = Array.from(new Set(userIds));

      // Resolve all users in parallel
      const promises = uniqueIds.map(async (userId) => {
        const user = await getUser(userId);
        return { userId, user };
      });

      const results = await Promise.all(promises);
      results.forEach(({ userId, user }) => {
        userMap.set(userId, user);
      });

      return userMap;
    },
    [getUser]
  );

  /**
   * Clear cache for a specific user
   */
  const clearUser = useCallback((userId: number) => {
    cacheRef.current.delete(userId);
    resolvedCacheRef.current.delete(userId);
  }, []);

  /**
   * Clear all cache
   */
  const clearAll = useCallback(() => {
    cacheRef.current.clear();
    resolvedCacheRef.current.clear();
  }, []);

  return {
    getUser,
    getUsers,
    clearUser,
    clearAll,
  };
}

