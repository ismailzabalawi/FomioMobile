// PublicProfile Screen - Viewing other users' profiles
// Similar structure to MyProfile but with public profile actions

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { DotsThreeVertical, Flag, Prohibit } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useSafeNavigation } from '@/shared/hooks/useSafeNavigation';
import { useHeader } from '@/components/ui/header';
import { useDiscourseUser } from '@/shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { useUserPosts } from '@/shared/useUserPosts';
import { useUserReplies } from '@/shared/useUserReplies';
import { useUserMedia } from '@/shared/useUserMedia';
import { discourseApi } from '@/shared/discourseApi';
import {
  ProfileHeader,
  ProfileBio,
  ProfileStats,
  ProfileActions,
  ProfileBadgeStrip,
  ProfileSectionTitle,
  ProfilePostList,
  ProfileMediaGrid,
  ProfileDangerActions,
} from '@/components/profile';
import { router, useLocalSearchParams } from 'expo-router';

export default function PublicProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { username: targetUsername } = useLocalSearchParams<{ username: string }>();
  const { isAuthenticated } = useAuth();
  const { user, loading: userLoading, error: userError, refreshUser } =
    useDiscourseUser(targetUsername);

  // Get user's username for data fetching
  const username = user?.username || targetUsername;

  const { posts, isLoading: postsLoading, hasMore: hasMorePosts, loadMore: loadMorePosts, refresh: refreshPosts } =
    useUserPosts(username);
  const {
    replies,
    isLoading: repliesLoading,
    hasMore: hasMoreReplies,
    loadMore: loadMoreReplies,
    refresh: refreshReplies,
  } = useUserReplies(username);
  const { media, isLoading: mediaLoading } = useUserMedia(username);

  const [refreshing, setRefreshing] = React.useState(false);
  const { safeBack } = useSafeNavigation();
  const { setActions } = useHeader();

  const handleRefresh = async () => {
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
  };

  const handleReport = async () => {
    if (!user?.username) return;

    Alert.alert(
      'Report User',
      `Report ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await discourseApi.reportUser(
                user.username,
                'User reported from mobile app'
              );
              if (response.success) {
                Alert.alert('Reported', 'Thank you for your report.');
              } else {
                Alert.alert('Error', response.error || 'Failed to report user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to report user');
            }
          },
        },
      ]
    );
  };

  const handleBlock = async () => {
    if (!user?.username) return;

    Alert.alert(
      'Block User',
      `Block ${user.username}? You won't see their posts or replies.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await discourseApi.blockUser(user.username);
              if (response.success) {
                Alert.alert('Blocked', `${user.username} has been blocked.`);
                safeBack();
              } else {
                Alert.alert('Error', response.error || 'Failed to block user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleMute = async () => {
    if (!user?.username) return;

    try {
      const response = await discourseApi.muteUser(user.username);
      if (response.success) {
        Alert.alert('Muted', `${user.username} has been muted.`);
      } else {
        Alert.alert('Error', response.error || 'Failed to mute user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mute user');
    }
  };

  const handleIgnore = async () => {
    if (!user?.username) return;

    try {
      const response = await discourseApi.ignoreUser(user.username);
      if (response.success) {
        Alert.alert('Ignored', `${user.username} has been ignored.`);
      } else {
        Alert.alert('Error', response.error || 'Failed to ignore user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to ignore user');
    }
  };

  // Menu button for header
  const menuButton = useMemo(() => (
    <TouchableOpacity
      onPress={() => {
        Alert.alert(
          'Options',
          `Options for ${user?.username || 'user'}`,
          [
            {
              text: 'Report',
              style: 'destructive',
              onPress: handleReport,
            },
            {
              text: 'Block',
              style: 'destructive',
              onPress: handleBlock,
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }}
      hitSlop={12}
      className="p-2 rounded-full"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <DotsThreeVertical size={24} color={isDark ? '#f9fafb' : '#111827'} weight="regular" />
    </TouchableOpacity>
  ), [user?.username, handleReport, handleBlock, isDark, safeBack]);

  // Configure header with dynamic title
  const displayName = user ? (user.name || user.username || 'Profile') : 'Profile';
  
  useScreenHeader({
    title: displayName,
    canGoBack: true,
    withSafeTop: false,
    tone: "bg",
    rightActions: [menuButton],
  }, [user, menuButton]);

  // Show loading state
  if (userLoading && !user) {
    return (
      <ScreenContainer variant="bg">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? '#3b82f6' : '#2563eb'}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Show error state
  if (userError || !user) {
    return (
      <ScreenContainer variant="bg">
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center">
            <View
              className="p-6 rounded-xl mb-4 max-w-sm"
              style={{
                backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
              }}
            >
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  }}
                >
                  <ActivityIndicator
                    size="large"
                    color={isDark ? '#ef4444' : '#dc2626'}
                  />
                </View>
                <TouchableOpacity
                  onPress={refreshUser}
                  className="px-6 py-3 rounded-xl border"
                  style={{
                    backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator
                      size="small"
                      color={isDark ? '#3b82f6' : '#2563eb'}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="bg">
      {/* Scrollable Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#3b82f6' : '#2563eb'}
          />
        }
      >
        {/* Profile Header */}
        <ProfileHeader user={user} isPublic={true} />

        {/* Bio */}
        <ProfileBio bio={user.bio_raw} />

        {/* Stats */}
        <ProfileStats user={user} />

        {/* Actions */}
        <ProfileActions
          mode="publicProfile"
          username={user.username}
          onReport={handleReport}
          onBlock={handleBlock}
        />

        {/* Badge Strip */}
        <ProfileBadgeStrip />

        {/* Bytes Section */}
        <ProfileSectionTitle title="Bytes" />
        <ProfilePostList
          posts={posts}
          isLoading={postsLoading}
          hasMore={hasMorePosts}
          onLoadMore={loadMorePosts}
          filter="posts"
        />

        {/* Media Section */}
        <ProfileSectionTitle title="Media" />
        <ProfileMediaGrid media={media} isLoading={mediaLoading} />

        {/* Replies Section */}
        <ProfileSectionTitle title="Replies" />
        <ProfilePostList
          posts={replies}
          isLoading={repliesLoading}
          hasMore={hasMoreReplies}
          onLoadMore={loadMoreReplies}
          filter="replies"
        />

        {/* Danger Zone */}
        {isAuthenticated && (
          <ProfileDangerActions
            username={user.username}
            onReport={handleReport}
            onMute={handleMute}
            onIgnore={handleIgnore}
          />
        )}

        {/* Bottom padding */}
        <View className="h-8" />
      </Animated.ScrollView>
    </ScreenContainer>
  );
}

