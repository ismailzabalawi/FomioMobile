import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../components/shared/theme-provider';
import { ByteCard } from '../../components/feed/ByteCard';
import { HeaderBar } from '../../components/nav/HeaderBar';
import { useFeed, FeedItem } from '../../shared/useFeed';

export default function HomeScreen(): JSX.Element {
  const { isDark, isAmoled } = useTheme();
  const { 
    items, 
    isLoading, 
    isRefreshing, 
    hasError, 
    errorMessage, 
    hasMore, 
    refresh, 
    loadMore, 
    retry 
  } = useFeed();
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  const handleLike = (id: number): void => {
    console.log('Like pressed for:', id);
    // TODO: Implement like functionality with Discourse API
  };

  const handleComment = (id: number): void => {
    console.log('Comment pressed for:', id);
    // Navigate to ByteBlogPage with comments visible
    router.push(`/feed/${id}?showComments=true` as any);
  };

  const handleBookmark = (id: number): void => {
    console.log('Bookmark pressed for:', id);
    // TODO: Implement bookmark functionality
  };

  const handleShare = (id: number): void => {
    console.log('Share pressed for:', id);
    // TODO: Implement share functionality
  };

  const handleMore = (id: number): void => {
    console.log('More pressed for:', id);
    // TODO: Show more options menu
  };

  const handleBytePress = (byteId: number): void => {
    console.log('Navigating to byte:', byteId);
    router.push(`/feed/${byteId}` as any);
  };

  const handleTeretPress = (teretName: string): void => {
    console.log('Teret pressed:', teretName);
    // TODO: Navigate to teret/category screen
  };

  const handleTagPress = (tag: string): void => {
    console.log('Tag pressed:', tag);
    // TODO: Navigate to tag search screen
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
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
  };

  const renderFeedItem = ({ item }: { item: FeedItem }): JSX.Element => (
    <ByteCard
      id={item.id.toString()}
      content={`${item.title}\n\n${item.excerpt}`}
      author={{
        username: item.author.username,
        name: item.author.name || 'Unknown User',
        avatar: item.author.avatar || '',
      }}
      category={{
        name: item.category.name,
        color: item.category.color,
        slug: item.category.name.toLowerCase().replace(/\s+/g, '-'),
      }}
      tags={item.tags}
      timestamp={formatTimestamp(item.createdAt)}
      likes={item.likeCount}
      comments={item.replyCount}
      isLiked={false} // TODO: Implement like state
      isBookmarked={false} // TODO: Implement bookmark state
      onLike={() => handleLike(item.id)}
      onComment={() => handleComment(item.id)}
      onBookmark={() => handleBookmark(item.id)}
      onShare={() => handleShare(item.id)}
      onMore={() => handleMore(item.id)}
      onPress={() => handleBytePress(item.id)}
      onCategoryPress={() => handleTeretPress(item.category.name)}
      onTagPress={(tag) => handleTagPress(tag)}
    />
  );

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            No more posts to load
          </Text>
        </View>
      );
    }
    
    if (isLoading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.text} />
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            Loading more posts...
          </Text>
        </View>
      );
    }
    
    return null;
  };

  const renderError = () => {
    if (!hasError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errorMessage || 'Failed to load posts'}
        </Text>
        <Text 
          style={[styles.retryText, { color: colors.text }]}
          onPress={retry}
        >
          Tap to retry
        </Text>
      </View>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar 
          title="Feed" 
          showBackButton={false}
          showProfileButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading posts from Discourse...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar 
        title="Feed" 
        showBackButton={false}
        showProfileButton={true}
      />
      
      <FlatList
        data={items}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.text}
            colors={[colors.text]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedList: {
    flex: 1,
  },
  feedContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  feedContainer: {
    paddingVertical: 8,
  },
}); 