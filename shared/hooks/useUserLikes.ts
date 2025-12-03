// Hook to fetch posts/topics user has liked
// Only available for own profile

import { useUserActivity } from './useUserActivity';

export function useUserLikes(username: string | undefined) {
  return useUserActivity(username, 'likes');
}

