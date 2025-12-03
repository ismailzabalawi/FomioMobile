// MyProfile Screen - Twitter/X-style tabbed layout
// Uses ProfileTabView for consistent experience

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
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
import { ProfileTabView } from '@/components/profile';
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

  const handleSettings = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/(profile)/settings' as any);
  }, []);

  // Settings menu button - MUST be memoized to prevent infinite loops
  const settingsButton = useMemo(() => (
    <TouchableOpacity
      onPress={handleSettings}
      hitSlop={12}
      className="p-2 rounded-full"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Open settings"
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
    }, [setHeader, resetHeader, setActions, settingsButton, isDark])
  );

  // Show loading state
  if (authLoading || (isAuthenticated && userLoading && !user)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Show error state
  if (userError && isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center max-w-sm">
            <View
              className="p-6 rounded-xl mb-4"
              style={{ backgroundColor: colors.card }}
            >
              <View className="items-center">
                <Text className="text-4xl mb-4">😕</Text>
                <Text
                  className="text-lg font-semibold mb-2 text-center"
                  style={{ color: colors.foreground }}
                >
                  Failed to load profile
                </Text>
                <Text
                  className="text-sm text-center mb-6"
                  style={{ color: colors.mutedForeground }}
                >
                  {userError || 'Please check your connection and try again.'}
                </Text>
                <TouchableOpacity
                  onPress={refreshUser}
                  className="px-6 py-3 rounded-xl"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center max-w-sm">
            <View
              className="p-6 rounded-xl mb-4"
              style={{ backgroundColor: colors.card }}
            >
              <View className="items-center">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: colors.muted }}
                >
                  <SignIn size={40} color={colors.mutedForeground} weight="regular" />
                </View>
                <Text
                  className="text-xl font-semibold mb-2 text-center"
                  style={{ color: colors.foreground }}
                >
                  Sign in to view your profile
                </Text>
                <Text
                  className="text-sm text-center mb-6"
                  style={{ color: colors.mutedForeground }}
                >
                  Access your activity, drafts, bookmarks, and more.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/signin' as any)}
                  className="px-8 py-3 rounded-xl"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text className="text-white font-semibold text-base">Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
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
  },
});
