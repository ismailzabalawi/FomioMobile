import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { ByteCard } from '../../components/feed/ByteCard';
import { useHeader } from '@/components/ui/header';
import { useFeed, FeedItem } from '../../shared/useFeed';
import { useAuth } from '../../shared/useAuth';
import { getSession, getLatest } from '../../lib/discourse';

export default function HomeScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { setHeader, resetHeader } = useHeader();
  const { 
    items, 
    isLoading: isFeedLoading, 
    isRefreshing, 
    hasError, 
    errorMessage, 
    hasMore, 
    refresh, 
    loadMore, 
    retry 
  } = useFeed();
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Configure header
  useEffect(() => {
    setHeader({
      title: "Fomio",
      canGoBack: false,
      withSafeTop: false,
      tone: "bg",
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);
  
  // Load user session if authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      getSession()
        .then((session) => {
          setCurrentUser(session.user || user);
        })
        .catch((err: any) => {
          // Only log if it's not an expected "not authenticated" error
          if (err?.message && !err.message.includes('Not authenticated') && !err.message.includes('Please sign in')) {
            console.warn('Failed to load session:', err.message);
          }
          // If not authenticated, that's expected - don't log as error
        });
    }
  }, [isAuthenticated, isAuthLoading, user]);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
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

  const renderFeedItem = ({ item }: { item: FeedItem }): React.ReactElement => (
    <ByteCard
      id={item.id}
      title={item.title}
      hub={item.hubName || item.category.name}
      teret={item.category.name !== item.hubName ? item.category.name : undefined}
      author={{
        name: item.author.name || 'Unknown User',
        avatar: item.author.avatar || '',
      }}
      replies={item.replyCount}
      activity={formatTimestamp(item.lastActivity || item.createdAt)}
      onPress={() => handleBytePress(item.id)}
      onCategoryPress={() => handleTeretPress(item.category.name)}
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
    
    if (isFeedLoading) {
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

  // Show auth prompt if not authenticated
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text, marginBottom: 16 }]}>
            Connect to Forum
          </Text>
          <Text style={[styles.loadingText, { color: colors.secondary, fontSize: 14 }]}>
            Sign in to see your feed
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary, marginTop: 20 }]}
            onPress={() => router.push('/(auth)/signin')}
          >
            <Text style={[styles.connectButtonText, { color: '#ffffff' }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFeedLoading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 