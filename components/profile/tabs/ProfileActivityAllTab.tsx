// Tab component for "All" activity - combined view of Topics and Replies

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useUserPosts } from '@/shared/useUserPosts';
import { useUserReplies } from '@/shared/useUserReplies';
import { ProfilePostList } from '../ProfilePostList';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { PostItem } from '../ProfilePostList';

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
  
  // Deduplicate and sort items to prevent duplicate keys
  // Use composite key: postId (if exists) + id + source type to ensure uniqueness
  const allItems = useMemo(() => {
    const combined = [...posts, ...replies];
    const seen = new Set<string>();
    const unique: PostItem[] = [];
    
    for (const item of combined) {
      // Generate a unique key: postId takes precedence, then id, with source indicator
      // For replies: use postId if available, otherwise use id with 'reply' suffix
      // For topics: use id with 'topic' suffix (or just id if no postId exists)
      const key = item.postId 
        ? `post-${item.postId}` 
        : `topic-${item.id}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      } else {
        // If duplicate found, prefer the one with postId (reply) over topic
        // This ensures replies are shown when both topic and reply exist
        const existingIndex = unique.findIndex(existing => {
          const existingKey = existing.postId 
            ? `post-${existing.postId}` 
            : `topic-${existing.id}`;
          return existingKey === key;
        });
        
        if (existingIndex >= 0 && !unique[existingIndex].postId && item.postId) {
          // Replace topic with reply if reply has postId
          unique[existingIndex] = item;
        }
      }
    }
    
    // Sort by date
    return unique.sort((a, b) => {
      const dateA = new Date(a.lastPostedAt || a.createdAt).getTime();
      const dateB = new Date(b.lastPostedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [posts, replies]);

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

