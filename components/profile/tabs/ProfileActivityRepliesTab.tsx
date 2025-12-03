// Tab component for "Replies" activity

import React from 'react';
import { View } from 'react-native';
import { useUserReplies } from '@/shared/useUserReplies';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';

export interface ProfileActivityRepliesTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityRepliesTab({
  username,
}: ProfileActivityRepliesTabProps) {
  const { replies, isLoading, hasMore, loadMore } = useUserReplies(username);

  if (isLoading && replies.length === 0) {
    return (
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
    );
  }

  return (
    <ProfilePostList
      posts={replies}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      filter="replies"
      emptyMessage="No replies yet"
      renderAsList
    />
  );
}

