import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../shared/theme-provider';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import { CommentItem, Comment } from './CommentItem';
import { NewCommentInput } from './NewCommentInput';
import { HeaderBar } from '../nav/HeaderBar';
import { useTopic, TopicData } from '../../shared/useTopic';
import { usePostActions } from '../../shared/usePostActions';

export interface ByteBlogPageProps {
  topicId: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  initialCommentsVisible?: boolean;
}

// UI Spec: ByteBlogPage — Blog-style Byte details page with author, title, content, cover image, and action bar. Themed and accessible.
export function ByteBlogPage({
  topicId,
  onLike,
  onComment,
  onShare,
  onBookmark,
  initialCommentsVisible = false,
}: ByteBlogPageProps) {
  const { isDark, isAmoled } = useTheme();
  const { topic, isLoading, hasError, errorMessage, retry } = useTopic(topicId);
  const [isCommentsVisible, setIsCommentsVisible] = useState(initialCommentsVisible);
  const flatListRef = useRef<import('react-native').FlatList>(null);
  
  // Use the post actions hook for the first post (main topic)
  const {
    isLiked: currentIsLiked,
    isBookmarked: currentIsBookmarked,
    likeCount: currentLikeCount,
    isLoading: actionsLoading,
    error: actionsError,
    toggleLike,
    toggleBookmark,
    createComment,
  } = usePostActions(topicId, topic?.likeCount || 0, false, false);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#fff'),
    card: isAmoled ? '#000000' : (isDark ? '#23232b' : '#f8fafc'),
    text: isDark ? '#f4f4f5' : '#17131B',
    secondary: isDark ? '#a1a1aa' : '#5C5D67',
    accent: isDark ? '#38bdf8' : '#0ea5e9',
    topic: isDark ? '#a1a1aa' : '#5C5D67',
    heading: isDark ? '#f4f4f5' : '#17131B',
    action: isDark ? '#a1a1aa' : '#17131B',
    divider: isDark ? '#23232b' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Transform topic posts to comments
  const transformPostsToComments = (posts: TopicData['posts']): Comment[] => {
    return posts.slice(1).map((post, index) => ({
      id: post.id.toString(),
      author: {
        name: post.author.name,
        avatar: post.author.avatar,
      },
      content: post.content.replace(/<[^>]*>/g, ''), // Strip HTML tags
      createdAt: new Date(post.createdAt).toLocaleDateString(),
      likes: post.likeCount,
    }));
  };

  // Group comments: parents and their direct replies
  const comments = topic ? transformPostsToComments(topic.posts) : [];
  const parents = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);
  
  function getReplies(parentId: string) {
    return replies.filter(r => r.parentId === parentId);
  }

  // Compose a flat list of items: parent, then its replies indented
  const commentList = parents.flatMap(parent => [
    { ...parent, isReply: false },
    ...getReplies(parent.id).map(reply => ({ ...reply, isReply: true })),
  ]);

  // Scroll to comments on mount if initialCommentsVisible is true
  useEffect(() => {
    if (initialCommentsVisible && flatListRef.current) {
      // Wait for the FlatList to render and then scroll to comments section
      setTimeout(() => {
        // Find the index where comments start (after the header)
        const commentStartIndex = 1; // Comments start at index 1 (after header at index 0)
        flatListRef.current?.scrollToIndex({ 
          index: commentStartIndex, 
          animated: true,
          viewPosition: 0.1 // Position comments near the top
        });
      }, 500); // Increased delay to ensure content is rendered
    }
  }, [initialCommentsVisible]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading topic...
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errorMessage || 'Failed to load topic'}
        </Text>
        <TouchableOpacity onPress={retry} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Topic not found
        </Text>
      </View>
    );
  }

  // Handle empty avatar URLs
  const avatarSource = topic.author.avatar && topic.author.avatar.trim() !== '' 
    ? { uri: topic.author.avatar } 
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Byte Details" 
          showBackButton={true}
          showProfileButton={true}
        />
      </View>
      
      <FlatList
        ref={flatListRef}
        data={[
          // Header section
          { type: 'header', id: 'header' },
          // Comments section (only if visible)
          ...(isCommentsVisible ? commentList.map(item => ({ ...item, type: 'comment' })) : []),
          // Footer section (only if comments visible)
          ...(isCommentsVisible ? [{ type: 'footer', id: 'footer' }] : [])
        ]}
        keyExtractor={(item, index) => item.id || `item-${index}`}
        renderItem={({ item, index }) => {
          if (item.type === 'header') {
            return (
              <View style={[styles.headerContainer, { backgroundColor: colors.background }]}> 
                {/* Author & Category Information */}
                <View style={styles.authorRow}>
                  {avatarSource ? (
                    <Image 
                      source={avatarSource} 
                      style={styles.avatar} 
                      accessibilityLabel={`${topic.author.name}'s avatar`}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={[styles.avatarFallback, { color: colors.background }]}>
                        {topic.author.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.authorInfo}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{topic.author.name}</Text>
                    <Text style={[styles.authorUsername, { color: colors.secondary }]}>@{topic.author.username}</Text>
                    <View style={styles.categoryContainer}>
                      <View style={[styles.categoryBadge, { backgroundColor: topic.category.color + '20' }]}>
                        <Text style={[styles.categoryText, { color: topic.category.color }]}>
                          {topic.category.name}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* Tags */}
                {topic.tags && topic.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {topic.tags.slice(0, 3).map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.tagBadge, { backgroundColor: colors.accent + '20' }]}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`View posts tagged with ${tag}`}
                      >
                        <Text style={[styles.tagText, { color: colors.accent }]}>#{tag}</Text>
                      </TouchableOpacity>
                    ))}
                    {topic.tags.length > 3 && (
                      <Text style={[styles.moreTagsText, { color: colors.secondary }]}>
                        +{topic.tags.length - 3} more
                      </Text>
                    )}
                  </View>
                )}
                
                {/* Title and Timestamp */}
                <Text style={[styles.title, { color: colors.heading }]}>{topic.title}</Text>
                <Text style={[styles.timestamp, { color: colors.secondary }]}>
                  {new Date(topic.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                
                {/* Content */}
                <View style={styles.contentBlock}>
                  <Text style={[styles.paragraph, { color: colors.secondary }]}>
                    {topic.content.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
                  </Text>
                </View>
                
                {/* Action Bar */}
                <View style={[styles.actionBar, { borderTopColor: colors.divider }]}> 
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      try {
                        await toggleLike();
                        if (onLike) onLike();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update like status');
                      }
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={currentIsLiked ? 'Unlike' : 'Like'}
                    disabled={actionsLoading}
                  >
                    <Heart size={24} weight={currentIsLiked ? 'fill' : 'regular'} color={colors.action} />
                    <Text style={[styles.actionText, { color: colors.action }]}>{currentLikeCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setIsCommentsVisible(v => !v)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={isCommentsVisible ? 'Hide comments' : 'Show comments'}
                    accessibilityHint={isCommentsVisible ? 'Hides the comment section' : 'Shows the comment section'}
                  >
                    <ChatCircle size={24} weight={isCommentsVisible ? 'fill' : 'regular'} color={colors.action} />
                    <Text style={[styles.actionText, { color: colors.action }]}>{topic.replyCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      try {
                        await toggleBookmark();
                        if (onBookmark) onBookmark();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update bookmark status');
                      }
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={currentIsBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    disabled={actionsLoading}
                  >
                    <BookmarkSimple size={24} weight={currentIsBookmarked ? 'fill' : 'regular'} color={colors.action} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          } else if (item.type === 'comment') {
            return <CommentItem comment={item} isReply={item.isReply} />;
          } else if (item.type === 'footer') {
            return (
              <NewCommentInput 
                onSend={async (content: string) => {
                  try {
                    const success = await createComment(content);
                    if (success) {
                      // Refresh the topic to show the new comment
                      retry();
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to post comment');
                  }
                }} 
              />
            );
          }
          return null;
        }}
        contentContainerStyle={{ paddingBottom: 32, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 80, // Add space for sticky header
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  authorUsername: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  categoryContainer: {
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    fontWeight: '400',
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
  },
  contentBlock: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    paddingBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#38bdf8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarFallback: {
    fontSize: 20,
    fontWeight: '600',
  },
}); 