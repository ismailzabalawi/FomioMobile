// PublicProfile Screen - Viewing other users' profiles
// Similar structure to MyProfile but with public profile actions

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DotsThreeVertical } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useSafeNavigation } from '@/shared/hooks/useSafeNavigation';
import { useDiscourseUser } from '@/shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { discourseApi } from '@/shared/discourseApi';
import { ProfileTabView } from '@/components/profile';
import { useLocalSearchParams } from 'expo-router';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { useToast } from '@/shared/form-validation';

export default function PublicProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { username: targetUsername } = useLocalSearchParams<{ username: string }>();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Early validation - return error if no username provided
  if (!targetUsername) {
    return (
      <ScreenContainer variant="bg">
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center max-w-sm">
            <Text
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: isDark ? '#f9fafb' : '#111827' }}
            >
              Invalid profile URL
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              Please provide a valid username to view the profile.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const { user, loading: userLoading, error: userError, refreshUser } =
    useDiscourseUser(targetUsername);
  
  // Get current user to determine if this is own profile
  const { user: currentUser } = useDiscourseUser();
  const isOwnProfile = currentUser?.username === targetUsername;

  const { safeBack } = useSafeNavigation();

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
                showSuccess('Reported', 'Thank you for your report.');
              } else {
                showError('Report failed', response.error || 'Failed to report user');
              }
            } catch (error) {
              showError('Report failed', 'Failed to report user');
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
                showSuccess('Blocked', `${user.username} has been blocked.`);
                safeBack();
              } else {
                showError('Block failed', response.error || 'Failed to block user');
              }
            } catch (error) {
              showError('Block failed', 'Failed to block user');
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
        showSuccess('Muted', `${user.username} has been muted.`);
      } else {
        showError('Mute failed', response.error || 'Failed to mute user');
      }
    } catch (error) {
      showError('Mute failed', 'Failed to mute user');
    }
  };

  const handleIgnore = async () => {
    if (!user?.username) return;

    try {
      const response = await discourseApi.ignoreUser(user.username);
      if (response.success) {
        showSuccess('Ignored', `${user.username} has been ignored.`);
      } else {
        showError('Ignore failed', response.error || 'Failed to ignore user');
      }
    } catch (error) {
      showError('Ignore failed', 'Failed to ignore user');
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
    compact: true,
    titleFontSize: 20,
  }, [user, menuButton, isDark]);

  // Show loading state
  if (userLoading && !user) {
    return (
      <ScreenContainer variant="bg">
        <ProfileSkeleton />
      </ScreenContainer>
    );
  }

  // Show error state
  if (userError || (!user && !userLoading && targetUsername)) {
    const isNotFound = userError?.includes('404') || userError?.includes('not found');
    const errorTitle = isNotFound ? 'User not found' : 'Failed to load profile';
    const errorMessage = isNotFound
      ? `The user "${targetUsername}" doesn't exist or their profile is private.`
      : userError || 'Please check your connection and try again.';

    return (
      <ScreenContainer variant="bg">
        <View className="flex-1 items-center justify-center px-4">
          <View className="items-center max-w-sm">
            <View
              className="p-6 rounded-xl mb-4"
              style={{
                backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
              }}
            >
              <View className="items-center">
                {/* Icon or emoji */}
                <Text className="text-4xl mb-4">👤</Text>
                
                <Text
                  className="text-lg font-semibold mb-2 text-center"
                  style={{ color: isDark ? '#f9fafb' : '#111827' }}
                >
                  {errorTitle}
                </Text>
                
                <Text
                  className="text-sm text-center mb-6"
                  style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                >
                  {errorMessage}
                </Text>
                
                <TouchableOpacity
                  onPress={refreshUser}
                  className="px-6 py-3 rounded-xl"
                  style={{
                    backgroundColor: isDark ? '#26A69A' : '#009688',
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading profile"
                >
                  <Text className="text-white font-semibold">Retry</Text>
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
      <ProfileTabView
        user={user}
        isOwnProfile={isOwnProfile}
        isAuthenticated={isAuthenticated}
        onReport={handleReport}
        onBlock={handleBlock}
      />
    </ScreenContainer>
  );
}
