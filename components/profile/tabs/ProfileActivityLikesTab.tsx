// Tab component for "Likes" activity - only visible for own profile

import React from 'react';
import { Text } from 'react-native';
import { useUserLikes } from '@/shared/hooks/useUserLikes';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { useTheme } from '@/components/theme';

export interface ProfileActivityLikesTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityLikesTab({
  username,
  isOwnProfile,
  isAuthenticated,
}: ProfileActivityLikesTabProps) {
  const { isDark } = useTheme();
  
  if (!isOwnProfile || !isAuthenticated) {
    return (
      <Tabs.ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-base text-center"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          This section is only visible to you
        </Text>
      </Tabs.ScrollView>
    );
  }

  const { items, isLoading, hasMore, loadMore } = useUserLikes(username);

  if (isLoading && items.length === 0) {
    return (
      <Tabs.ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <PostSkeletonEnhanced />
      </Tabs.ScrollView>
    );
  }

  return (
    <ProfilePostList
      posts={items}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      filter="posts"
      emptyMessage="No liked posts yet"
    />
  );
}
