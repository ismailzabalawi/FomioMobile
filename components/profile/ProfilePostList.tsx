// UI Spec: ProfilePostList
// - Reuses ByteCard component
// - Infinite scroll enabled
// - Compact spacing
// - Redirects to ByteBlogPage on tap
// - Handles empty state ("No posts yet")
// - Accepts filter prop: 'posts' | 'replies'
// - Supports custom ListComponent (e.g., Tabs.FlatList for collapsible tabs)

import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/components/theme';
import { ByteCard } from '@/components/bytes/ByteCard';
import { postItemToByte } from '@/shared/adapters/postItemToByte';
import { router } from 'expo-router';
import type { FlatListProps } from 'react-native';

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
  ListComponent?: React.ComponentType<FlatListProps<PostItem>>;
}

// formatDate removed - now handled by formatTimeAgo in ByteCard component

export function ProfilePostList({
  posts,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  filter,
  emptyMessage,
  ListComponent,
}: ProfilePostListProps) {
  const { isDark } = useTheme();
  const ResolvedListComponent = ListComponent || FlatList;

  const handlePress = useCallback((byteId: string | number) => {
    router.push(`/feed/${byteId}` as any);
  }, []);

  const renderPostItem = useCallback(
    (item: PostItem, index?: number) => {
      const byte = postItemToByte(item);
      // Generate truly unique key: postId (for replies) or id (for topics) + index as fallback
      // This ensures uniqueness even if postId/id are duplicated across posts and replies
      // Note: For FlatList, keyExtractor handles keys, so index is only needed for in-list keys
      const uniqueKey = item.postId 
        ? `post-${item.postId}` 
        : index !== undefined 
          ? `topic-${item.id}-${index}` 
          : `topic-${item.id}`;
      return (
        <ByteCard
          key={uniqueKey}
          byte={byte}
          onPressByteId={handlePress}
          hideHeader={true} // Hide header in profile context - all posts belong to profile owner
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

  return (
    <ResolvedListComponent
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
      contentContainerStyle={{ paddingBottom: 12 }}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
      updateCellsBatchingPeriod={100}
      removeClippedSubviews={false}
      getItemLayout={undefined}
      disableVirtualization={false}
    />
  );
}
