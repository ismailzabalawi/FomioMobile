// Tab component for "All" activity - combined view of Topics and Replies

import React from 'react';
import { View } from 'react-native';
import { useUserPosts } from '@/shared/useUserPosts';
import { useUserReplies } from '@/shared/useUserReplies';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';

export interface ProfileActivityAllTabProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

export function ProfileActivityAllTab({
  username,
}: ProfileActivityAllTabProps) {
  const { posts, isLoading: postsLoading, hasMore: hasMorePosts, loadMore: loadMorePosts } = useUserPosts(username);
  const { replies, isLoading: repliesLoading, hasMore: hasMoreReplies, loadMore: loadMoreReplies } = useUserReplies(username);

  const isLoading = postsLoading || repliesLoading;
  const allItems = [...posts, ...replies].sort((a, b) => {
    const dateA = new Date(a.lastPostedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastPostedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  if (isLoading && allItems.length === 0) {
    return (
      <View className="px-4 py-6">
        <PostSkeletonEnhanced />
      </View>
    );
  }

  return (
    <ProfilePostList
      posts={allItems}
      isLoading={isLoading}
      hasMore={hasMorePosts || hasMoreReplies}
      onLoadMore={() => {
        if (hasMorePosts) loadMorePosts();
        if (hasMoreReplies) loadMoreReplies();
      }}
      filter="posts"
      emptyMessage="No activity yet"
      renderAsList
    />
  );
}

