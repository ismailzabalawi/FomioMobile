// Tab component for "Votes" activity - only visible for own profile, requires voting plugin

import React from 'react';
import { Text } from 'react-native';
import { useUserVotes } from '@/shared/hooks/useUserVotes';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { useTheme } from '@/components/theme';
import { Tabs } from 'react-native-collapsible-tab-view';

export interface ProfileActivityVotesTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityVotesTab({
  username,
  isOwnProfile,
  isAuthenticated,
}: ProfileActivityVotesTabProps) {
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

  const { items, isLoading, hasMore, loadMore } = useUserVotes(username);

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
      emptyMessage="No votes yet"
      ListComponent={Tabs.FlatList}
    />
  );
}
