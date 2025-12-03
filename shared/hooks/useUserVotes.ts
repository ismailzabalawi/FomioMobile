// Hook to fetch votes cast by user
// Only available for own profile (if voting plugin enabled)

import { useUserActivity } from './useUserActivity';

export function useUserVotes(username: string | undefined) {
  return useUserActivity(username, 'votes');
}

