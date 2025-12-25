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
    id?: number; // Author user ID
    username?: string; // Author username
    name: string;
    avatar: string;
  };
  excerpt?: string; // Post excerpt/content preview
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastPostedAt?: string;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
  slug: string;
  // Draft metadata (used only for drafts tab)
  draftKey?: string;
  draftSequence?: number;
  rawContent?: string;
  categoryId?: number;
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
    (item: PostItem, index?: number) => {
      const byte = postItemToByte(item);
      // Generate truly unique key: postId (for replies) or id (for topics) + index as fallback
      // This ensures uniqueness even if postId/id are duplicated across posts and replies
      // Note: For FlatList, keyExtractor handles keys, so index is only needed for renderAsList
      const uniqueKey = item.postId 
        ? `post-${item.postId}` 
        : index !== undefined 
          ? `topic-${item.id}-${index}` 
          : `topic-${item.id}`;
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
  // Note: Parent ScrollView handles scrolling, so we just render the content
  if (renderAsList) {
    if (posts.length === 0) {
      return renderEmpty();
    }

    return (
      <View style={{ width: '100%' }}>
        {posts.map((item, index) => renderPostItem(item, index))}
        {renderFooter()}
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item, index) => {
        // Generate unique key: postId for replies, id-index for topics
        return item.postId 
          ? `post-${item.postId}` 
          : `topic-${item.id}-${index}`;
      }}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore && !isLoading ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
    />
  );
}
