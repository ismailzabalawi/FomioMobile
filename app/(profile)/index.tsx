// MyProfile Screen - Redesigned to match Settings page style
// Clean, organized sections with consistent spacing

import React, { useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gear, PencilSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { SettingItem, SettingSection } from '@/components/settings';
import { useDiscourseUser } from '@/shared/useDiscourseUser';
import { useAuth } from '@/shared/useAuth';
import { useUserPosts } from '@/shared/useUserPosts';
import { useUserReplies } from '@/shared/useUserReplies';
import { useUserMedia } from '@/shared/useUserMedia';
import {
  ProfileHeader,
  ProfileBio,
  ProfileStats,
  ProfileBadgeStrip,
  ProfilePostList,
  ProfileMediaGrid,
} from '@/components/profile';
import { router } from 'expo-router';
import { getThemeColors } from '@/shared/theme-constants';

export default function ProfileScreen(): React.ReactElement {
  const { themeMode, isDark } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError, refreshUser } =
    useDiscourseUser();

  // Get current user's username for data fetching
  const username = user?.username;

  const { posts, isLoading: postsLoading, hasMore: hasMorePosts, loadMore: loadMorePosts, refresh: refreshPosts } =
    useUserPosts(username || '');
  const {
    replies,
    isLoading: repliesLoading,
    hasMore: hasMoreReplies,
    loadMore: loadMoreReplies,
    refresh: refreshReplies,
  } = useUserReplies(username || '');
  const { media, isLoading: mediaLoading } = useUserMedia(username || '');

  const [refreshing, setRefreshing] = React.useState(false);
  const { setHeader, resetHeader, setActions } = useHeader();

  // Memoize theme colors - dark mode always uses AMOLED
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        refreshPosts(),
        refreshReplies(),
      ]);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refreshPosts, refreshReplies]);

  const handleSettings = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/(profile)/settings' as any);
  }, []);

  const handleEditProfile = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/(profile)/edit-profile' as any);
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

  // Configure header
  React.useEffect(() => {
    setHeader({
      title: "Profile",
      canGoBack: false,
      withSafeTop: false,
      tone: "bg",
    });
    setActions([settingsButton]);
    return () => resetHeader();
  }, [setHeader, resetHeader, setActions, settingsButton]);

  // Show loading state
  if (authLoading || (isAuthenticated && userLoading && !user)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (userError && isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center">
            <View
              className="p-4 rounded-xl mb-4"
              style={{ backgroundColor: colors.card }}
            >
              <ActivityIndicator
                size="large"
                color={colors.destructive}
              />
            </View>
            <TouchableOpacity
              onPress={refreshUser}
              className="px-6 py-3 rounded-xl border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center">
            <View
              className="p-6 rounded-xl mb-4 max-w-sm"
              style={{ backgroundColor: colors.card }}
            >
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: colors.muted }}
                >
                  <Gear size={32} color={colors.secondary} />
                </View>
                <View className="items-center">
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/signin' as any)}
                    className="px-6 py-3 rounded-xl mb-2"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator
                        size="small"
                        color={colors.accentForeground}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Profile Header Section */}
        <SettingSection title="Profile">
          <ProfileHeader user={user} isPublic={false} />
          
          {/* Bio */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfileBio bio={user.bio_raw} />
          </View>

          {/* Stats */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfileStats user={user} />
          </View>

          {/* Edit Profile Action */}
          <SettingItem
            title="Edit Profile"
            subtitle="Update your profile information"
            icon={<PencilSimple size={24} color={colors.accent} weight="regular" />}
            onPress={handleEditProfile}
          />
        </SettingSection>

        {/* Badge Strip */}
        <SettingSection title="Badges">
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfileBadgeStrip />
          </View>
        </SettingSection>

        {/* Bytes Section */}
        <SettingSection title="Bytes">
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfilePostList
              posts={posts}
              isLoading={postsLoading}
              hasMore={hasMorePosts}
              onLoadMore={loadMorePosts}
              filter="posts"
            />
          </View>
        </SettingSection>

        {/* Media Section */}
        <SettingSection title="Media">
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfileMediaGrid media={media} isLoading={mediaLoading} />
          </View>
        </SettingSection>

        {/* Replies Section */}
        <SettingSection title="Replies">
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ProfilePostList
              posts={replies}
              isLoading={repliesLoading}
              hasMore={hasMoreReplies}
              onLoadMore={loadMoreReplies}
              filter="replies"
            />
          </View>
        </SettingSection>

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
