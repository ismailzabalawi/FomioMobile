// Hook to fetch topics where user provided accepted solution
// Public - available for all profiles

import { useUserActivity } from './useUserActivity';

export function useUserSolved(username: string | undefined) {
  return useUserActivity(username, 'solved');
}

