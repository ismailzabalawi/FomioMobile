// Tab component for "Solved" activity - public

import React from 'react';
import { useUserSolved } from '@/shared/hooks/useUserSolved';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { Tabs } from 'react-native-collapsible-tab-view';

export interface ProfileActivitySolvedTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivitySolvedTab({
  username,
}: ProfileActivitySolvedTabProps) {
  const { items, isLoading, hasMore, loadMore } = useUserSolved(username);

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
      emptyMessage="No solved topics yet"
      ListComponent={Tabs.FlatList}
    />
  );
}
