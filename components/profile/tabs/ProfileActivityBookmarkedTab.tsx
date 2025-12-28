// Tab component for "Bookmarked" activity - only visible for own profile

import React from 'react';
import { Text } from 'react-native';
import { useUserBookmarked } from '@/shared/hooks/useUserBookmarked';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { useTheme } from '@/components/theme';

export interface ProfileActivityBookmarkedTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityBookmarkedTab({
  username,
  isOwnProfile,
  isAuthenticated,
}: ProfileActivityBookmarkedTabProps) {
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

  const { items, isLoading, hasMore, loadMore } = useUserBookmarked(username);

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
      emptyMessage="No bookmarks yet"
    />
  );
}
