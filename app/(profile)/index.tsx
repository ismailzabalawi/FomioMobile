// MyProfile Screen - Twitter/X-style tabbed layout
// Uses ProfileTabView for consistent experience

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { SignIn } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { useDiscourseUser } from '@/shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { ProfileTabView, ProfileMessageCard } from '@/components/profile';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { getTokens } from '@/shared/design/tokens';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';

export default function ProfileScreen(): React.ReactElement {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const { isAuthenticated, isLoading: authLoading, user: authUser } = useAuth();
  const { user, loading: userLoading, error: userError, refreshUser } =
    useDiscourseUser(authUser?.username);
  const { scrollY, setUpHandler } = useFluidNav();
  const containerRef = useRef<any>(null);

  const { setHeader, resetHeader } = useHeader();

  // Memoize design tokens - dark mode always uses AMOLED
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const backgroundColor = mode === 'dark' ? '#000000' : '#f8fafc';

  // Helper to safely trigger haptics (guarded to prevent errors on simulators/unsupported devices)
  const triggerHaptics = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Silently ignore haptic errors (simulators, unsupported devices)
    }
  }, []);

  // Refresh user data on focus only if stale (older than 30 seconds)
  // This prevents unnecessary API calls on every screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        // Only refresh if data is stale (older than 30 seconds)
        // Check if user object has a timestamp, otherwise refresh
        const lastRefresh = (user as any)._lastRefreshed || 0;
        const now = Date.now();
        const STALE_THRESHOLD = 30000; // 30 seconds
        
        if (now - lastRefresh > STALE_THRESHOLD) {
          refreshUser();
        }
      } else if (isAuthenticated && !user) {
        // If authenticated but no user data, always refresh
        refreshUser();
      }
    }, [isAuthenticated, refreshUser, user])
  );

  const handleSignIn = useCallback(async () => {
    await triggerHaptics();
    // Type-safe route: expo-router will validate this route at compile time
    router.push('/(auth)/signin');
  }, [triggerHaptics]);

  // Configure header - use useFocusEffect to ensure header is set when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setHeader({
        title: "Profile",
        canGoBack: false,
        withSafeTop: false,
        tone: "bg",
        extendToStatusBar: true,
      });

      return () => {
        resetHeader();
      };
    }, [setHeader, resetHeader])
  );

  // Fluid nav: Scroll-to-top handler
  const handleScrollToTop = useCallback(() => {
    console.log('[Profile] Scroll-to-top handler called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (containerRef.current) {
      console.log('[Profile] containerRef.current exists:', !!containerRef.current);
      console.log('[Profile] Available methods:', Object.keys(containerRef.current));
      try {
        // react-native-collapsible-tab-view's setIndex method scrolls to top
        // when called with the current tab index
        const currentIndex = containerRef.current.getCurrentIndex?.();
        console.log('[Profile] Current index:', currentIndex);
        if (currentIndex !== undefined && currentIndex !== null) {
          console.log('[Profile] Using setIndex with current index:', currentIndex);
          const result = containerRef.current.setIndex?.(currentIndex);
          console.log('[Profile] setIndex result:', result);
        } else {
          // Fallback: Try to get focused tab and jump to it
          const focusedTab = containerRef.current.getFocusedTab?.();
          console.log('[Profile] Focused tab:', focusedTab);
          if (focusedTab) {
            console.log('[Profile] Using jumpToTab with focused tab:', focusedTab);
            containerRef.current.jumpToTab?.(focusedTab);
          } else {
            console.warn('[Profile] Could not determine current tab, trying setIndex(0)');
            containerRef.current.setIndex?.(0);
          }
        }
      } catch (error) {
        console.error('[Profile] Error scrolling to top:', error);
      }
    } else {
      console.warn('[Profile] containerRef.current is null');
    }
  }, []);

  // Share scroll position with fluid nav and keep scroll-to-top handler accessible
  useEffect(() => {
    console.log('[Profile] Registering scroll-to-top handler');
    setUpHandler(handleScrollToTop);
    return () => {
      console.log('[Profile] Clearing scroll-to-top handler');
      setUpHandler(null);
    };
  }, [handleScrollToTop, setUpHandler]);

  // Unified safe area edges for all states to prevent background jumps
  const safeAreaEdges = ['top', 'bottom', 'left', 'right'] as const;

  // Reset shared scroll on mount so nav bar starts composed on profile
  useEffect(() => {
    scrollY.value = 0;
  }, [scrollY]);

  // Show loading state
  if (authLoading || (isAuthenticated && userLoading && !user)) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={safeAreaEdges}
      >
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Show error state
  if (userError && isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={safeAreaEdges}
      >
        <ProfileMessageCard
          icon="😕"
          title="Failed to load profile"
          body={userError || 'Please check your connection and try again.'}
          primaryAction={{
            label: 'Retry',
            onPress: refreshUser,
            accessibilityHint: 'Retry loading your profile data',
          }}
          mode={mode}
        />
      </SafeAreaView>
    );
  }

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={safeAreaEdges}
      >
        <ProfileMessageCard
          icon={<SignIn size={40} color={tokens.colors.muted} weight="regular" />}
          title="Sign in to view your profile"
          body="Access your activity, drafts, bookmarks, and more."
          primaryAction={{
            label: 'Sign In',
            onPress: handleSignIn,
            accessibilityHint: 'Navigate to sign in page',
          }}
          mode={mode}
        />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={safeAreaEdges}
      >
        <View 
          className="flex-1 items-center justify-center"
          style={{ backgroundColor }}
        >
          <ActivityIndicator size="large" color={tokens.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={safeAreaEdges}
    >
      <ProfileTabView
        user={user}
        isOwnProfile={true}
        isAuthenticated={isAuthenticated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
