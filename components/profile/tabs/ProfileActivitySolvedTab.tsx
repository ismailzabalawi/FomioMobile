// Tab component for "Solved" activity - public

import React from 'react';
import { View } from 'react-native';
import { useUserSolved } from '@/shared/hooks/useUserSolved';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';

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
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
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
      renderAsList
    />
  );
}

