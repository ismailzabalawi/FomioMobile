// Tab component for "Topics" activity

import React from 'react';
import { View, Text } from 'react-native';
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
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="px-4 py-6 items-center">
        <Text className="text-fomio-muted text-center">
          {errorMessage || 'Failed to load topics'}
        </Text>
      </View>
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
      renderAsList
    />
  );
}

