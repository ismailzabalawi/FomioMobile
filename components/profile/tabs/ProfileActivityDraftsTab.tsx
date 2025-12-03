// Tab component for "Drafts" activity - only visible for own profile

import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useUserDrafts } from '@/shared/hooks/useUserDrafts';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { useTheme } from '@/components/theme';

export interface ProfileActivityDraftsTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityDraftsTab({
  isOwnProfile,
  isAuthenticated,
}: ProfileActivityDraftsTabProps) {
  const { isDark } = useTheme();
  const { drafts, isLoading } = useUserDrafts();

  if (!isOwnProfile || !isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Text
          className="text-base text-center"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          This section is only visible to you
        </Text>
      </View>
    );
  }

  if (isLoading && drafts.length === 0) {
    return (
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
    );
  }

  return (
    <ProfilePostList
      posts={drafts}
      isLoading={isLoading}
      hasMore={false}
      onLoadMore={() => {}}
      filter="posts"
      emptyMessage="No drafts yet"
      renderAsList
    />
  );
}

