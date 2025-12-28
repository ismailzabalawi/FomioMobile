// Tab component for "Topics" activity

import React from 'react';
import { Text } from 'react-native';
import { useUserPosts } from '@/shared/useUserPosts';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';

export interface ProfileActivityTopicsTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityTopicsTab({
  username,
}: ProfileActivityTopicsTabProps) {
  const { posts, isLoading, hasError, errorMessage, hasMore, loadMore } = useUserPosts(username);

  if (isLoading && posts.length === 0) {
    return (
      <Tabs.ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <PostSkeletonEnhanced />
      </Tabs.ScrollView>
    );
  }

  if (hasError) {
    return (
      <Tabs.ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-fomio-muted text-center">
          {errorMessage || 'Failed to load topics'}
        </Text>
      </Tabs.ScrollView>
    );
  }

  return (
    <ProfilePostList
      posts={posts}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      filter="posts"
      emptyMessage="No topics yet"
    />
  );
}
