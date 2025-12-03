import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

/**
 * Navigate to a user's profile with haptic feedback
 * @param username - The username to navigate to (required)
 */
export function goToProfile(username: string | null | undefined): void {
  if (!username) {
    console.warn('goToProfile: username is required');
    return;
  }
  
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  router.push(`/profile/${username}`);
}

