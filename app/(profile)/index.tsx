// MyProfile Screen - Twitter/X-style tabbed layout
// Uses ProfileTabView for consistent experience

import React, { useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Gear, SignIn } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { useDiscourseUser } from '@/shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { ProfileTabView, ProfileMessageCard } from '@/components/profile';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { getThemeColors } from '@/shared/theme-constants';

export default function ProfileScreen(): React.ReactElement {
  const { themeMode, isDark } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError, refreshUser } =
    useDiscourseUser();

  const { setHeader, resetHeader, setActions } = useHeader();

  // Memoize theme colors - dark mode always uses AMOLED
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  // Helper to safely trigger haptics (guarded to prevent errors on simulators/unsupported devices)
  const triggerHaptics = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Silently ignore haptic errors (simulators, unsupported devices)
    }
  }, []);

  // Refresh user data on focus to keep header/actions and data fresh
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        refreshUser();
      }
    }, [isAuthenticated, refreshUser])
  );

  const handleSettings = useCallback(async () => {
    await triggerHaptics();
    // Type-safe route: expo-router will validate this route at compile time
    router.push('/(profile)/settings');
  }, [triggerHaptics]);

  const handleSignIn = useCallback(async () => {
    await triggerHaptics();
    // Type-safe route: expo-router will validate this route at compile time
    router.push('/(auth)/signin');
  }, [triggerHaptics]);

  // Settings menu button - MUST be memoized to prevent infinite loops
  const settingsButton = useMemo(() => (
    <TouchableOpacity
      onPress={handleSettings}
      hitSlop={12}
      className="p-2 rounded-full"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      accessibilityHint="Navigate to profile settings page"
    >
      <Gear size={24} color={colors.foreground} weight="regular" />
    </TouchableOpacity>
  ), [handleSettings, colors.foreground]);

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
      setActions([settingsButton]);

      return () => {
        resetHeader();
      };
    }, [setHeader, resetHeader, setActions, settingsButton])
  );

  // Unified safe area edges for all states to prevent background jumps
  const safeAreaEdges = ['top', 'bottom', 'left', 'right'] as const;

  // Show loading state
  if (authLoading || (isAuthenticated && userLoading && !user)) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
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
        style={[styles.container, { backgroundColor: colors.background }]} 
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
          themeMode={themeMode}
          isDark={isDark}
        />
      </SafeAreaView>
    );
  }

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        edges={safeAreaEdges}
      >
        <ProfileMessageCard
          icon={<SignIn size={40} color={colors.mutedForeground} weight="regular" />}
          title="Sign in to view your profile"
          body="Access your activity, drafts, bookmarks, and more."
          primaryAction={{
            label: 'Sign In',
            onPress: handleSignIn,
            accessibilityHint: 'Navigate to sign in page',
          }}
          themeMode={themeMode}
          isDark={isDark}
        />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        edges={safeAreaEdges}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
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
    overflow: 'hidden',
  },
});
