// UI Spec: ProfilePostList
// - Reuses ByteCard component
// - Infinite scroll enabled
// - Compact spacing
// - Redirects to ByteBlogPage on tap
// - Handles empty state ("No posts yet")
// - Accepts filter prop: 'posts' | 'replies'
// - renderAsList prop to render as View list (for nested scroll contexts)

import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '@/components/theme';
import { ByteCard } from '@/components/bytes/ByteCard';
import { postItemToByte } from '@/shared/adapters/postItemToByte';
import { router } from 'expo-router';

export interface PostItem {
  id: number;
  postId?: number; // Unique post ID for replies (different from topic id)
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
  /** When true, renders as View list instead of FlatList (for nested scroll contexts) */
  renderAsList?: boolean;
}

// formatDate removed - now handled by formatTimeAgo in ByteCard component

export function ProfilePostList({
  posts,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  filter,
  emptyMessage,
  renderAsList = false,
}: ProfilePostListProps) {
  const { isDark } = useTheme();

  const handlePress = useCallback((postId: number) => {
    router.push(`/feed/${postId}` as any);
  }, []);

  const renderPostItem = useCallback(
    (item: PostItem) => {
      const byte = postItemToByte(item);
      // Use postId for replies (to avoid duplicate keys when multiple replies are to the same topic)
      // Fall back to id for topics
      const uniqueKey = item.postId || item.id;
      return (
        <ByteCard
          key={uniqueKey}
          byte={byte}
          onPress={() => handlePress(item.id)}
        />
      );
    },
    [handlePress]
  );

  const renderItem = useCallback(
    ({ item }: { item: PostItem }) => renderPostItem(item),
    [renderPostItem]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color={isDark ? '#26A69A' : '#009688'} />
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
          <ActivityIndicator size="small" color={isDark ? '#26A69A' : '#009688'} />
        </View>
      );
    }
    
    return null;
  };

  // Render as View list for nested scroll contexts (e.g., inside Tabs.ScrollView)
  if (renderAsList) {
    if (posts.length === 0) {
      return renderEmpty();
    }

    return (
      <View style={{ width: '100%', overflow: 'hidden' }}>
        {posts.map(renderPostItem)}
        {renderFooter()}
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => (item.postId || item.id).toString()}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore && !isLoading ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
    />
  );
}
