// UI Spec: ProfilePostList
// - Reuses ByteCard component
// - Infinite scroll enabled
// - Compact spacing
// - Redirects to ByteBlogPage on tap
// - Handles empty state ("No posts yet")
// - Accepts filter prop: 'posts' | 'replies'

import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '@/components/theme';
import { ByteCard } from '@/components/bytes/ByteCard';
import { postItemToByte } from '@/shared/adapters/postItemToByte';
import { router } from 'expo-router';
import { discourseApi } from '@/shared/discourseApi';

export interface PostItem {
  id: number;
  title: string;
  hubName: string;
  teretName?: string;
  author: {
    name: string;
    avatar: string;
  };
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostedAt?: string;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
  slug: string;
}

export interface ProfilePostListProps {
  posts: PostItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  filter: 'posts' | 'replies';
  emptyMessage?: string;
}

// formatDate removed - now handled by formatTimeAgo in ByteCard component

export function ProfilePostList({
  posts,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  filter,
  emptyMessage,
}: ProfilePostListProps) {
  const { isDark } = useTheme();

  const handlePress = useCallback((postId: number) => {
    router.push(`/feed/${postId}` as any);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PostItem }) => {
      const byte = postItemToByte(item);
      return (
        <ByteCard
          byte={byte}
          onPress={() => handlePress(item.id)}
        />
      );
    },
    [handlePress]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color={isDark ? '#3b82f6' : '#2563eb'} />
        </View>
      );
    }

    return (
      <View className="py-12 px-4 items-center">
        <Text
          className="text-base"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          {emptyMessage || (filter === 'posts' ? 'No posts yet' : 'No replies yet')}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    
    if (isLoading) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color={isDark ? '#3b82f6' : '#2563eb'} />
        </View>
      );
    }
    
    return null;
  };

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore && !isLoading ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      scrollEnabled={false} // Parent ScrollView handles scrolling
      showsVerticalScrollIndicator={false}
    />
  );
}

