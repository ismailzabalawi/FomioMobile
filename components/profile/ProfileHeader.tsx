// UI Spec: ProfileHeader
// - Large avatar (60-72px)
// - Display name (semibold)
// - @username (muted grey)
// - Joined date formatted as "Joined August 2024"
// - Last seen (public only): "Online recently" or timestamp
// - Left-aligned layout matching X/Twitter style
// - Uses NativeWind semantic tokens

import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, Eye } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { Avatar } from '../ui/avatar';
import { discourseApi, DiscourseUser } from '@/shared/discourseApi';
import { cn } from '@/lib/utils/cn';

export interface ProfileHeaderProps {
  user: DiscourseUser;
  isPublic?: boolean; // If true, show last seen
}

export function ProfileHeader({ user, isPublic = false }: ProfileHeaderProps) {
  const { isDark, isAmoled } = useTheme();
  const { header } = useHeader();
  const insets = useSafeAreaInsets();
  
  // Calculate header height to add appropriate top padding
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
  const HEADER_PADDING = Platform.OS === 'ios' ? 4 : 2;
  const baseHeaderHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
  const measuredHeaderHeight = header.headerHeight ?? baseHeaderHeight;
  
  // When extendToStatusBar is true, header includes status bar area
  // ProfileHeader needs padding to account for the global header
  const headerTopPadding = header.extendToStatusBar 
    ? measuredHeaderHeight 
    : measuredHeaderHeight + insets.top;
  
  const avatarUrl = user.avatar_template
    ? discourseApi.getAvatarUrl(user.avatar_template, 72)
    : null;

  const displayName = user.name || user.username || 'Unknown User';
  const username = user.username || 'unknown';
  
  // Format joined date: "Joined August 2024"
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Format last seen (public only)
  const lastSeen = isPublic && user.last_seen_at
    ? (() => {
        const lastSeenDate = new Date(user.last_seen_at);
        const now = new Date();
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return 'Online recently';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return lastSeenDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      })()
    : null;

  return (
    <View className="px-4 pb-4" style={{ paddingTop: headerTopPadding + 24, width: '100%', overflow: 'hidden' }}>
      {/* Avatar */}
      <View className="mb-4">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 72, height: 72, borderRadius: 36 }}
            contentFit="cover"
            transition={200}
            accessible
            accessibilityLabel={`${displayName}'s profile picture`}
          />
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '600',
                color: isDark ? '#f9fafb' : '#374151',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name and Username */}
      <View className="mb-2">
        <Text
          className="text-2xl font-semibold"
          style={{ color: isDark ? '#f9fafb' : '#111827' }}
        >
          {displayName}
        </Text>
        <Text
          className="text-base mt-0.5"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          @{username}
        </Text>
      </View>

      {/* Meta: Joined date and Last seen */}
      <View className="flex-row items-center gap-3 mt-2">
        {joinedDate && (
          <View className="flex-row items-center gap-1.5">
            <Calendar
              size={16}
              color={isDark ? '#9ca3af' : '#6b7280'}
              weight="regular"
            />
            <Text
              className="text-sm"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              Joined {joinedDate}
            </Text>
          </View>
        )}
        {lastSeen && (
          <>
            <Text
              className="text-sm"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              •
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Eye
                size={16}
                color={isDark ? '#9ca3af' : '#6b7280'}
                weight="regular"
              />
              <Text
                className="text-sm"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {lastSeen}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

