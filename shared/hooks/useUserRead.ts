// Hook to fetch topics user has read
// Only available for own profile

import { useUserActivity } from './useUserActivity';

export function useUserRead(username: string | undefined) {
  return useUserActivity(username, 'read');
}

