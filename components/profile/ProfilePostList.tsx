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
import { ByteCard } from '../feed/ByteCard';
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

// Format date helper for activity timestamp
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    return 'Unknown time';
  }
};

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
      return (
        <ByteCard
          id={item.id}
          title={item.title}
          hub={item.hubName}
          teret={item.teretName}
          author={{
            name: item.author.name,
            avatar: item.author.avatar,
          }}
          replies={item.replyCount}
          activity={formatDate(item.lastPostedAt || item.createdAt)}
          onPress={() => handlePress(item.id)}
          isBookmarked={item.isBookmarked}
          likeCount={item.likeCount}
          hasMedia={item.hasMedia}
          coverImage={item.coverImage}
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

